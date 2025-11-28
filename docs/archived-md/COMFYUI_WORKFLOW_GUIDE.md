# ComfyUI 应用配置与可视化画布模块使用指南

## 🎯 功能概述

本模块实现了完整的 ComfyUI 工作流应用配置与可视化画布功能，支持：

- ✅ 自动解析 ComfyUI 工作流的节点与参数
- ✅ 支持用户通过下拉树形下钻方式选择绑定目标节点
- ✅ 将参数映射到前端组件，实现低代码式的 ComfyUI 应用搭建
- ✅ 完整的参数验证和绑定管理
- ✅ 可视化画布拖拽式组件绑定
- ✅ 工作流执行和结果预览

## 🚀 快速开始

### 1. 启动系统

```bash
# 启动前端开发服务器
npm run dev

# 启动后端API服务器
npm run dev:server
```

### 2. 访问应用构建器

打开浏览器访问 `http://localhost:5173`，点击导航栏中的"应用构建器"。

## 📋 使用流程

### 步骤1：服务管理
- 配置 ComfyUI 服务端点
- 设置 API 密钥和认证方式
- 测试服务连接状态

### 步骤2：上传工作流
1. 点击"选择文件"或拖拽 ComfyUI JSON 工作流文件到上传区域
2. 系统自动解析工作流，提取节点和参数信息
3. 显示解析结果，包括节点数量和参数结构

**支持的文件格式：**
- `.json` 格式的 ComfyUI 工作流文件
- 文件大小不超过 10MB

### 步骤3：应用配置
1. **设置应用名称**：输入应用的显示名称
2. **配置暴露参数**：
   - 点击"添加参数"按钮
   - 在"绑定工作流参数"下拉框中选择节点和参数
   - 系统自动填充参数类型、默认值等信息
   - 设置是否在前端暴露该参数
   - 可编辑默认值

**节点下钻选择功能：**
- 第一级：选择节点名称（如 KSampler、CLIPTextEncode）
- 第二级：选择具体参数（如 steps、cfg、text）
- 支持搜索过滤节点名或参数名
- 显示参数类型、描述和是否必需

### 步骤4：画布搭建
1. **组件库**：左侧显示可用的UI组件类型
   - 文本输入框
   - 多行文本框
   - 数字输入框
   - 滑块控件
   - 下拉选择框
   - 复选框
   - 文件上传控件

2. **添加组件**：
   - 点击组件库中的组件类型
   - 组件自动添加到画布中
   - 支持拖拽排序

3. **配置组件**：
   - 选择画布中的组件
   - 右侧属性面板显示组件配置选项
   - 设置组件标签
   - 绑定工作流参数（使用相同的节点下钻选择器）
   - 设置默认值

4. **参数绑定**：
   - 使用级联选择器选择要绑定的工作流参数
   - 系统自动验证参数类型匹配
   - 显示绑定路径和参数信息

### 步骤5：运行应用
1. **输入参数**：在左侧面板输入各参数的值
2. **执行工作流**：点击"运行工作流"按钮
3. **查看结果**：右侧面板显示执行结果

## 🔧 高级功能

### 参数验证
系统会自动验证：
- 参数路径的有效性
- 参数类型匹配
- 重复绑定检查
- 必需参数检查

### 参数建议
根据组件类型自动推荐合适的参数：
- 文本组件 → 推荐 string 类型参数
- 数字组件 → 推荐 number 类型参数
- 文件组件 → 推荐 image/model 类型参数

### 绑定管理
- 支持组件与参数的动态绑定
- 实时验证绑定有效性
- 显示绑定状态和错误提示

## 📊 数据结构

### 工作流解析结果
```json
{
  "workflow_id": "6c11a9b3",
  "nodes": [
    {
      "id": 1,
      "name": "KSampler",
      "type": "sampler",
      "inputs": [
        {"key": "steps", "type": "int", "default": 20},
        {"key": "cfg", "type": "float", "default": 7.5}
      ],
      "outputs": [{"key": "image", "type": "png"}]
    }
  ]
}
```

### 级联选择器数据
```json
[
  {
    "label": "KSampler",
    "value": "KSampler",
    "nodeId": 1,
    "nodeType": "sampler",
    "children": [
      {
        "label": "steps",
        "value": "KSampler.steps",
        "type": "number",
        "default": 20,
        "description": "数值输入 (节点控件)",
        "isRequired": true
      }
    ]
  }
]
```

### UI绑定数据
```json
{
  "ui_bindings": [
    {"component_id": "slider_cfg", "bind_to": "KSampler.cfg"},
    {"component_id": "input_prompt", "bind_to": "CLIPTextEncode.text"}
  ]
}
```

## 🛠️ API 接口

### 工作流管理
- `POST /api/comfy/workflows` - 上传并解析工作流
- `GET /api/comfy/workflows/:workflowId` - 获取工作流详情
- `GET /api/comfy/workflows/:workflowId/cascader` - 获取级联选择器数据

### 参数管理
- `GET /api/comfy/workflows/:workflowId/suggestions/:componentType` - 获取参数建议
- `POST /api/comfy/workflows/:workflowId/validate-bindings` - 验证参数绑定

### 应用执行
- `POST /api/comfy/apps/:appId/run` - 执行应用

## 🐛 故障排除

### 常见问题

1. **工作流解析失败**
   - 检查 JSON 文件格式是否正确
   - 确认文件大小不超过 10MB
   - 验证是否为有效的 ComfyUI 工作流格式

2. **参数绑定失败**
   - 检查参数路径是否正确
   - 确认参数类型是否匹配
   - 验证节点是否存在于工作流中

3. **执行失败**
   - 检查 ComfyUI 服务是否正常运行
   - 验证 API 密钥和认证配置
   - 确认工作流参数是否完整

### 调试技巧

1. **查看浏览器控制台**：检查 JavaScript 错误
2. **检查网络请求**：查看 API 调用状态
3. **验证数据格式**：确认 JSON 数据结构正确

## 🔄 更新日志

### v1.0.0 (2024-01-XX)
- ✅ 实现基础工作流解析功能
- ✅ 添加节点下钻选择器
- ✅ 实现参数验证和绑定管理
- ✅ 添加可视化画布功能
- ✅ 完成应用执行流程

## 📞 技术支持

如有问题或建议，请联系开发团队或提交 Issue。

---

**注意**：本系统基于 ComfyUI 工作流格式设计，确保使用的工作流文件符合 ComfyUI API 规范。
