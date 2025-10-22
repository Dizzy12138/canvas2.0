const express = require('express');
const multer = require('multer');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const App = require('../models/App');
const PageDSL = require('../models/PageDSL');
const ExecutionHistory = require('../models/ExecutionHistory');
const WorkflowFile = require('../models/WorkflowFile');
const { parseWorkflow, computeChecksum } = require('../utils/workflow');

const router = express.Router();

const TEMP_UPLOAD_DIR = path.join(__dirname, '../../uploads/temp');
const WORKFLOW_DIR = path.join(__dirname, '../../uploads/workflows');

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      await fs.mkdir(TEMP_UPLOAD_DIR, { recursive: true });
      cb(null, TEMP_UPLOAD_DIR);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}.json`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/json' || file.originalname.endsWith('.json')) {
      cb(null, true);
    } else {
      cb(new Error('Only JSON workflow files are allowed'));
    }
  }
});

function sendError(res, statusCode, code, message, detail) {
  return res.status(statusCode).json({
    error: { code, message, detail }
  });
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

const concurrencyState = new Map();
const rateState = new Map();
const RATE_WINDOW_MS = 60 * 1000;

function getState(map, key, fallback) {
  if (!map.has(key)) {
    map.set(key, fallback instanceof Function ? fallback() : fallback);
  }
  return map.get(key);
}

function checkRateLimit(app) {
  if (!app.rateLimit || app.rateLimit <= 0) {
    return true;
  }
  const now = Date.now();
  const timestamps = getState(rateState, app.id, []);
  const filtered = timestamps.filter(ts => now - ts < RATE_WINDOW_MS);
  if (filtered.length >= app.rateLimit) {
    rateState.set(app.id, filtered);
    return false;
  }
  filtered.push(now);
  rateState.set(app.id, filtered);
  return true;
}

function acquireConcurrency(appId, limit) {
  if (!limit || limit <= 0) {
    return true;
  }
  const current = getState(concurrencyState, appId, 0);
  if (current >= limit) {
    return false;
  }
  concurrencyState.set(appId, current + 1);
  return true;
}

function releaseConcurrency(appId) {
  const current = getState(concurrencyState, appId, 0);
  const next = Math.max(0, current - 1);
  concurrencyState.set(appId, next);
}

router.post('/workflows/import', upload.single('file'), async (req, res, next) => {
  if (!req.file) {
    return sendError(res, 400, '400_INVALID_FILE_TYPE', '未检测到上传文件');
  }

  let fileContent;
  try {
    fileContent = await fs.readFile(req.file.path, 'utf8');
  } catch (err) {
    await fs.unlink(req.file.path).catch(() => {});
    return next(err);
  }

  let workflowData;
  try {
    workflowData = JSON.parse(fileContent);
  } catch (err) {
    await fs.unlink(req.file.path).catch(() => {});
    return sendError(res, 422, '422_PARSE_FAILED', '工作流文件不是有效的 JSON', err.message);
  }

  if (!workflowData || !Array.isArray(workflowData.nodes)) {
    await fs.unlink(req.file.path).catch(() => {});
    return sendError(res, 422, '422_NOT_API_FORMAT', '工作流文件不是有效的 ComfyUI API 格式');
  }

  try {
    await ensureDir(WORKFLOW_DIR);

    const checksum = computeChecksum(fileContent);
    const cached = await WorkflowFile.findOne({ checksum });
    if (cached) {
      await fs.unlink(req.file.path).catch(() => {});
      return res.json({
        workflowId: cached.workflowId,
        version: cached.version,
        name: cached.name,
        nodesCount: cached.nodesCount,
        mappableInputs: cached.mappableInputs,
        mappableOutputs: cached.mappableOutputs,
        parameters: cached.parameters,
        outputNodes: cached.outputNodes,
        cached: true
      });
    }

    const { mappableInputs, mappableOutputs, parameters, outputNodes } = parseWorkflow(workflowData);
    const workflowId = `wf_${uuidv4()}`;
    const version = 1;

    const finalFileName = `${workflowId}_v${version}.json`;
    const finalPath = path.join(WORKFLOW_DIR, finalFileName);
    await fs.rename(req.file.path, finalPath);

    await WorkflowFile.create({
      checksum,
      workflowId,
      version,
      name: workflowData.name || '未命名工作流',
      nodesCount: workflowData.nodes.length,
      mappableInputs,
      mappableOutputs,
      parameters,
      outputNodes,
      rawWorkflow: workflowData,
      createdBy: req.user?.id,
      updatedBy: req.user?.id
    });

    res.json({
      workflowId,
      version,
      name: workflowData.name || '未命名工作流',
      nodesCount: workflowData.nodes.length,
      mappableInputs,
      mappableOutputs,
      parameters,
      outputNodes,
      cached: false
    });
  } catch (err) {
    await fs.unlink(req.file.path).catch(() => {});
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const {
      name,
      workflowId,
      workflowVersion,
      timeoutSec,
      modelType,
      maxRuntime,
      enableCache,
      errorHandling,
      resourcePriority,
      concurrencyLimit,
      rateLimit,
      outputs,
      preferredServers,
      excludedServers,
      computeCost,
      nodeParameters
    } = req.body;

    if (!name || !workflowId || !workflowVersion) {
      return sendError(res, 400, '400_INVALID_REQUEST', '缺少必需的应用创建参数');
    }

    const duplicate = await App.findOne({ name });
    if (duplicate) {
      return sendError(res, 409, '409_APP_NAME_DUPLICATE', '应用名称已存在');
    }

    const app = await App.create({
      name,
      workflowId,
      workflowVersion,
      timeoutSec,
      modelType,
      maxRuntime,
      enableCache,
      errorHandling,
      resourcePriority,
      concurrencyLimit,
      rateLimit,
      outputs,
      preferredServers,
      excludedServers,
      computeCost,
      nodeParameters,
      createdBy: req.user?.id,
      updatedBy: req.user?.id
    });

    res.status(201).json(app);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const updates = { ...req.body, updatedBy: req.user?.id };
    const app = await App.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true
    });

    if (!app) {
      return sendError(res, 404, '404_APP_NOT_FOUND', '应用不存在');
    }

    res.json(app);
  } catch (err) {
    next(err);
  }
});

router.get('/check-name', async (req, res, next) => {
  try {
    const { name, excludeId } = req.query;
    if (!name) {
      return sendError(res, 400, '400_INVALID_REQUEST', '应用名称不能为空');
    }

    const query = excludeId ? { name, _id: { $ne: excludeId } } : { name };
    const existing = await App.findOne(query);
    res.json({ exists: !!existing });
  } catch (err) {
    next(err);
  }
});

router.get('/:appId', async (req, res, next) => {
  try {
    const app = await App.findById(req.params.appId);
    if (!app) {
      return sendError(res, 404, '404_APP_NOT_FOUND', '应用不存在');
    }
    res.json(app);
  } catch (err) {
    next(err);
  }
});

router.post('/:appId/page', async (req, res, next) => {
  try {
    const appId = req.params.appId;
    const { components, layout } = req.body;

    const app = await App.findById(appId);
    if (!app) {
      return sendError(res, 404, '404_APP_NOT_FOUND', '应用不存在');
    }

    const latestPage = await PageDSL.findOne({ appId }).sort({ version: -1 });
    const version = latestPage ? latestPage.version + 1 : 1;

    const pageDSL = new PageDSL({
      appId,
      appName: app.name,
      version,
      components,
      layout
    });

    await pageDSL.save();

    res.json(pageDSL);
  } catch (err) {
    next(err);
  }
});

router.get('/:appId/page', async (req, res, next) => {
  try {
    const appId = req.params.appId;
    const version = req.query.version ? parseInt(req.query.version, 10) : null;

    let pageDSL;
    if (version) {
      pageDSL = await PageDSL.findOne({ appId, version });
    } else {
      pageDSL = await PageDSL.findOne({ appId }).sort({ version: -1 });
    }

    if (!pageDSL) {
      return sendError(res, 404, '404_PAGE_NOT_FOUND', '页面配置不存在');
    }

    res.json(pageDSL);
  } catch (err) {
    next(err);
  }
});

async function validateRequiredParams(appId, params) {
  const pageDSL = await PageDSL.findOne({ appId }).sort({ version: -1 });
  if (!pageDSL) {
    return;
  }
  for (const component of pageDSL.components || []) {
    if (component.required && (params?.[component.paramKey] === undefined || params?.[component.paramKey] === null || params?.[component.paramKey] === '')) {
      const error = new Error(`${component.paramKey} is required`);
      error.statusCode = 422;
      error.code = '422_MISSING_REQUIRED_PARAM';
      error.detail = { param: component.paramKey };
      throw error;
    }
  }
}

router.post('/:appId/run', async (req, res, next) => {
  const appId = req.params.appId;
  let slotAcquired = false;
  try {
    const { params, options, workflowDefinition } = req.body || {};
    const app = await App.findById(appId);
    if (!app) {
      return sendError(res, 404, '404_APP_NOT_FOUND', '应用不存在');
    }

    await validateRequiredParams(appId, params);

    if (!checkRateLimit(app)) {
      return sendError(res, 429, '429_RATE_LIMITED', '请求过于频繁，请稍后重试');
    }

    if (!acquireConcurrency(app.id, app.concurrencyLimit)) {
      return sendError(res, 429, '429_CONCURRENCY_LIMIT', '当前任务过多，请稍后再试');
    }
    slotAcquired = true;

    const requestId = `run_${Date.now()}_${uuidv4()}`;
    const executionHistory = new ExecutionHistory({
      appId,
      requestId,
      status: 'processing',
      inputs: params,
      createdBy: req.user?.id
    });
    await executionHistory.save();

    // TODO: Integrate with ComfyUI execution pipeline
    executionHistory.status = 'failed';
    executionHistory.error = { code: '502_COMFYUI_DOWN', message: 'ComfyUI 服务不可用' };
    await executionHistory.save();

    releaseConcurrency(app.id);
    slotAcquired = false;

    return sendError(res, 502, '502_COMFYUI_DOWN', 'ComfyUI 服务不可用，无法执行工作流');
  } catch (err) {
    if (slotAcquired) {
      releaseConcurrency(req.params.appId);
    }
    if (err.code && err.statusCode) {
      return sendError(res, err.statusCode, err.code, err.message, err.detail);
    }
    next(err);
  }
});

router.get('/:appId/history', async (req, res, next) => {
  try {
    const appId = req.params.appId;
    const history = await ExecutionHistory.find({ appId }).sort({ createdAt: -1 }).limit(50);
    res.json(history);
  } catch (err) {
    next(err);
  }
});

router.get('/:appId/run-stream', async (req, res, next) => {
  const appId = req.params.appId;
  let slotAcquired = false;
  try {
    let params = {};
    if (req.query.params) {
      try {
        params = JSON.parse(req.query.params);
      } catch (parseErr) {
        return sendError(res, 400, '400_INVALID_REQUEST', '参数格式错误', parseErr.message);
      }
    }
    const app = await App.findById(appId);
    if (!app) {
      return sendError(res, 404, '404_APP_NOT_FOUND', '应用不存在');
    }

    await validateRequiredParams(appId, params);

    if (!checkRateLimit(app)) {
      return sendError(res, 429, '429_RATE_LIMITED', '请求过于频繁，请稍后重试');
    }

    if (!acquireConcurrency(app.id, app.concurrencyLimit)) {
      return sendError(res, 429, '429_CONCURRENCY_LIMIT', '当前任务过多，请稍后再试');
    }
    slotAcquired = true;

    res.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    });

    const requestId = `run_${Date.now()}_${uuidv4()}`;
    const executionHistory = new ExecutionHistory({
      appId,
      requestId,
      status: 'processing',
      inputs: params,
      createdBy: req.user?.id
    });
    await executionHistory.save();

    const steps = [
      '正在验证输入参数...',
      '正在准备模型资源...',
      '正在加载工作流配置...',
      '正在初始化推理环境...'
    ];

    for (const step of steps) {
      res.write(`event: log\n`);
      res.write(`data: ${JSON.stringify({ message: step })}\n\n`);
    }

    res.write(`event: error\n`);
    res.write(`data: ${JSON.stringify({ code: '502_COMFYUI_DOWN', message: 'ComfyUI 服务不可用，无法执行工作流' })}\n\n`);
    res.end();

    executionHistory.status = 'failed';
    executionHistory.error = { code: '502_COMFYUI_DOWN', message: 'ComfyUI 服务不可用' };
    await executionHistory.save();

    releaseConcurrency(app.id);
    slotAcquired = false;
  } catch (err) {
    if (slotAcquired) {
      releaseConcurrency(req.params.appId);
    }
    try {
      res.write(`event: error\n`);
      res.write(`data: ${JSON.stringify({ code: err.code || '500_INTERNAL_ERROR', message: err.message })}\n\n`);
    } catch (writeErr) {
      next(writeErr);
      return;
    }
    res.end();
  }
});

module.exports = router;
