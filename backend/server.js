const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const connectDB = require('./config/database');
const { connectRedis } = require('./config/redis');
const errorHandler = require('./middleware/errorHandler');
const authMiddleware = require('./middleware/auth');

// 路由导入
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const projectRoutes = require('./routes/projects');
const fileRoutes = require('./routes/files');
const aiRoutes = require('./routes/ai');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

// 数据库连接
connectDB();
connectRedis();

// 中间件
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));

// 速率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 限制每个IP每15分钟100个请求
  message: {
    error: '请求过于频繁，请稍后再试'
  }
});
app.use('/api/', limiter);

// Body解析
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 静态文件服务
app.use('/uploads', express.static('uploads'));

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/projects', authMiddleware, projectRoutes);
app.use('/api/files', authMiddleware, fileRoutes);
app.use('/api/ai', authMiddleware, aiRoutes);

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Socket.IO连接处理
io.on('connection', (socket) => {
  console.log('用户连接:', socket.id);

  // 加入项目房间
  socket.on('join-project', (projectId) => {
    socket.join(`project-${projectId}`);
    console.log(`用户 ${socket.id} 加入项目 ${projectId}`);
  });

  // 离开项目房间
  socket.on('leave-project', (projectId) => {
    socket.leave(`project-${projectId}`);
    console.log(`用户 ${socket.id} 离开项目 ${projectId}`);
  });

  // AI生成状态更新
  socket.on('ai-generation-status', (data) => {
    socket.to(`project-${data.projectId}`).emit('ai-status-update', data);
  });

  // 断开连接
  socket.on('disconnect', () => {
    console.log('用户断开连接:', socket.id);
  });
});

// 将io实例附加到app，供其他模块使用
app.set('io', io);

// 错误处理中间件
app.use(errorHandler);

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: '接口不存在'
  });
});

const PORT = process.env.PORT || 8000;

server.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
  console.log(`环境: ${process.env.NODE_ENV || 'development'}`);
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('收到SIGTERM信号，开始优雅关闭...');
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});

module.exports = app;