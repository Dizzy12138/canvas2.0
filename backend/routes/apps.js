const express = require('express');
const App = require('../models/App');
const ExecutionHistory = require('../models/ExecutionHistory');
const { sendError } = require('../utils/errorHandler');

const router = express.Router();

// 检查应用名称是否存在
router.get('/check-name', async (req, res, next) => {
  try {
    const { name, excludeId } = req.query;
    if (!name) {
      return sendError(res, 400, '400_INVALID_REQUEST', '缺少应用名称');
    }
    const query = { name };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    const existingApp = await App.findOne(query);
    res.json({ success: true, exists: !!existingApp });
  } catch (err) {
    next(err);
  }
});

// 创建应用
router.post('/', async (req, res, next) => {
  try {
    const { name, workflowId, paramsSchema, uiBindings, components } = req.body;

    if (!name || !workflowId) {
      return sendError(res, 400, '400_INVALID_REQUEST', '应用名称和工作流ID为必填项');
    }

    const newApp = new App({
      name,
      workflowId,
      paramsSchema,
      uiBindings,
      components, // Store components directly in App model
      createdBy: req.user.id,
      updatedBy: req.user.id,
    });
    await newApp.save();
    res.status(201).json({ success: true, data: newApp });
  } catch (err) {
    if (err.code === 11000) {
      return sendError(res, 409, '409_DUPLICATE_NAME', '应用名称已存在');
    }
    next(err);
  }
});

// 获取所有应用
router.get('/', async (req, res, next) => {
  try {
    const apps = await App.find({ createdBy: req.user.id }).sort({ createdAt: -1 });
    res.json({ success: true, data: apps });
  } catch (err) {
    next(err);
  }
});

// 获取单个应用详情
router.get('/:appId', async (req, res, next) => {
  try {
    const { appId } = req.params;
    const app = await App.findOne({ _id: appId, createdBy: req.user.id });

    if (!app) {
      return sendError(res, 404, '404_APP_NOT_FOUND', '应用不存在');
    }
    res.json({ success: true, data: app });
  } catch (err) {
    next(err);
  }
});

// 更新应用
router.patch('/:appId', async (req, res, next) => {
  try {
    const { appId } = req.params;
    const { name, paramsSchema, uiBindings, components } = req.body;

    const app = await App.findOne({ _id: appId, createdBy: req.user.id });
    if (!app) {
      return sendError(res, 404, '404_APP_NOT_FOUND', '应用不存在');
    }

    if (name) app.name = name;
    if (paramsSchema) app.paramsSchema = paramsSchema;
    if (uiBindings) app.uiBindings = uiBindings;
    if (components) app.components = components; // Update components
    app.updatedBy = req.user.id;

    await app.save();
    res.json({ success: true, data: app });
  } catch (err) {
    if (err.code === 11000) {
      return sendError(res, 409, '409_DUPLICATE_NAME', '应用名称已存在');
    }
    next(err);
  }
});

// 删除应用
router.delete('/:appId', async (req, res, next) => {
  try {
    const { appId } = req.params;
    const app = await App.findOneAndDelete({ _id: appId, createdBy: req.user.id });

    if (!app) {
      return sendError(res, 404, '404_APP_NOT_FOUND', '应用不存在');
    }
    res.json({ success: true, message: '应用已删除' });
  } catch (err) {
    next(err);
  }
});

// 获取应用页面 DSL (从 App 模型中获取 components 和 uiBindings)
router.get('/:appId/page', async (req, res, next) => {
  try {
    const { appId } = req.params;
    const app = await App.findOne({ _id: appId, createdBy: req.user.id });
    if (!app) {
      return sendError(res, 404, '404_APP_NOT_FOUND', '应用不存在');
    }
    // 返回前端构建页面所需的数据
    res.json({ success: true, data: { components: app.components || [], uiBindings: app.uiBindings || [] } });
  } catch (err) {
    next(err);
  }
});

// 运行应用 (此路由已移至 comfy.js，这里仅作兼容性保留或移除)
// 实际的运行逻辑在 comfy.js 的 /api/comfy/apps/:appId/run 中实现
router.post('/:appId/run', async (req, res, next) => {
  return sendError(res, 501, '501_NOT_IMPLEMENTED', '请使用 /api/comfy/apps/:appId/run 接口运行应用');
});

// 获取执行历史 (保留原有功能)
router.get('/:appId/history', async (req, res, next) => {
  try {
    const appId = req.params.appId;
    const history = await ExecutionHistory.find({ appId, createdBy: req.user.id }).sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, data: history });
  } catch (err) {
    next(err);
  }
});

// 运行应用流 (保留原有功能，但可能需要调整以使用新的 ComfyUI 执行逻辑)
router.get('/:appId/run-stream', async (req, res, next) => {
  return sendError(res, 501, '501_NOT_IMPLEMENTED', '流式运行接口暂未适配新架构');
});

module.exports = router;
