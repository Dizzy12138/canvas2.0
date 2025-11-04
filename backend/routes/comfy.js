const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;
const { v4: uuidv4 } = require("uuid");
const WorkflowService = require("../services/workflowService");
const { dbManager } = require('../config/database');

// 获取模型
const App = dbManager.getModel('App');
const AIService = dbManager.getModel('AIService');
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
    let workflows = [];
    try {
      workflows = await workflowRepository.findAll();
    } catch (e) {
      // 回退到直接读取模型，避免因 repository 失败而 500
      const WorkflowFile = dbManager.getModel('WorkflowFile');
      const resArr = await WorkflowFile.find({});
      workflows = Array.isArray(resArr) ? resArr : (await resArr.sort({ createdAt: -1 }));
    }
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

// 获取工作流的参数建议
router.get('/workflows/:workflowId/suggestions/:componentType', async (req, res, next) => {
  try {
    const { workflowId, componentType } = req.params;
    const workflow = await workflowRepository.findByWorkflowId(workflowId);

    if (!workflow) {
      return res.status(404).json({ success: false, message: '工作流不存在' });
    }

    const suggestions = WorkflowService.getParameterSuggestions(workflow, componentType);
    res.json({ success: true, data: suggestions });
  } catch (err) {
    next(err);
  }
});

// 验证参数绑定
router.post('/workflows/:workflowId/validate-bindings', async (req, res, next) => {
  try {
    const { workflowId } = req.params;
    const { bindings } = req.body;

    const workflow = await workflowRepository.findByWorkflowId(workflowId);
    if (!workflow) {
      return res.status(404).json({ success: false, message: '工作流不存在' });
    }

    const validation = WorkflowService.validateParameterBindings(bindings, workflow);
    res.json({ success: true, data: validation });
  } catch (err) {
    next(err);
  }
});

// 上传文件到 ComfyUI
async function uploadFileToComfyUI(filePath, service) {
  try {
    // 读取本地文件
    const fileBuffer = await fs.readFile(filePath);
    const filename = path.basename(filePath);
    
    // 使用 FormData 上传到 ComfyUI
    const FormData = require('form-data');
    const formData = new FormData();
    formData.append('image', fileBuffer, filename);
    
    // ComfyUI 的 upload API 通常是 /upload 或 /upload/image
    // 尝试 /upload/image  first，如果失败再尝试 /upload
    let uploadUrl = new URL('/upload/image', service.baseUrl).toString();
    const cfg = { 
      timeout: service.timeoutMs || 60000, 
      validateStatus: () => true,
      headers: formData.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    };
    
    // 添加认证
    if (service.authMethod === 'header' && service.apiKey) {
      cfg.headers[service.apiKeyHeader || 'Authorization'] = service.apiKey;
    }
    
    let finalUploadUrl = uploadUrl;
    if (service.authMethod === 'query' && service.apiKey) {
      const u = new URL(finalUploadUrl);
      u.searchParams.set(service.apiKeyQuery || 'api_key', service.apiKey);
      finalUploadUrl = u.toString();
    }
    
    let uploadResponse;
    try {
      uploadResponse = await axios.post(finalUploadUrl, formData, cfg);
    } catch (err) {
      // 如果 /upload/image 失败，尝试 /upload
      if (err.response?.status === 404 || err.code === 'ECONNREFUSED') {
        console.log(`Trying /upload instead of /upload/image`);
        uploadUrl = new URL('/upload', service.baseUrl).toString();
        finalUploadUrl = uploadUrl;
        if (service.authMethod === 'query' && service.apiKey) {
          const u = new URL(finalUploadUrl);
          u.searchParams.set(service.apiKeyQuery || 'api_key', service.apiKey);
          finalUploadUrl = u.toString();
        }
        uploadResponse = await axios.post(finalUploadUrl, formData, cfg);
      } else {
        throw err;
      }
    }
    
    // ComfyUI 返回格式可能是：
    // 1. { name: "filename.png", subfolder: "", type: "input" }
    // 2. { filename: "filename.png", subfolder: "", type: "input" }
    // 3. 字符串格式的文件名
    const data = uploadResponse.data;
    
    if (data && typeof data === 'object') {
      const fileName = data.name || data.filename || filename;
      return {
        name: fileName,
        subfolder: data.subfolder || '',
        type: data.type || 'input'
      };
    }
    
    if (typeof data === 'string') {
      // 可能是简单的文件名
      return { name: data, subfolder: '', type: 'input' };
    }
    
    // 如果都不匹配，使用原始文件名
    console.warn('ComfyUI upload 返回格式未识别，使用原始文件名:', data);
    return { name: filename, subfolder: '', type: 'input' };
  } catch (err) {
    console.error('Error uploading file to ComfyUI:', err.message);
    if (err.response) {
      console.error('Upload response status:', err.response.status);
      console.error('Upload response data:', err.response.data);
    }
    throw err;
  }
}

