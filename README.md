# AI Canvas Tool

AI驱动的智能画布工具，提供专业的绘图功能和AI图像生成能力。

## 功能特性

### 🎨 核心绘图功能
- 多种绘图工具（画笔、铅笔、橡皮擦、几何图形）
- 图层管理和操作
- 撤销/重做历史记录
- 画布变换（缩放、平移、旋转）
- 基于tldraw的现代化绘图体验

### 🤖 AI增强功能
- 文本到图像生成
- 图像到图像转换
- 局部重绘和智能编辑
- 多种AI模型支持
- ComfyUI工作流应用平台

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
- 多图层管理（可见性、锁定、不透明度、混合模式）
- 图层组和文件夹
- 图层效果（模糊、亮度、对比度等）
- 蒙版支持（Alpha蒙版、剪贴蒙版）
- 可视化工作流设计器
- AI交互面板（目标图层选择、生成参数设置）
- 跨图层融合（混合、替换、叠加模式）
- 高级图层操作（合并、拆分、克隆）
- 图层历史版本管理和差异对比

## 技术栈

### 前端
- React 18 + Hooks
- Vite 构建工具
- Ant Design
- Tailwind CSS
- tldraw (Canvas库)
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
│   ├── hooks/              # 自定义Hook
│   ├── services/           # API服务
│   ├── store/              # 状态管理
│   ├── utils/              # 工具函数
│   └── types/              # TypeScript类型
├── backend/               # 后端源码
│   ├── routes/            # 路由处理
│   ├── models/            # 数据模型
│   ├── services/          # 业务服务
│   ├── middleware/        # 中间件
│   └── config/            # 配置文件
├── frontend/              # 新前端源码
│   ├── src/               # 新前端组件
│   │   └── components/    # 应用构建器组件
├── docs/                  # 文档
├── tests/                 # 测试文件
│   ├── unit/              # 单元测试
│   └── integration/       # 集成测试
└── public/                # 静态资源
```

## API文档

启动后端服务器后，访问 `http://localhost:8000/docs` 查看完整的API文档。

## ComfyUI 应用平台

访问 `http://localhost:8000` 并点击导航栏中的"应用构建器"来使用新的ComfyUI应用平台。
查看 [使用指南](./docs/app_builder_guide.md) 了解更多详情。

## 图层功能

项目支持完整的图层管理系统，包括：

- 多图层结构管理
- 图层可见性、锁定、不透明度控制
- 图层混合模式（正片叠底、滤色、叠加等）
- 图层组和文件夹
- 图层效果（模糊、亮度、对比度等）
- 蒙版支持（Alpha蒙版、剪贴蒙版）
- 图层历史记录和撤销/重做功能
- AI交互面板（目标图层选择、生成参数设置）
- 跨图层融合（混合、替换、叠加模式）
- 高级图层操作（合并、拆分、克隆）
- 图层历史版本管理和差异对比

查看 [图层实现计划](./LAYER_IMPLEMENTATION_PLAN.md) 了解更多详情。

查看 [图层优化总结](./LAYER_OPTIMIZATION_SUMMARY.md) 了解最新优化内容。

## tldraw 集成

项目已从Fabric.js迁移到tldraw，提供更现代化的绘图体验：

- 基于[tldraw](https://github.com/tldraw/tldraw)的绘图功能
- 保留了所有现有功能和数据结构
- 更好的性能和用户体验
- 查看 [tldraw迁移计划](./TL_DRAW_MIGRATION_PLAN.md) 了解更多详情

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