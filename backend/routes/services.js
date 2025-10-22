const express = require('express');
const Joi = require('joi');
const axios = require('axios');
// 尝试引入AIService模型，如果MongoDB不可用则使用全局模拟
let AIService;
try {
  AIService = require('../models/AIService');
} catch (e) {
  console.log('使用内存数据库模拟');
  AIService = global.AIService;
}

const router = express.Router();

const serviceSchema = Joi.object({
  name: Joi.string().trim().min(1).required(),
  baseUrl: Joi.string().uri({ scheme: [/https?/] }).required(),
  tags: Joi.array().items(Joi.string()).default([]),

  authMethod: Joi.string().valid('none', 'header', 'query').default('none'),
  apiKey: Joi.string().allow('').optional(), // leave empty to keep existing
  apiKeyHeader: Joi.string().trim().default('Authorization'),
  apiKeyQuery: Joi.string().trim().default('api_key'),

  isDefault: Joi.boolean().default(false),
  enabled: Joi.boolean().default(true),

  timeoutMs: Joi.number().integer().min(1000).max(300000).default(60000),
  healthPath: Joi.string().trim().default('/prompt'),
  rps: Joi.number().integer().min(0).default(0),
});

const maskService = (s) => ({
  id: s.id,
  name: s.name,
  baseUrl: s.baseUrl,
  tags: s.tags,
  authMethod: s.authMethod,
  apiKeyMasked: s.apiKey ? `${'*'.repeat(Math.max(4, s.apiKey.length - 4))}${s.apiKey.slice(-4)}` : '',
  apiKeyHeader: s.apiKeyHeader,
  apiKeyQuery: s.apiKeyQuery,
  isDefault: s.isDefault,
  enabled: s.enabled,
  timeoutMs: s.timeoutMs,
  healthPath: s.healthPath,
  rps: s.rps,
  healthStatus: s.healthStatus,
  lastHealthCheckAt: s.lastHealthCheckAt,
  lastHealthError: s.lastHealthError,
  createdAt: s.createdAt,
  updatedAt: s.updatedAt,
});

// List services with basic filters
router.get('/', async (req, res, next) => {
  try {
    const { q, enabled, healthy } = req.query;
    const cond = {};
    if (q) cond.name = { $regex: q, $options: 'i' };
    if (enabled !== undefined) cond.enabled = enabled === 'true';
    if (healthy !== undefined) cond.healthStatus = healthy === 'true' ? 'healthy' : { $ne: 'healthy' };
    const list = await AIService.find(cond);
    res.json({ success: true, data: list.map(maskService) });
  } catch (err) { next(err); }
});

// Create service
router.post('/', async (req, res, next) => {
  try {
    const { value, error } = serviceSchema.validate(req.body, { abortEarly: false });
    if (error) return res.status(400).json({ success: false, message: error.message });

    // name unique
    const exists = await AIService.findOne({ name: value.name });
    if (exists) return res.status(409).json({ success: false, message: '名称已存在' });

    if (value.isDefault) {
      await AIService.updateMany({ isDefault: true }, { $set: { isDefault: false } });
    }

    // 添加创建人信息
    if (req.user) {
      value.createdBy = req.user.id;
      value.updatedBy = req.user.id;
    }
    
    const doc = await AIService.create(value);
    res.json({ success: true, data: maskService(doc) });
  } catch (err) { next(err); }
});

// Update service
router.put('/:id', async (req, res, next) => {
  try {
    const { value, error } = serviceSchema.validate(req.body, { abortEarly: false });
    if (error) return res.status(400).json({ success: false, message: error.message });

    const existing = await AIService.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: '服务不存在' });

    // if name changed and duplicate
    if (value.name !== existing.name) {
      const dup = await AIService.findOne({ name: value.name });
      if (dup) return res.status(409).json({ success: false, message: '名称已存在' });
    }

    if (value.isDefault) {
      await AIService.updateMany({ isDefault: true }, { $set: { isDefault: false } });
    }

    // apiKey: empty string means keep existing; a special token '__clear__' clears it
    if (value.apiKey === '') {
      delete value.apiKey;
    } else if (value.apiKey === '__clear__') {
      value.apiKey = '';
    }

    // 添加修改人信息
    if (req.user) {
      value.updatedBy = req.user.id;
    }
    
    Object.assign(existing, value, { updatedAt: new Date() });
    // 如果使用内存数据库，需要更新数组中的对象
    if (global.AIService) {
      const index = global.AIService.findIndex(s => s.id == existing.id);
      if (index !== -1) {
        global.AIService[index] = existing;
      }
    }
    res.json({ success: true, data: maskService(existing) });
  } catch (err) { next(err); }
});

// Delete service
router.delete('/:id', async (req, res, next) => {
  try {
    const s = await AIService.findById(req.params.id);
    if (!s) return res.status(404).json({ success: false, message: '服务不存在' });
    if (s.isDefault) return res.status(400).json({ success: false, message: '请先切换默认服务后再删除' });
    
    // 检测服务是否被任务或用户绑定
    // 这里应该检查服务是否被应用或其他任务引用
    // 暂时返回模拟检测结果
    const isBound = false; // 实际实现中应该查询数据库
    
    if (isBound) {
      return res.status(400).json({ success: false, message: '该服务已被任务或用户绑定，无法删除' });
    }
    
    await AIService.deleteOne({ id: s.id });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// Set default (global unique)
router.post('/:id/set-default', async (req, res, next) => {
  try {
    const s = await AIService.findById(req.params.id);
    if (!s) return res.status(404).json({ success: false, message: '服务不存在' });
    await AIService.updateMany({ isDefault: true }, { $set: { isDefault: false } });
    s.isDefault = true;
    s.updatedAt = new Date();
    await s.save(); // 需要保存更改
    res.json({ success: true, data: maskService(s) });
  } catch (err) { next(err); }
});

// Health check now
router.post('/:id/health-check', async (req, res, next) => {
  try {
    const s = await AIService.findById(req.params.id);
    if (!s) return res.status(404).json({ success: false, message: '服务不存在' });

    const url = new URL(s.healthPath || '/prompt', s.baseUrl).toString();
    const cfg = { timeout: s.timeoutMs || 60000, validateStatus: () => true };
    if (s.authMethod === 'header' && s.apiKey) {
      cfg.headers = { [s.apiKeyHeader || 'Authorization']: s.apiKey };
    }

    let finalUrl = url;
    if (s.authMethod === 'query' && s.apiKey) {
      const u = new URL(finalUrl);
      u.searchParams.set(s.apiKeyQuery || 'api_key', s.apiKey);
      finalUrl = u.toString();
    }

    let status = 'unhealthy';
    let reason = '';
    let code = 0;
    try {
      const resp = await axios.get(finalUrl, cfg);
      code = resp.status;
      if (resp.status >= 200 && resp.status < 400) {
        status = 'healthy';
      } else {
        reason = `HTTP ${resp.status}`;
      }
    } catch (e) {
      reason = e.code || e.message || '连接失败';
    }

    s.healthStatus = status;
    s.lastHealthCheckAt = new Date();
    s.lastHealthError = reason;
    s.updatedAt = new Date();
    await s.save(); // 需要保存更改
    
    res.json({ success: true, data: { ...maskService(s), httpStatus: code, reason } });
  } catch (err) { next(err); }
});

module.exports = router;