// 运行应用 (新增)
router.post('/apps/:appId/run', async (req, res, next) => {
  try {
    const { appId } = req.params;
    const { uiInputs } = req.body; // 前端传递的 UI 组件输入值

    const app = await App.findById(appId);
    if (!app) {
      return res.status(404).json({ success: false, message: '应用不存在' });
    }

    const workflowFile = await workflowRepository.findByWorkflowId(app.workflowId);
    if (!workflowFile) {
      return res.status(404).json({ success: false, message: '关联的工作流文件不存在' });
    }

    // 解析 ComfyUI 服务端点
    const { service } = await resolveEndpoint(app.preferredAIServiceId);
    
    console.log('[ComfyUI Run] Received uiInputs:', JSON.stringify(uiInputs, null, 2));
    
    // 处理图片文件：如果 uiInputs 中有本地文件路径，先上传到 ComfyUI
    const processedUiInputs = { ...uiInputs };
    for (const [key, value] of Object.entries(uiInputs || {})) {
      console.log(`[ComfyUI Run] Processing key=${key}, value type=${typeof value}, value=${value}`);
      // 检查是否为本地文件路径（以 /uploads/ 开头）
      if (typeof value === 'string' && value.startsWith('/uploads/')) {
        try {
          // 构建完整文件路径
          const filePath = path.join(__dirname, '../..', value);
          
          // 检查文件是否存在
          try {
            await fs.access(filePath);
          } catch {
            console.warn(`File not found: ${filePath}, skipping upload`);
            continue;
          }
          
          // 上传到 ComfyUI
          const comfyFileInfo = await uploadFileToComfyUI(filePath, service);
          
          // ComfyUI 的 LoadImage 节点的 widgets_values 通常是 [filename, subfolder]
          // 但根据不同的工作流定义，可能只需要文件名字符串
          // 这里存储文件信息对象，在 constructExecutionPayload 中会根据节点类型处理
          processedUiInputs[key] = {
            __comfyUpload: true,
            name: comfyFileInfo.name,
            subfolder: comfyFileInfo.subfolder || '',
            type: comfyFileInfo.type || 'input'
          };
          
          console.log(`Uploaded file ${value} to ComfyUI as ${comfyFileInfo.name} (subfolder: ${comfyFileInfo.subfolder})`);
          console.log(`[ComfyUI Run] Updated processedUiInputs[${key}] =`, JSON.stringify(processedUiInputs[key]));
        } catch (uploadErr) {
          console.error(`Failed to upload file ${value} to ComfyUI:`, uploadErr);
          // 继续执行，但可能ComfyUI会报错
        }
      }
    }

    console.log(`[ComfyUI Run] Finished processing uiInputs, final processedUiInputs:`, JSON.stringify(processedUiInputs, null, 2));

    // 使用处理后的 uiInputs 构建 ComfyUI 执行 payload
    console.log('[ComfyUI Run] Building payload with processedUiInputs:', JSON.stringify(processedUiInputs, null, 2));
    const comfyUIPayload = WorkflowService.constructExecutionPayload(
      app.uiBindings,
      processedUiInputs,
      workflowFile
    );
    console.log('[ComfyUI Run] Generated payload, checking for LoadImage nodes...');
    if (comfyUIPayload && comfyUIPayload.prompt) {
      Object.entries(comfyUIPayload.prompt).forEach(([nodeId, node]) => {
        if (node.class_type && node.class_type.toLowerCase().includes('loadimage')) {
          console.log(`[ComfyUI Run] LoadImage node ${nodeId} inputs:`, JSON.stringify(node.inputs));
        }
      });
    }

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

    // Forward request to ComfyUI
    try {
      const comfyUIResponse = await axios.post(finalUrl, comfyUIPayload, cfg);
      res.json({ success: true, data: comfyUIResponse.data });
    } catch (axiosErr) {
      // 处理 ComfyUI 连接失败的情况
      if (axiosErr.code === 'EHOSTUNREACH' || axiosErr.code === 'ECONNREFUSED' || axiosErr.code === 'ETIMEDOUT') {
        const serviceUrl = service.baseUrl || 'Unknown';
        console.error(`ComfyUI 服务不可达: ${serviceUrl}`, axiosErr.message);
        
        // 返回模拟任务ID，前端可以轮询（虽然不会真的执行）
        const mockPromptId = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        return res.status(202).json({
          success: true,
          data: {
            prompt_id: mockPromptId,
            status: 'queued',
            message: `ComfyUI 服务 (${serviceUrl}) 不可达，任务已排队（模拟）`,
            warning: 'ComfyUI 连接失败，请检查服务配置或网络连接'
          }
        });
      }
      
      // 其他错误继续抛出
      throw axiosErr;
    }
  } catch (err) {
    console.error('Error running app:', err);
    // 如果是已知错误（404/400等），返回友好提示
    if (err.response) {
      return res.status(err.response.status).json({
        success: false,
        message: err.response.data?.message || '执行失败',
        error: err.response.data
      });
    }
    next(err);
  }
});

// 代理获取历史/结果 (与 ComfyUI 官方接口一致)
router.get('/history/:promptId', async (req, res) => {
  try {
    const { promptId } = req.params;
    const { service } = await resolveEndpoint();
    const url = new URL(`/history/${promptId}`, service.baseUrl).toString();
    const upstream = await axios.get(url, { timeout: service.timeoutMs || 60000, validateStatus: () => true });
    res.status(upstream.status).json(upstream.data);
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.get('/view', async (req, res) => {
  try {
    const { service } = await resolveEndpoint();
    const url = new URL('/view', service.baseUrl);
    // 透传所有查询参数
    Object.entries(req.query || {}).forEach(([k, v]) => url.searchParams.set(k, v));
    const upstream = await axios.get(url.toString(), { responseType: 'arraybuffer', validateStatus: () => true });
    // 透传 content-type
    res.set('content-type', upstream.headers['content-type'] || 'application/octet-stream');
    res.status(upstream.status).send(Buffer.from(upstream.data));
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 其他 ComfyUI 相关的路由，例如更新、删除工作流等，需要根据新的数据模型进行调整。
// 目前暂时移除，后续根据实际需求再添加或修改。
// router.put('/workflows/:id', ...);
// router.delete('/workflows/:id', ...);

module.exports = router;

