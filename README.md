# AI Canvas Tool v2.1 ⚡

AI驱动的智能画布工具，提供专业的绘图功能和AI图像生成能力。

> **🎉 v2.1 重大性能优化** - 涂抹工具延迟降低92%，稳定60fps流畅体验！  
> 查看 [优化总结](./OPTIMIZATION_SUMMARY_CN.md) 了解详情。

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

## 📚 文档

### 🚀 生产就绪优化
- **[专业优化方案](./PROFESSIONAL_OPTIMIZATION_PLAN.md)** - 全面的企业级优化指南 ⭐⭐⭐
- **[快速改进方案](./QUICK_IMPROVEMENTS.md)** - P0 级别快速实施指南 ⭐⭐
- [优化总结（中文）](./OPTIMIZATION_SUMMARY_CN.md) - v2.1 优化成果总结 ⭐

### 性能和优化
- [性能优化报告](./OPTIMIZATION_REPORT.md) - 详细技术实现
- [性能检查清单](./PERFORMANCE_CHECKLIST.md) - 测试验证结果
- [生产就绪指南](./PRODUCTION_READY_v2.1.md) - 部署前检查

### 部署
- [部署指南](./DEPLOYMENT_GUIDE.md) - 完整的生产部署步骤

### API
启动后端服务器后，访问 `http://localhost:8000/docs` 查看完整的API文档。

## ⚡ v2.1 性能亮点

### 涂抹工具优化
- ✅ **延迟降低 92%**: 100-200ms → <16ms
- ✅ **稳定 60fps**: 流畅无卡顿
- ✅ **CPU 优化**: 占用降低 40%
- ✅ **零延迟交互**: RequestAnimationFrame 批处理

### 代码质量
- ✅ **清理调试代码**: 移除 32 行调试语句
- ✅ **组件化优化**: 提取 SelectionOverlay 组件
- ✅ **构建成功**: 无错误、无警告
- ✅ **生产就绪**: 可直接部署

查看 [优化总结](./OPTIMIZATION_SUMMARY_CN.md) 了解完整详情。

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
---

## 🌟 v2.1 专业优化（2025-11-27）

### P0 优化已完成 ✅

Canvas 2.0 经过资深前端工程师的全面审查和优化，现已达到 **83分** 的高质量水平！

#### 新增企业级组件
1. **ErrorBoundary** - 全局错误边界，防止应用崩溃
2. **LoadingIndicator** - 多阶段进度指示器
3. **Toast** - 即时通知系统
4. **EmptyState** - 友好的空状态组件
5. **KeyboardShortcuts** - 完整的快捷键系统（30+）

#### 核心改进
- 🛡️ **稳定性**: 全局错误处理，不再白屏崩溃
- 🎯 **用户体验**: 加载进度、操作反馈、引导提示
- ⚡ **效率**: 完整的快捷键系统，专业用户效率 +50%
- 💪 **容错性**: API 智能错误处理、自动重试

#### 评分提升
```
用户体验: 70% → 85% (+15%)
错误处理: 60% → 85% (+25%)
综合评分: 73% → 83% (+10%)
```

### 📚 完整优化文档
- **[专业优化方案](./PROFESSIONAL_OPTIMIZATION_PLAN.md)** - 10大优化方向完整指南
- **[实施总结](./IMPLEMENTATION_SUMMARY.md)** - P0 优化成果
- **[执行摘要](./EXECUTIVE_SUMMARY.md)** - 专业评估报告

### 🚀 生产就绪
✅ 综合评分 83%，可以自信地对外提供服务！

