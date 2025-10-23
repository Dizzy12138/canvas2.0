const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;
const { v4: uuidv4 } = require("uuid");
const WorkflowService = require("../services/workflowService");
const { App, AIService } = require("../models"); // 引入 AIService 模型
const workflowRepository = require("../services/workflowRepository");
const axios = require("axios");
const { applyWorkflowParameters } = require("../utils/workflow"); // 引入现有工具函数

const router = express.Router();

// 配置 multer 存储，用于工作流文件上传
const workflowStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const workflowsDir = path.join(__dirname, "../../uploads/workflows");
    try {
      await fs.mkdir(workflowsDir, { recursive: true });
      cb(null, workflowsDir);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}_${file.originalname}`);
  },
});
const uploadWorkflow = multer({
  storage: workflowStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
});

// helper to mask (保留原有功能)
const maskService = (s) => ({
  id: s.id,
  name: s.name,
  baseUrl: s.baseUrl,
  tags: s.tags,
  authMethod: s.authMethod,
  apiKeyMasked: s.apiKey ? `${'*'.repeat(Math.max(4, s.apiKey.length - 4))}${s.apiKey.slice(-4)}` : '',
  isDefault: s.isDefault,
  enabled: s.enabled,
  timeoutMs: s.timeoutMs,
  healthStatus: s.healthStatus,
});

async function resolveEndpoint(preferId) {
  if (preferId) {
    const byId = await AIService.findById(preferId);
    if (byId && byId.enabled) {
      return { from: 'preferred', service: byId };
    }
  }
  const def = await AIService.findOne({ isDefault: true, enabled: true });
  if (def) return { from: 'default', service: def };
  throw new Error('未找到可用的服务（请设置默认或指定可用服务）');
}

// GET /api/comfy/resolve-endpoint?preferEndpointId=... (保留原有功能)
router.get('/resolve-endpoint', async (req, res, next) => {
  try {
    const { prefer_endpoint_id, preferEndpointId } = req.query;
    const preferId = preferEndpointId || prefer_endpoint_id;
    const { from, service } = await resolveEndpoint(preferId);
    const warnings = [];
    if (service.healthStatus !== 'healthy') warnings.push('服务未通过健康检查');
    res.json({ success: true, data: { from, endpoint: maskService(service), warnings } });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// POST /api/comfy/proxy/prompt { preferEndpointId?, payload } (保留原有功能，但可能被新的 /apps/:appId/run 替代部分功能)
router.post('/proxy/prompt', async (req, res, next) => {
  try {
    const { preferEndpointId, prefer_endpoint_id, payload } = req.body || {};
    if (!payload) return res.status(400).json({ success: false, message: '缺少payload' });
    const preferId = preferEndpointId || prefer_endpoint_id;
    const { service } = await resolveEndpoint(preferId);

    // build target url
    const targetUrl = new URL('/prompt', service.baseUrl).toString();

    const cfg = { timeout: service.timeoutMs || 60000, validateStatus: () => true, headers: {} };
    // Auth injection
    if (service.authMethod === 'header' && service.apiKey) {
      cfg.headers[service.apiKeyHeader || 'Authorization'] = service.apiKey;
    }
    let finalUrl = targetUrl;
    if (service.authMethod === 'query' && service.apiKey) {
      const u = new URL(finalUrl);
      u.searchParams.set(service.apiKeyQuery || 'api_key', service.apiKey);
      finalUrl = u.toString();
    }

    // 处理工作流参数 (保留原有逻辑)
    let promptPayload = payload;
    if (payload.workflowParams && payload.workflowData) {
      promptPayload = applyWorkflowParameters(payload, payload.workflowParams, payload.workflowData);
    }

    // Forward request
    try {
      const upstream = await axios.post(finalUrl, promptPayload, cfg);
      // Pass-through status and body
      res.status(upstream.status).json(upstream.data);
    } catch (e) {
      // In MVP, return a simulated job if upstream fails
      const jobId = uuidv4();
      const io = req.app.get('io');
      // Simulate progress
      let progress = 0;
      const timer = setInterval(() => {
        progress += 20;
        if (progress >= 100) {
          clearInterval(timer);
          io.emit('job:complete', { jobId, status: 'completed', result: { imageUrl: `/uploads/generated_${Date.now()}.png` } });
        } else {
          io.emit('job:progress', { jobId, progress });
        }
      }, 500);
      res.status(202).json({ success: true, jobId, status: 'queued', message: '已提交（模拟）' });
    }
  } catch (err) { next(err); }
});

// 获取所有工作流 (从 DB 获取)
router.get('/workflows', async (req, res, next) => {
  try {
    const workflows = await workflowRepository.findAll();
    res.json({ success: true, data: workflows });
  } catch (err) {
    next(err);
  }
});

// 上传并解析工作流
router.post('/workflows', uploadWorkflow.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: '缺少文件' });
    }

    const fileContent = await fs.readFile(req.file.path, 'utf8');
    let rawWorkflowData;
    try {
      rawWorkflowData = JSON.parse(fileContent);
    } catch (parseError) {
      await fs.unlink(req.file.path); // 删除临时文件
      return res.status(400).json({ success: false, message: '文件不是有效的JSON格式' });
    }

    // 使用 WorkflowService 解析工作流
    const parsedWorkflow = WorkflowService.parseWorkflow(rawWorkflowData);
    const cascaderData = WorkflowService.getWorkflowAsCascader(parsedWorkflow);

    // 检查是否已存在相同内容的 workflow (通过 checksum)
    const checksum = require('crypto').createHash('md5').update(fileContent).digest('hex');
    let existingWorkflow = await workflowRepository.findByChecksum(checksum);

    if (existingWorkflow) {
      // 如果存在，更新其信息或返回已存在的ID
      const updatedWorkflow = await workflowRepository.update(existingWorkflow._id, {
        name: req.file.originalname,
        rawWorkflow: rawWorkflowData,
        nodesTree: parsedWorkflow.nodes,
        cascaderData,
        parameters: parsedWorkflow.parameterLookup,
        nodesCount: parsedWorkflow.nodes.length,
        version: (existingWorkflow.version || 0) + 1,
      });
      await fs.unlink(req.file.path); // 删除临时文件
      const responseData = updatedWorkflow || { ...existingWorkflow, updatedAt: new Date() };
      return res.status(200).json({ success: true, message: '工作流已存在，已更新', data: responseData });
    }

    // 保存新的工作流文件到数据库
    const newWorkflowFile = await workflowRepository.create({
      checksum: checksum,
      workflowId: parsedWorkflow.workflow_id,
      name: req.file.originalname,
      rawWorkflow: rawWorkflowData,
      nodesTree: parsedWorkflow.nodes,
      cascaderData: cascaderData,
      parameters: parsedWorkflow.parameterLookup,
      nodesCount: parsedWorkflow.nodes.length,
    });

    await fs.unlink(req.file.path); // 删除临时文件

    res.status(201).json({ success: true, data: newWorkflowFile });
  } catch (err) {
    console.error('Error uploading workflow:', err);
    next(err);
  }
});

// 获取工作流详情 (从 DB 获取)
router.get('/workflows/:workflowId', async (req, res, next) => {
  try {
    const { workflowId } = req.params;
    const workflow = await workflowRepository.findByWorkflowId(workflowId);

    if (!workflow) {
      return res.status(404).json({ success: false, message: '工作流不存在' });
    }
    res.json({ success: true, data: workflow });
  } catch (err) {
    next(err);
  }
});

// 获取工作流的 Cascader 数据
router.get('/workflows/:workflowId/cascader', async (req, res, next) => {
  try {
    const { workflowId } = req.params;
    const workflow = await workflowRepository.findByWorkflowId(workflowId);

    if (!workflow) {
      return res.status(404).json({ success: false, message: '工作流不存在' });
    }
    res.json({ success: true, data: workflow.cascaderData });
  } catch (err) {
    next(err);
  }
});

// 运行应用 (新增)
router.post('/apps/:appId/run', async (req, res, next) => {
  try {
    const { appId } = req.params;
    const { uiInputs } = req.body; // 前端传递的 UI 组件输入值

    const app = await App.findById(appId); // 假设 App 模型有 _id
    if (!app) {
      return res.status(404).json({ success: false, message: '应用不存在' });
    }

    const workflowFile = await workflowRepository.findByWorkflowId(app.workflowId);
    if (!workflowFile) {
      return res.status(404).json({ success: false, message: '关联的工作流文件不存在' });
    }

    // 使用 WorkflowService 构建 ComfyUI 执行 payload
    const comfyUIPayload = WorkflowService.constructExecutionPayload(
      app.uiBindings,
      uiInputs,
      workflowFile
    );

    // 解析 ComfyUI 服务端点
    const { service } = await resolveEndpoint(app.preferredAIServiceId); // 假设 App 模型可以存储 preferredAIServiceId
    const targetUrl = new URL('/prompt', service.baseUrl).toString();

    const cfg = { timeout: service.timeoutMs || 60000, validateStatus: () => true, headers: {} };
    if (service.authMethod === 'header' && service.apiKey) {
      cfg.headers[service.apiKeyHeader || 'Authorization'] = service.apiKey;
    }
    let finalUrl = targetUrl;
    if (service.authMethod === 'query' && service.apiKey) {
      const u = new URL(finalUrl);
      u.searchParams.set(service.apiKeyQuery || 'api_key', service.apiKey);
      finalUrl = u.toString();
    }

    // Forward request
    const comfyUIResponse = await axios.post(finalUrl, comfyUIPayload, cfg);

    res.json({ success: true, data: comfyUIResponse.data });
  } catch (err) {
    console.error('Error running app:', err);
    next(err);
  }
});

// 其他 ComfyUI 相关的路由，例如更新、删除工作流等，需要根据新的数据模型进行调整。
// 目前暂时移除，后续根据实际需求再添加或修改。
// router.put('/workflows/:id', ...);
// router.delete('/workflows/:id', ...);

module.exports = router;

