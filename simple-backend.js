import express from 'express';
import cors from 'cors';
import { dbManager } from './backend/config/database.js';

const app = express();

// 中间件
app.use(cors());
app.use(express.json());

// 初始化数据库
dbManager.connect();

// 简单的健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Backend is running' });
});

// 应用列表API
app.get('/api/apps', async (req, res) => {
  try {
    const App = dbManager.getModel('App');
    const queryResult = await App.find({ createdBy: 'anonymous' });
    const apps = await queryResult.sort({ createdAt: -1 });
    res.json({ success: true, data: apps });
  } catch (err) {
    console.error('Error fetching apps:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 工作流列表API
app.get('/api/comfy/workflows', async (req, res) => {
  try {
    const WorkflowFile = dbManager.getModel('WorkflowFile');
    const workflows = await WorkflowFile.find({});
    res.json(workflows);
  } catch (err) {
    console.error('Error fetching workflows:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = 8000;
app.listen(PORT, () => {
  console.log(`Simple backend running on port ${PORT}`);
});
