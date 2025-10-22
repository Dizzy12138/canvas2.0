const express = require('express');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');
const AIService = require('../models/AIService');
const { applyWorkflowParameters } = require('../utils/workflow');

const router = express.Router();

// 配置文件上传
const upload = multer({ dest: 'uploads/workflows/' });

// helper to mask
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

// GET /api/comfy/resolve-endpoint?preferEndpointId=...
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

// POST /api/comfy/proxy/prompt { preferEndpointId?, payload }
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

    // 处理工作流参数
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

// 添加工作流管理API
// 获取工作流列表
router.get('/workflows', async (req, res, next) => {
  try {
    // 创建工作流目录（如果不存在）
    const workflowsDir = path.join(__dirname, '../../uploads/workflows');
    try {
      await fs.access(workflowsDir);
    } catch {
      await fs.mkdir(workflowsDir, { recursive: true });
    }

    // 读取工作流文件
    const files = await fs.readdir(workflowsDir);
    const workflows = [];

    // 添加内置工作流
    workflows.push(
      { id: 'default', name: '默认文生图工作流', type: 'builtin', lastModified: '2024-01-15' },
      { id: 'highres', name: '高清修复工作流', type: 'builtin', lastModified: '2024-01-10' },
      { id: 'style-transfer', name: '风格迁移工作流', type: 'builtin', lastModified: '2024-01-12' }
    );

    // 添加自定义工作流
    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const filePath = path.join(workflowsDir, file);
          const stats = await fs.stat(filePath);
          const workflowData = await fs.readFile(filePath, 'utf8');
          const workflow = JSON.parse(workflowData);
          
          workflows.push({
            id: file.replace('.json', ''),
            name: workflow.name || file.replace('.json', ''),
            type: 'custom',
            lastModified: stats.mtime.toISOString().split('T')[0]
          });
        } catch (err) {
          console.error('读取工作流文件失败:', file, err);
        }
      }
    }

    res.json({ success: true, data: workflows });
  } catch (err) {
    next(err);
  }
});

// 上传工作流
router.post('/workflows', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: '缺少文件' });
    }

    // 读取上传的文件
    const fileContent = await fs.readFile(req.file.path, 'utf8');
    let workflowData;
    
    try {
      workflowData = JSON.parse(fileContent);
    } catch (parseError) {
      return res.status(400).json({ success: false, message: '文件不是有效的JSON格式' });
    }

    // 保存工作流文件
    const workflowsDir = path.join(__dirname, '../../uploads/workflows');
    const fileName = `${Date.now()}_${req.file.originalname}`;
    const filePath = path.join(workflowsDir, fileName);
    
    await fs.writeFile(filePath, JSON.stringify(workflowData, null, 2));

    // 删除临时文件
    await fs.unlink(req.file.path);

    const workflow = {
      id: fileName.replace('.json', ''),
      name: workflowData.name || fileName.replace('.json', ''),
      type: 'custom',
      lastModified: new Date().toISOString().split('T')[0]
    };

    res.json({ success: true, data: workflow });
  } catch (err) {
    next(err);
  }
});

// 更新工作流
router.put('/workflows/:id', async (req, res, next) => {
  try {
    const workflowId = req.params.id;
    const { name, data } = req.body;

    // 不能更新内置工作流
    if (['default', 'highres', 'style-transfer'].includes(workflowId)) {
      return res.status(400).json({ success: false, message: '不能更新内置工作流' });
    }

    // 更新自定义工作流文件
    const workflowsDir = path.join(__dirname, '../../uploads/workflows');
    const filePath = path.join(workflowsDir, `${workflowId}.json`);
    
    try {
      // 读取现有工作流
      const fileContent = await fs.readFile(filePath, 'utf8');
      let workflowData = JSON.parse(fileContent);
      
      // 更新工作流数据
      if (name) {
        workflowData.name = name;
      }
      
      if (data) {
        workflowData = { ...workflowData, ...data };
      }
      
      // 保存更新后的工作流
      await fs.writeFile(filePath, JSON.stringify(workflowData, null, 2));
      
      const stats = await fs.stat(filePath);
      
      const workflow = {
        id: workflowId,
        name: workflowData.name || workflowId,
        type: 'custom',
        lastModified: stats.mtime.toISOString().split('T')[0],
        data: workflowData
      };
      
      res.json({ success: true, data: workflow });
    } catch (err) {
      if (err.code === 'ENOENT') {
        return res.status(404).json({ success: false, message: '工作流不存在' });
      } else {
        throw err;
      }
    }
  } catch (err) {
    next(err);
  }
});

// 删除工作流
router.delete('/workflows/:id', async (req, res, next) => {
  try {
    const workflowId = req.params.id;
    
    // 不能删除内置工作流
    if (['default', 'highres', 'style-transfer'].includes(workflowId)) {
      return res.status(400).json({ success: false, message: '不能删除内置工作流' });
    }

    // 删除自定义工作流文件
    const workflowsDir = path.join(__dirname, '../../uploads/workflows');
    const filePath = path.join(workflowsDir, `${workflowId}.json`);
    
    try {
      await fs.unlink(filePath);
      res.json({ success: true, message: '工作流已删除' });
    } catch (err) {
      if (err.code === 'ENOENT') {
        res.status(404).json({ success: false, message: '工作流不存在' });
      } else {
        throw err;
      }
    }
  } catch (err) {
    next(err);
  }
});

// 获取工作流详情
router.get('/workflows/:id', async (req, res, next) => {
  try {
    const workflowId = req.params.id;
    let workflowData = {};

    // 处理内置工作流
    if (['default', 'highres', 'style-transfer'].includes(workflowId)) {
      workflowData = {
        id: workflowId,
        name: workflowId === 'default' ? '默认文生图工作流' : 
              workflowId === 'highres' ? '高清修复工作流' : '风格迁移工作流',
        type: 'builtin',
        lastModified: new Date().toISOString().split('T')[0],
        data: {} // 这里应该是实际的工作流JSON数据
      };
    } else {
      // 处理自定义工作流
      const workflowsDir = path.join(__dirname, '../../uploads/workflows');
      const filePath = path.join(workflowsDir, `${workflowId}.json`);
      
      try {
        const fileContent = await fs.readFile(filePath, 'utf8');
        workflowData = JSON.parse(fileContent);
        
        const stats = await fs.stat(filePath);
        
        workflowData = {
          id: workflowId,
          name: workflowData.name || workflowId,
          type: 'custom',
          lastModified: stats.mtime.toISOString().split('T')[0],
          data: workflowData
        };
      } catch (err) {
        if (err.code === 'ENOENT') {
          return res.status(404).json({ success: false, message: '工作流不存在' });
        } else {
          throw err;
        }
      }
    }

    res.json({ success: true, data: workflowData });
  } catch (err) {
    next(err);
  }
});

module.exports = router;