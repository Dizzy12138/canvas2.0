const express = require('express');
const multer = require('multer');
const App = require('../models/App');
const PageDSL = require('../models/PageDSL');
const ExecutionHistory = require('../models/ExecutionHistory');
const fs = require('fs').promises;
const path = require('path');

const router = express.Router();
console.log('Apps router created'); // 添加调试信息

// 添加一个测试路由
router.get('/test', (req, res) => {
  console.log('Test route called'); // 添加调试信息
  res.json({ message: 'Test route working' });
});

// 添加一个测试路由
router.get('/test-check-name', (req, res) => {
  console.log('Test check name route called'); // 添加调试信息
  res.json({ message: 'Test check name route working' });
});

// 配置文件上传
const upload = multer({ 
  dest: 'uploads/temp/',
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/json' || file.originalname.endsWith('.json')) {
      cb(null, true);
    } else {
      cb(new Error('Only JSON files are allowed'));
    }
  }
});

// 解析工作流文件
router.post('/workflows/import', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        error: { 
          code: '400_INVALID_FILE_TYPE', 
          message: 'No file uploaded' 
        } 
      });
    }

    // 读取上传的文件
    const fileContent = await fs.readFile(req.file.path, 'utf8');
    let workflowData;
    
    try {
      workflowData = JSON.parse(fileContent);
    } catch (parseError) {
      // 删除临时文件
      await fs.unlink(req.file.path);
      return res.status(422).json({ 
        error: { 
          code: '422_PARSE_FAILED', 
          message: 'Invalid JSON format',
          detail: parseError.message
        } 
      });
    }

    // 验证是否为ComfyUI API格式
    if (!workflowData || !workflowData.nodes || !Array.isArray(workflowData.nodes)) {
      // 删除临时文件
      await fs.unlink(req.file.path);
      return res.status(422).json({ 
        error: { 
          code: '422_NOT_API_FORMAT', 
          message: 'Not a valid ComfyUI API format workflow'
        } 
      });
    }

    // 解析工作流结构
    const workflowId = `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const version = 1;
    
    // 提取可映射的输入和输出
    const mappableInputs = [];
    const mappableOutputs = [];
    const parameters = {}; // 添加参数对象
    
    for (const node of workflowData.nodes) {
      // 处理输入端口
      if (node.inputs) {
        for (const [port, value] of Object.entries(node.inputs)) {
          // 如果输入是字符串且不是连接（即常量值），则可映射
          if (typeof value === 'string' && !Array.isArray(value)) {
            mappableInputs.push({
              nodeId: node.id,
              nodeTitle: node.title || node.type,
              port: port,
              type: detectInputType(port, value),
              required: isInputRequired(port, node.type)
            });
            
            // 添加到参数对象中
            const paramKey = `${node.id}|${node.type}/${port}`;
            parameters[paramKey] = {
              nodeId: node.id,
              nodeType: node.type,
              port: port,
              type: detectInputType(port, value),
              default: value,
              title: port,
              description: `${node.title || node.type} - ${port}`,
              required: isInputRequired(port, node.type)
            };
          } else if (typeof value === 'number') {
            mappableInputs.push({
              nodeId: node.id,
              nodeTitle: node.title || node.type,
              port: port,
              type: 'NUMBER',
              required: isInputRequired(port, node.type)
            });
            
            // 添加到参数对象中
            const paramKey = `${node.id}|${node.type}/${port}`;
            parameters[paramKey] = {
              nodeId: node.id,
              nodeType: node.type,
              port: port,
              type: 'number',
              default: value,
              title: port,
              description: `${node.title || node.type} - ${port}`,
              required: isInputRequired(port, node.type)
            };
          } else if (typeof value === 'boolean') {
            // 添加到参数对象中
            const paramKey = `${node.id}|${node.type}/${port}`;
            parameters[paramKey] = {
              nodeId: node.id,
              nodeType: node.type,
              port: port,
              type: 'boolean',
              default: value,
              title: port,
              description: `${node.title || node.type} - ${port}`,
              required: isInputRequired(port, node.type)
            };
          }
        }
      }
      
      // 处理输出端口（基于节点类型推断）
      const outputTypes = getNodeOutputTypes(node.type);
      for (let i = 0; i < outputTypes.length; i++) {
        mappableOutputs.push({
          nodeId: node.id,
          nodeTitle: node.title || node.type,
          port: outputTypes[i].port,
          type: outputTypes[i].type
        });
      }
    }

    // 保存工作流文件
    const workflowsDir = path.join(__dirname, '../../uploads/workflows');
    try {
      await fs.access(workflowsDir);
    } catch {
      await fs.mkdir(workflowsDir, { recursive: true });
    }
    
    const fileName = `${workflowId}_v${version}.json`;
    const filePath = path.join(workflowsDir, fileName);
    await fs.writeFile(filePath, JSON.stringify(workflowData, null, 2));

    // 删除临时文件
    await fs.unlink(req.file.path);

    // 识别可输出节点
    const outputNodes = workflowData.nodes.filter(node => 
      getNodeOutputTypes(node.type).length > 0
    );
    
    res.json({
      workflowId,
      version,
      name: workflowData.name || '未命名工作流',
      nodesCount: workflowData.nodes.length,
      mappableInputs,
      mappableOutputs,
      parameters, // 返回参数对象
      outputNodes: outputNodes.map(node => ({
        id: node.id,
        type: node.type,
        title: node.title || node.type,
        outputs: getNodeOutputTypes(node.type)
      }))
    });
  } catch (err) {
    next(err);
  }
});

// 创建/更新应用
router.post('/', async (req, res, next) => {
  try {
    const { name, workflowId, workflowVersion, timeoutSec, modelType, maxRuntime, enableCache, errorHandling, resourcePriority, concurrencyLimit, rateLimit, outputs } = req.body;
    
    // 检查应用名是否重复
    const existingApp = await App.findOne({ name, _id: { $ne: req.body.appId } });
    if (existingApp) {
      return res.status(409).json({ 
        error: { 
          code: '409_APP_NAME_DUPLICATE', 
          message: 'Application name already exists'
        } 
      });
    }
    
    let app;
    if (req.body.appId) {
      // 更新现有应用
      app = await App.findByIdAndUpdate(
        req.body.appId,
        { name, workflowId, workflowVersion, timeoutSec, modelType, maxRuntime, enableCache, errorHandling, resourcePriority, concurrencyLimit, rateLimit, outputs, updatedBy: req.user?.id },
        { new: true, runValidators: true }
      );
    } else {
      // 创建新应用
      app = new App({
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
        createdBy: req.user?.id,
        updatedBy: req.user?.id
      });
      await app.save();
    }
    
    res.json(app);
  } catch (err) {
    next(err);
  }
});

// 检查应用名唯一性 - 放在获取应用详情路由之前，避免路由冲突
router.get('/check-name', async (req, res, next) => {
  console.log('Check name route called with query:', req.query); // 添加调试信息
  try {
    const { name, excludeId } = req.query;
    if (!name) {
      console.log('Name is missing'); // 添加调试信息
      return res.status(400).json({ error: { code: '400_INVALID_REQUEST', message: '应用名称不能为空' } });
    }

    let query = { name: name };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }

    console.log('Query:', query); // 添加调试信息
    const existingApp = await App.findOne(query);
    console.log('Existing app:', existingApp); // 添加调试信息
    res.json({ exists: !!existingApp });
  } catch (error) {
    console.error('Error in check name route:', error); // 添加调试信息
    next(error);
  }
});

// 添加一个带参数的测试路由
router.get('/check-name-test', async (req, res, next) => {
  console.log('Check name test route called with query:', req.query); // 添加调试信息
  try {
    res.json({ message: 'Check name test route working', query: req.query });
  } catch (error) {
    console.error('Error in check name test route:', error); // 添加调试信息
    next(error);
  }
});

// 获取应用详情 - 放在检查应用名路由之后
router.get('/:appId', async (req, res, next) => {
  try {
    const app = await App.findById(req.params.appId);
    if (!app) {
      return res.status(404).json({ 
        error: { 
          code: '404_APP_NOT_FOUND', 
          message: 'Application not found'
        } 
      });
    }
    res.json(app);
  } catch (err) {
    next(err);
  }
});

// 保存页面DSL
router.post('/:appId/page', async (req, res, next) => {
  try {
    const appId = req.params.appId;
    const { components, layout } = req.body;
    
    // 检查应用是否存在
    const app = await App.findById(appId);
    if (!app) {
      return res.status(404).json({ 
        error: { 
          code: '404_APP_NOT_FOUND', 
          message: 'Application not found'
        } 
      });
    }
    
    // 查找最新版本
    const latestPage = await PageDSL.findOne({ appId }).sort({ version: -1 });
    const version = latestPage ? latestPage.version + 1 : 1;
    
    // 创建新的页面DSL
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

// 获取页面DSL
router.get('/:appId/page', async (req, res, next) => {
  try {
    const appId = req.params.appId;
    const version = req.query.version ? parseInt(req.query.version) : null;
    
    let pageDSL;
    if (version) {
      pageDSL = await PageDSL.findOne({ appId, version });
    } else {
      // 获取最新版本
      pageDSL = await PageDSL.findOne({ appId }).sort({ version: -1 });
    }
    
    if (!pageDSL) {
      return res.status(404).json({ 
        error: { 
          code: '404_PAGE_NOT_FOUND', 
          message: 'Page DSL not found'
        } 
      });
    }
    
    res.json(pageDSL);
  } catch (err) {
    next(err);
  }
});

// 预览应用
router.post('/:appId/preview', async (req, res, next) => {
  try {
    const appId = req.params.appId;
    
    // 获取应用配置
    const app = await App.findById(appId);
    if (!app) {
      return res.status(404).json({ 
        error: { 
          code: '404_APP_NOT_FOUND', 
          message: 'Application not found'
        } 
      });
    }
    
    // 获取页面DSL
    const pageDSL = await PageDSL.findOne({ appId }).sort({ version: -1 });
    if (!pageDSL) {
      return res.status(404).json({ 
        error: { 
          code: '404_PAGE_NOT_FOUND', 
          message: 'Page DSL not found'
        } 
      });
    }
    
    // 模拟推理过程
    const requestId = `preview_${Date.now()}`;
    const startTime = Date.now();
    
    // 这里应该调用实际的ComfyUI API进行推理
    // 暂时返回模拟结果
    setTimeout(() => {
      const duration = Date.now() - startTime;
      
      res.json({
        requestId,
        status: 'succeeded',
        outputs: {
          primary: {
            type: app.outputs.find(o => o.isPrimary)?.type || 'image',
            url: '/uploads/sample_result.png',
            width: 1024,
            height: 1024
          },
          others: []
        },
        durationMs: duration
      });
    }, 2000);
  } catch (err) {
    next(err);
  }
});

// 更新应用
router.patch('/:id', async (req, res, next) => {
  try {
    const updates = req.body;
    const app = await App.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );
    
    if (!app) {
      return res.status(404).json({ error: { code: '404_NOT_FOUND', message: '应用不存在' } });
    }
    
    res.json(app);
  } catch (error) {
    next(error);
  }
});

// 运行应用
router.post('/:appId/run', async (req, res, next) => {
  try {
    const appId = req.params.appId;
    const { params, options } = req.body;
    
    // 获取应用配置
    const app = await App.findById(appId);
    if (!app) {
      return res.status(404).json({ 
        error: { 
          code: '404_APP_NOT_FOUND', 
          message: 'Application not found'
        } 
      });
    }
    
    // 验证必填参数
    const pageDSL = await PageDSL.findOne({ appId }).sort({ version: -1 });
    if (pageDSL) {
      for (const component of pageDSL.components) {
        if (component.required && (!params || params[component.paramKey] === undefined)) {
          return res.status(422).json({ 
            error: { 
              code: '422_MISSING_REQUIRED_PARAM', 
              message: `${component.paramKey} is required`,
              detail: { param: component.paramKey }
            } 
          });
        }
      }
    }
    
    const requestId = `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    // 创建执行历史记录
    const executionHistory = new ExecutionHistory({
      appId,
      requestId,
      status: 'processing',
      inputs: params,
      createdBy: req.user?.id
    });
    await executionHistory.save();
    
    // 这里应该调用实际的ComfyUI API进行推理
    // 暂时返回模拟结果
    setTimeout(async () => {
      const duration = Date.now() - startTime;
      
      // 更新执行历史记录
      executionHistory.status = 'success';
      executionHistory.durationMs = duration;
      executionHistory.outputs = {
        primary: {
          type: app.outputs.find(o => o.isPrimary)?.type || 'image',
          url: '/uploads/sample_result.png',
          width: 1024,
          height: 1024
        },
        others: []
      };
      await executionHistory.save();
      
      res.json({
        requestId,
        status: 'succeeded',
        outputs: {
          primary: {
            type: app.outputs.find(o => o.isPrimary)?.type || 'image',
            url: '/uploads/sample_result.png',
            width: 1024,
            height: 1024
          },
          others: []
        },
        durationMs: duration
      });
    }, 3000);
  } catch (err) {
    next(err);
  }
});

