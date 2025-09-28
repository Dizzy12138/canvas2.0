# AI Canvas Tool

AI驱动的智能画布工具，提供专业的绘图功能和AI图像生成能力。

## 功能特性

### 🎨 核心绘图功能
- 多种绘图工具（画笔、铅笔、橡皮擦、几何图形）
- 图层管理和操作
- 撤销/重做历史记录
- 画布变换（缩放、平移、旋转）

### 🤖 AI增强功能
- 文本到图像生成
- 图像到图像转换
- 局部重绘和智能编辑
- 多种AI模型支持

### 💾 数据管理
- 项目保存和加载
- 云端同步
- 多格式导出
- 版本控制

### 🔧 高级工具
- 选择和变换工具
- 文本编辑器
- 智能抠图
- 图像超分辨率

## 技术栈

### 前端
- React 18 + Hooks
- Vite 构建工具
- Tailwind CSS
- Fabric.js (Canvas库)
- Socket.io Client

### 后端
- Node.js + Express
- MongoDB + Redis
- Socket.io
- Multer (文件上传)
- JWT 认证

### AI服务
- OpenAI DALL-E
- Stability AI
- 自定义模型集成

## 快速开始

### 环境要求
- Node.js >= 18.0.0
- MongoDB >= 6.0
- Redis >= 7.0

### 安装依赖
```bash
npm install
```

### 配置环境
```bash
cp .env.example .env
# 编辑 .env 文件，配置数据库连接和API密钥
```

### 启动开发服务器
```bash
# 前端开发服务器
npm run dev

# 后端API服务器
npm run dev:server
```

### 运行测试
```bash
npm test
```

## 项目结构

```
ai-canvas-tool/
├── src/                    # 前端源码
│   ├── components/         # React组件
│   ├── hooks/             # 自定义Hook
│   ├── services/          # API服务
│   ├── store/             # 状态管理
│   ├── utils/             # 工具函数
│   └── types/             # TypeScript类型
├── backend/               # 后端源码
│   ├── routes/            # 路由处理
│   ├── models/            # 数据模型
│   ├── services/          # 业务服务
│   ├── middleware/        # 中间件
│   └── config/            # 配置文件
├── tests/                 # 测试文件
│   ├── unit/              # 单元测试
│   └── integration/       # 集成测试
└── public/                # 静态资源
```

## API文档

启动后端服务器后，访问 `http://localhost:8000/docs` 查看完整的API文档。

## 部署

### Docker部署
```bash
docker-compose up -d
```

### 手动部署
```bash
npm run build
npm start
```

## 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 许可证

MIT License

## 联系方式

- 项目主页：[GitHub Repository]
- 问题反馈：[Issues]
- 文档：[Documentation]