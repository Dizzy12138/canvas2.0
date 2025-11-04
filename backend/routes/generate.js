const express = require('express');
const { dbManager } = require('../config/database');
const { sendError } = require('../utils/errorHandler');
const crypto = require('crypto');

const router = express.Router();
const axios = require('axios');

const ExecutionHistory = dbManager.getModel('ExecutionHistory');
const App = dbManager.getModel('App');

// 创建任务
router.post('/task', async (req, res, next) => {
  try {
    const { app_id, workflow_id, page_schema, bindings, values } = req.body || {};
    if (!app_id || !workflow_id || !Array.isArray(bindings)) {
      return sendError(res, 400, '400_INVALID_REQUEST', '缺少必要字段');
    }

    const app = await App.findOne({ _id: app_id });
    if (!app) return sendError(res, 404, '404_APP_NOT_FOUND', '应用不存在');

    // 生成task/prompt id（MVP占位）
    const taskId = crypto.randomBytes(8).toString('hex');
    const promptId = crypto.randomBytes(8).toString('hex');

    // 先占位写入历史
    const hist = await ExecutionHistory.create({
      appId: app_id,
      requestId: taskId,
      promptId: null,
      status: 'pending',
      inputs: { workflow_id, page_schema, bindings, values },
      createdBy: req.user?.id || 'anonymous'
    });

    // 调用内部 comfy 运行（映射由 /api/comfy/apps/:appId/run 完成）
    try {
      const upstream = await axios.post(
        `http://localhost:${process.env.PORT || 8000}/api/comfy/apps/${app_id}/run`,
        { uiInputs: values },
        { timeout: 60000 }
      );
      // 期望 comfy 返回 { prompt_id } 或相关结构
      const pid = upstream.data?.prompt_id || upstream.data?.data?.prompt_id || promptId;
      // 更新历史
      await ExecutionHistory.findOneAndUpdate({ requestId: taskId }, { promptId: pid, status: 'processing' });
      return res.json({ success: true, data: { task_id: taskId, prompt_id: pid, status: 'queued' } });
    } catch (e) {
      // 上游不通时保留占位任务
      return res.json({ success: true, data: { task_id: taskId, prompt_id: promptId, status: 'queued', note: 'comfy upstream unavailable' } });
    }
  } catch (err) {
    next(err);
  }
});

// 查询任务
router.get('/task/:taskId', async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const hist = await ExecutionHistory.findOne({ requestId: taskId });
    if (!hist) return sendError(res, 404, '404_TASK_NOT_FOUND', '任务不存在');

    // 若有 promptId，尝试聚合 comfy history
    if (hist.promptId) {
      try {
        const upstream = await axios.get(`http://localhost:${process.env.PORT || 8000}/api/comfy/history/${hist.promptId}`, { timeout: 20000 });
        const body = upstream.data || {};
        // 解析图片文件名（兼容常见结构）
        const firstEntry = body?.[hist.promptId] || body?.history || body;
        let filename;
        if (Array.isArray(firstEntry?.outputs)) {
          const img = firstEntry.outputs.find(o => o?.type === 'image' && o?.filename);
          filename = img?.filename;
        }
        if (!filename && firstEntry?.images && firstEntry.images[0]?.filename) {
          filename = firstEntry.images[0].filename;
        }
        const image_url = filename ? `${req.protocol}://${req.get('host')}/api/comfy/view?filename=${encodeURIComponent(filename)}` : undefined;
        return res.json({ success: true, data: { task_id: taskId, status: 'completed', image_url } });
      } catch (e) {
        // 保持处理态
        return res.json({ success: true, data: { task_id: taskId, status: hist.status || 'processing' } });
      }
    }

    return res.json({ success: true, data: { task_id: taskId, status: hist.status, image_url: hist.outputs?.image_url, error: hist.error } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;


