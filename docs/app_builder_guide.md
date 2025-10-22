# ComfyUI 应用平台使用指南

## 简介

ComfyUI 应用平台是一个允许运营/开发人员通过上传 ComfyUI API 工作流来创建自定义应用的平台。本文档将指导您如何使用该平台创建一个完整的应用。

## 创建应用的完整流程

### 1. 上传工作流

1. 点击导航栏中的"应用构建器"
2. 在"上传工作流"页面，点击拖拽区域或点击选择一个 ComfyUI API 格式的 JSON 文件
3. 文件上传后，系统会自动解析工作流并提取可映射的输入和输出节点
4. 点击"解析工作流"按钮，解析成功后会自动进入下一步

### 2. 应用配置

1. 在"应用配置"页面，填写应用名称（需唯一）
2. 设置超时时间（默认60秒，可根据需要调整）
3. 配置产出节点：
   - 从下拉菜单中选择工作流中的节点作为产出节点
   - 选择产出类型（图片/视频/文本/文件等）
   - 可设置多个产出节点，其中一个可设为主产出
4. 点击"下一步"进入页面搭建

### 3. 搭建页面

1. 在"搭建页面"页面，从左侧组件库中拖拽组件到中间的画布区域
2. 点击画布中的组件，在右侧属性面板中配置组件属性：
   - 设置组件标题和参数名
   - 配置默认值
   - 将组件绑定到工作流的输入节点
3. 可以通过"预览"按钮测试页面效果
4. 配置完成后点击"发布"按钮发布应用

### 4. 运行应用

1. 在"运行应用"页面，可以看到根据配置生成的表单
2. 填写表单参数并提交
3. 系统会调用 ComfyUI 服务处理请求并返回结果
4. 处理结果会显示在页面右侧

## 示例：创建去水印应用

### 1. 准备工作流

首先需要准备一个 ComfyUI 去水印工作流的 JSON 文件，确保该工作流包含以下节点：
- loadImage 节点用于加载输入图片
- removeWatermark 节点用于执行去水印操作
- saveImage 节点用于保存输出图片

### 2. 上传工作流

按照上述步骤上传去水印工作流文件。

### 3. 应用配置

- 应用名称：removeLogo
- 超时时间：300秒
- 产出节点：
  - 选择 saveImage 节点
  - 产出类型：图片
  - 设为主产出

### 4. 搭建页面

添加以下组件：
1. 上传图片组件：
   - 标题：上传图片
   - 参数名：image_path
   - 绑定到 loadImage 节点的 image 端口

2. 文本输入组件（可选）：
   - 标题：水印位置
   - 参数名：watermark_position
   - 默认值：center
   - 绑定到 removeWatermark 节点的相关端口

### 5. 发布和运行

完成配置后点击发布，然后在运行页面上传图片并提交表单，即可看到去水印后的结果。

## API 接口说明

### 工作流相关接口

#### 上传工作流
```
POST /api/workflows/import
Content-Type: multipart/form-data

参数：
- file: 工作流 JSON 文件

返回：
{
  "workflowId": "wf_abc123",
  "version": 1,
  "nodesCount": 58,
  "mappableInputs": [...],
  "mappableOutputs": [...]
}
```

### 应用相关接口

#### 创建/更新应用
```
POST /api/apps
Content-Type: application/json

参数：
{
  "name": "removeLogo",
  "workflowId": "wf_abc123",
  "workflowVersion": 1,
  "timeoutSec": 300,
  "outputs": [
    {
      "nodeId": 12,
      "port": "images",
      "type": "image",
      "isPrimary": true
    }
  ]
}

返回：
{
  "id": "app_def456",
  "name": "removeLogo",
  "workflowId": "wf_abc123",
  "workflowVersion": 1,
  "timeoutSec": 300,
  "outputs": [...],
  "isActive": false,
  "createdAt": "2025-10-15T10:00:00Z",
  "updatedAt": "2025-10-15T10:00:00Z"
}
```

#### 检查应用名唯一性
```
GET /api/apps/check-name?name=removeLogo

返回：
{
  "exists": false
}
```

#### 获取应用详情
```
GET /api/apps/{appId}

返回：
{
  "id": "app_def456",
  "name": "removeLogo",
  ...
}
```

### 页面相关接口

#### 保存页面DSL
```
POST /api/apps/{appId}/page
Content-Type: application/json

参数：
{
  "components": [
    {
      "id": "comp_123",
      "type": "upload_image",
      "title": "上传图片",
      "paramKey": "image_path",
      "binding": {
        "nodeId": 8,
        "port": "image"
      }
    }
  ],
  "layout": "one-column"
}

返回：
{
  "id": "page_ghi789",
  "appId": "app_def456",
  "appName": "removeLogo",
  "version": 1,
  "components": [...],
  "layout": "one-column",
  "createdAt": "2025-10-15T10:00:00Z",
  "updatedAt": "2025-10-15T10:00:00Z"
}
```

#### 获取页面DSL
```
GET /api/apps/{appId}/page

返回：
{
  "id": "page_ghi789",
  "appId": "app_def456",
  "appName": "removeLogo",
  "version": 1,
  "components": [...],
  "layout": "one-column",
  ...
}
```

### 运行时接口

#### 运行应用
```
POST /api/apps/{appId}/run
Content-Type: application/json

参数：
{
  "params": {
    "image_path": "oss://bucket/key.png",
    "watermark_position": "center"
  }
}

返回：
{
  "requestId": "20251015-xxx",
  "status": "succeeded",
  "outputs": {
    "primary": {
      "type": "image",
      "url": "https://.../result.png",
      "width": 1024,
      "height": 1024
    },
    "others": []
  },
  "durationMs": 5321
}
```

#### 预览应用
```
POST /api/apps/{appId}/preview

返回：
{
  "requestId": "preview_20251015-xxx",
  "status": "succeeded",
  "outputs": {
    "primary": {
      "type": "image",
      "url": "/uploads/sample_result.png",
      "width": 1024,
      "height": 1024
    },
    "others": []
  },
  "durationMs": 2156
}
```

## 错误处理

平台定义了统一的错误格式：

```json
{
  "requestId": "xxx",
  "error": {
    "code": "422_MISSING_REQUIRED_PARAM",
    "message": "image_path is required",
    "detail": { "param": "image_path" }
  }
}
```

常见错误码：
- 400_INVALID_FILE_TYPE：文件类型无效
- 422_PARSE_FAILED：JSON解析失败
- 422_NOT_API_FORMAT：不是ComfyUI API格式
- 409_APP_NAME_DUPLICATE：应用名称重复
- 422_OUTPUT_NODE_INVALID：产出节点无效
- 422_MISSING_REQUIRED_PARAM：缺少必填参数
- 504_TIMEOUT：处理超时
- 502_COMFYUI_DOWN：ComfyUI服务不可用

## 权限与安全

- 上传/配置/发布功能仅管理员可用
- 运行接口可按应用设置为公开或需要鉴权
- 文件和产出资源使用签名URL进行访问控制
- 输入内容可进行安全扫描（可选）

## 性能与可靠性

- 工作流解析结果会缓存以减少重复解析
- 运行时支持异步队列处理长耗时任务
- 产出节点支持并行拉取与合并返回
- 大文件支持直传以提高性能