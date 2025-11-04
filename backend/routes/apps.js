const express = require('express');
const { dbManager } = require('../config/database');
const { WorkflowFile } = require('../models');
const ExecutionHistory = require('../models/ExecutionHistory');
const { sendError } = require('../utils/errorHandler');

// 获取App模型
const App = dbManager.getModel('App');

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
    const { 
      name, 
      workflowId, 
      workflowVersion, 
      paramsSchema, 
      uiBindings, 
      components, 
      outputNodes, 
      timeout 
    } = req.body;

    if (!name || !workflowId) {
      return sendError(res, 400, '400_INVALID_REQUEST', '应用名称和工作流ID为必填项');
    }

    const newApp = await App.create({
      name,
      workflowId,
      workflowVersion: workflowVersion || 1,
      timeout: timeout || 300,
      outputNodes: outputNodes || [],
      paramsSchema,
      uiBindings,
      components,
      createdBy: req.user?.id || 'anonymous',
      updatedBy: req.user?.id || 'anonymous',
    });
    res.status(201).json({ success: true, data: newApp });
  } catch (err) {
    if (err.code === 11000) {
      return sendError(res, 409, '409_DUPLICATE_NAME', '应用名称已存在');
    }
    next(err);
  }
});

// 获取所有应用（支持筛选/排序/分页/搜索）
router.get('/', async (req, res, next) => {
  try {
    const {
      type = 'All', // Public | Private | All
      category, // 单类别或逗号分隔
      visible, // 'true' | 'false'
      q, // 搜索关键字（name/title/functionDescription）
      sort = 'updatedAt_desc', // name_asc | sortOrder_asc | createdAt_desc | updatedAt_desc
      page = '1',
      pageSize = '20',
    } = req.query;

    const owner = req.user?.id || 'anonymous';
    const rawResult = await App.find({ createdBy: owner });

    // 统一拿到数组
    let list;
    if (Array.isArray(rawResult)) {
      list = rawResult;
    } else if (rawResult && typeof rawResult.sort === 'function') {
      // 先按更新时间降序拿一版数组
      list = await rawResult.sort({ updatedAt: -1 });
    } else {
      list = [];
    }

    // 过滤：类型
    if (type === 'Public') {
      list = list.filter(x => x.applicationType === 'Public');
    } else if (type === 'Private') {
      list = list.filter(x => x.applicationType === 'Private');
    }

    // 过滤：可见性
    if (typeof visible !== 'undefined') {
      const vis = visible === 'true';
      list = list.filter(x => !!x.visible === vis);
    }

    // 过滤：类别
    if (category) {
      const cats = category.split(',').map(s => s.trim()).filter(Boolean);
      if (cats.length > 0) {
        list = list.filter(x => Array.isArray(x.categories) && x.categories.some(c => cats.includes(c)));
      }
    }

    // 搜索：name/title/functionDescription
    if (q && q.trim()) {
      const kw = q.trim().toLowerCase();
      list = list.filter(x => (
        (x.name || '').toLowerCase().includes(kw) ||
        (x.title || '').toLowerCase().includes(kw) ||
        (x.functionDescription || '').toLowerCase().includes(kw)
      ));
    }

    // 排序
    const sorters = {
      'name_asc': (a, b) => (a.name || '').localeCompare(b.name || ''),
      'sortOrder_asc': (a, b) => (a.sortOrder || 999) - (b.sortOrder || 999),
      'createdAt_desc': (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
      'updatedAt_desc': (a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0),
    };
    const sorter = sorters[sort] || sorters['updatedAt_desc'];
    list = [...list].sort(sorter);

    // 分页
    const p = Math.max(parseInt(page, 10) || 1, 1);
    const ps = Math.min(Math.max(parseInt(pageSize, 10) || 20, 1), 100);
    const total = list.length;
    const start = (p - 1) * ps;
    const end = start + ps;
    const data = list.slice(start, end);

    res.json({ success: true, data, meta: { total, page: p, pageSize: ps } });
  } catch (err) {
    next(err);
  }
});

// 获取单个应用详情
router.get('/:appId', async (req, res, next) => {
  try {
    const { appId } = req.params;
    const app = await App.findOne({ _id: appId, createdBy: req.user?.id || 'anonymous' });

    if (!app) {
      return sendError(res, 404, '404_APP_NOT_FOUND', '应用不存在');
    }
    res.json({ success: true, data: app });
  } catch (err) {
    next(err);
  }
});

  // 更新应用（兼容 Mongoose 与 内存DB），确保 components/uiBindings/paramsSchema 正确落库
  router.patch('/:appId', async (req, res, next) => {
  try {
    const { appId } = req.params;
    const { 
      name, 
      paramsSchema, 
      uiBindings, 
      components, 
      outputNodes, 
      timeout,
      pageSchema 
    } = req.body;

    const app = await App.findOne({ _id: appId, createdBy: req.user?.id || 'anonymous' });
    if (!app) {
      return sendError(res, 404, '404_APP_NOT_FOUND', '应用不存在');
    }

    const updateData = {};
    if (typeof name !== 'undefined') updateData.name = name;
    if (typeof paramsSchema !== 'undefined') updateData.paramsSchema = paramsSchema;
    if (typeof uiBindings !== 'undefined') {
      // 规范化与基础校验（MVP）：确保字段存在并类型基本正确
      const normalized = Array.isArray(uiBindings) ? uiBindings.map((b, idx) => {
        const n = {
          field_key: b.field_key || b.componentId || `field_${idx}`,
          node_id: b.node_id ?? b.nodeId,
          input_key: b.input_key ?? b.inputKey ?? b.bindTo?.split('.')?.slice(1).join('.') ?? b.bindTo,
          type: b.type || b.paramType,
          required: typeof b.required === 'boolean' ? b.required : false,
          default: b.default,
          rules: b.rules && typeof b.rules === 'object' ? b.rules : undefined,
          componentId: b.componentId,
          bindTo: b.bindTo
        };
        return n;
      }) : [];
      updateData.uiBindings = normalized;
    }
    if (typeof components !== 'undefined') updateData.components = components;
    if (typeof outputNodes !== 'undefined') updateData.outputNodes = outputNodes;
    if (typeof timeout !== 'undefined') updateData.timeout = timeout;
    if (typeof pageSchema !== 'undefined') updateData.pageSchema = pageSchema;
    updateData.updatedBy = req.user?.id || 'anonymous';
    // 简单的版本策略：若关键字段发生变化，则版本号 +1
    const hasStructureChange = (
      typeof paramsSchema !== 'undefined' ||
      typeof uiBindings !== 'undefined' ||
      typeof components !== 'undefined' ||
      typeof outputNodes !== 'undefined' ||
      typeof pageSchema !== 'undefined'
    );
    if (hasStructureChange) {
      updateData.workflowVersion = (app.workflowVersion || 1) + 1;
    }

    // 统一使用“读-改-存”避免内存DB的 findOneAndUpdate 丢失数组/Mixed 的问题
    let target = await App.findOne({ _id: appId });
    if (!target) {
      return sendError(res, 404, '404_APP_NOT_FOUND', '应用不存在');
    }

    // 合并更新
    Object.keys(updateData).forEach((k) => {
      target[k] = updateData[k];
    });

    console.log('Backend: Updated target components:', target.components?.length);
    console.log('Backend: Updated target uiBindings:', target.uiBindings?.length);

    // 保存（兼容：Mongoose 有 save，内存DB无save时直接写回）
    if (typeof target.save === 'function') {
      await target.save();
    } else {
    // 内存DB: 替换全量对象
    if (Array.isArray(App)) {
      const idx = App.findIndex((x) => x._id === appId);
      if (idx >= 0) {
        // 确保更新后的对象包含所有字段
        const updatedApp = {
          ...App[idx],
          ...updateData,
          updatedAt: new Date()
        };
        App[idx] = updatedApp;
        console.log('Backend: Memory DB update, idx:', idx, 'components length:', App[idx]?.components?.length);
        console.log('Backend: Updated app components:', updatedApp.components?.length);
      } else {
        console.error('Backend: Memory DB update failed, app not found, idx:', idx);
      }
    } else {
      console.error('Backend: App is not an array:', typeof App);
    }
    }

    // 返回最新数据
    const fresh = await App.findOne({ _id: appId });
    console.log('Backend: Fresh app components:', fresh?.components?.length);
    console.log('Backend: Fresh app uiBindings:', fresh?.uiBindings?.length);
    res.json({ success: true, data: fresh });
  } catch (err) {
    if (err.code === 11000) {
      return sendError(res, 409, '409_DUPLICATE_NAME', '应用名称已存在');
    }
    next(err);
  }
});

// 复制应用
router.post('/:appId/clone', async (req, res, next) => {
  try {
    const { appId } = req.params;
    const app = await App.findOne({ _id: appId, createdBy: req.user?.id || 'anonymous' });
    if (!app) {
      return sendError(res, 404, '404_APP_NOT_FOUND', '应用不存在');
    }

    const nameBase = app.name || `app_${Date.now()}`;
    const cloneName = `${nameBase}_copy_${Date.now().toString().slice(-5)}`;

    const cloned = await App.create({
      name: cloneName,
      workflowId: app.workflowId,
      workflowVersion: 1,
      timeout: app.timeout,
      outputNodes: app.outputNodes || [],
      paramsSchema: app.paramsSchema || [],
      uiBindings: app.uiBindings || [],
      components: app.components || [],
      createdBy: req.user?.id || 'anonymous',
      updatedBy: req.user?.id || 'anonymous',
    });

    res.status(201).json({ success: true, data: cloned });
  } catch (err) {
    next(err);
  }
});

// 删除应用
router.delete('/:appId', async (req, res, next) => {
  try {
    const { appId } = req.params;
    const app = await App.findOneAndDelete({ _id: appId, createdBy: req.user?.id || 'anonymous' });

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
    const app = await App.findOne({ _id: appId, createdBy: req.user?.id || 'anonymous' });
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
    const history = await ExecutionHistory.find({ appId, createdBy: req.user?.id || 'anonymous' }).sort({ createdAt: -1 }).limit(50);
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
