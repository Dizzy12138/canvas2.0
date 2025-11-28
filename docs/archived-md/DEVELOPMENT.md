# AI Canvas Tool 开发文档

## 快速开始

### 环境要求
- Node.js >= 18.0.0
- MongoDB >= 6.0
- Redis >= 7.0

### 安装依赖
```bash
# 前端依赖
npm install

# 后端依赖
cd backend && npm install
```

### 环境配置
```bash
cp .env.example .env
# 编辑 .env 文件配置数据库和API密钥
```

### 启动服务
```bash
# 启动前端开发服务器
npm run dev

# 启动后端API服务器
npm run dev:server
```

## 功能特性

✅ 基础绘图工具（画笔、橡皮擦、几何图形）
✅ 图层管理系统
✅ 文件上传和导出
✅ 用户认证和权限管理
✅ 项目保存和云端同步
✅ AI图像生成集成
✅ 实时协作支持

## API文档

主要API端点：
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `GET /api/projects` - 获取项目列表
- `POST /api/projects` - 创建项目
- `POST /api/files/upload` - 文件上传
- `POST /api/ai/generate` - AI图像生成

## 部署

### Docker部署
```bash
docker-compose up -d
```

### 手动部署
```bash
npm run build
NODE_ENV=production npm start
```