// SSE流式运行应用
router.get('/:appId/run-stream', async (req, res, next) => {
  try {
    const appId = req.params.appId;
    const params = JSON.parse(decodeURIComponent(req.query.params));
    
    // 设置SSE响应头
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    
    // 发送开始日志
    res.write(`event: log\n`);
    res.write(`data: ${JSON.stringify({ message: '开始处理请求...' })}\n\n`);
    
    // 获取应用配置
    const app = await App.findById(appId);
    if (!app) {
      res.write(`event: error\n`);
      res.write(`data: ${JSON.stringify({ message: '应用未找到' })}\n\n`);
      return res.end();
    }
    
    // 发送应用信息
    res.write(`event: log\n`);
    res.write(`data: ${JSON.stringify({ message: `应用: ${app.name}` })}\n\n`);
    
    // 验证必填参数
    const pageDSL = await PageDSL.findOne({ appId }).sort({ version: -1 });
    if (pageDSL) {
      for (const component of pageDSL.components) {
        if (component.required && (!params || params[component.paramKey] === undefined)) {
          res.write(`event: error\n`);
          res.write(`data: ${JSON.stringify({ message: `${component.paramKey} 是必填项` })}\n\n`);
          return res.end();
        }
      }
    }
    
    const requestId = `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    // 创建执行历史记录
    const executionHistory = new ExecutionHistory({
      appId,
      requestId,
      status: 'processing',
      inputs: params,
      createdBy: req.user?.id
    });
    await executionHistory.save();
    
    // 模拟处理过程
    const steps = [
      '验证输入参数...',
      '准备模型资源...',
      '加载工作流配置...',
      '初始化推理环境...',
      '执行推理计算...',
      '生成输出结果...',
      '处理完成'
    ];
    
    // 模拟逐步执行并发送日志
    for (let i = 0; i < steps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      res.write(`event: log\n`);
      res.write(`data: ${JSON.stringify({ message: steps[i] })}\n\n`);
      
      // 模拟进度
      if (i === steps.length - 1) {
        const duration = Date.now() - startTime;
        
        // 更新执行历史记录
        executionHistory.status = 'success';
        executionHistory.durationMs = duration;
        executionHistory.outputs = {
          primary: {
            type: app.outputs.find(o => o.isPrimary)?.type || 'image',
            url: '/uploads/sample_result.png',
            width: 1024,
            height: 1024
          },
          others: []
        };
        await executionHistory.save();
        
        // 发送结果
        res.write(`event: result\n`);
        res.write(`data: ${JSON.stringify({
          requestId,
          status: 'succeeded',
          outputs: {
            primary: {
              type: app.outputs.find(o => o.isPrimary)?.type || 'image',
              url: '/uploads/sample_result.png',
              width: 1024,
              height: 1024
            },
            others: []
          },
          durationMs: duration
        })}\n\n`);
        
        return res.end();
      }
    }
  } catch (err) {
    console.error('执行应用时出错:', err);
    res.write(`event: error\n`);
    res.write(`data: ${JSON.stringify({ message: '处理失败: ' + err.message })}\n\n`);
    res.end();
  }
});

// 获取执行历史记录
router.get('/:appId/history', async (req, res, next) => {
  try {
    const appId = req.params.appId;
    const history = await ExecutionHistory.find({ appId }).sort({ createdAt: -1 }).limit(50);
    res.json(history);
  } catch (err) {
    next(err);
  }
});

// 辅助函数：检测输入类型
function detectInputType(port, value) {
  if (port.toLowerCase().includes('image') || port.toLowerCase().includes('picture')) {
    return 'IMAGE';
  }
  if (port.toLowerCase().includes('text') || port.toLowerCase().includes('prompt')) {
    return 'STRING';
  }
  if (port.toLowerCase().includes('mask')) {
    return 'MASK';
  }
  if (typeof value === 'string') {
    return 'STRING';
  }
  return 'STRING';
}

// 辅助函数：判断输入是否必填
function isInputRequired(port, nodeType) {
  // 一些常见的必填输入端口
  const requiredPorts = ['image', 'text', 'prompt', 'model'];
  return requiredPorts.some(p => port.toLowerCase().includes(p));
}

// 辅助函数：获取节点输出类型
function getNodeOutputTypes(nodeType) {
  const outputMap = {
    'LoadImage': [{ port: 'image', type: 'IMAGE' }],
    'SaveImage': [{ port: 'images', type: 'IMAGE' }],
    'CLIPTextEncode': [{ port: 'CONDITIONING', type: 'CONDITIONING' }],
    'KSampler': [{ port: 'LATENT', type: 'LATENT' }],
    'VAEDecode': [{ port: 'IMAGE', type: 'IMAGE' }],
    'PreviewImage': [{ port: 'images', type: 'IMAGE' }]
  };
  
  return outputMap[nodeType] || [{ port: 'output', type: 'ANY' }];
}

module.exports = router;