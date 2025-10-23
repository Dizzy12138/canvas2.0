# 项目架构优化与代码重构方案

## 1. 总体评估与优化方向

当前项目 `canvas2.0` 旨在打造一个连接 ComfyUI 工作流与前端可视化画布的低代码应用平台。通过分析现有文档和代码库，我们发现项目已具备基本的前后端结构，但存在职责划分不清、状态管理混乱、组件耦合度高等问题。本方案旨在解决这些核心痛点，提升项目的可维护性、扩展性和用户体验。

**核心优化策略：**

1.  **后端服务化与职责单一化**：将 ComfyUI 工作流的解析、执行与管理抽象为独立的 `WorkflowService`，与其他业务（如项目管理、文件存储）解耦。
2.  **前端状态管理中心化**：引入统一的状态管理机制（如 Zustand 或 Redux Toolkit），对画布状态、工作流参数、UI 绑定关系等全局数据进行集中管理，解决组件间状态传递混乱的问题。
3.  **组件化与原子化**：将前端大型组件（如 `AppBuilder`、`PageBuilder`）拆分为更小、更纯粹的原子组件，提高复用性并降低复杂度。
4.  **标准化数据流**：定义清晰、统一的数据结构，贯穿从后端解析到前端渲染、再到最终执行的全过程，确保数据一致性。

---

## 2. 后端架构优化 (Node.js/Express)

### 2.1 工作流解析服务 (`/backend/services/workflowService.js`)

创建一个新的服务文件，专门处理与 ComfyUI 工作流相关的所有逻辑。

**主要职责：**

-   **`parseWorkflow(jsonContent)`**: 解析上传的 JSON 文件，验证其合法性，并按照文档中定义的 `Node-Parameter Tree` 结构（`{ workflow_id, nodes: [...] }`）返回标准化的节点和参数信息。此函数应处理各种异常情况，如格式错误、节点信息不完整等。
-   **`getWorkflowAsCascader(workflowId)`**: 根据解析后的工作流数据，生成前端所需的**树形下拉选择器（Cascader）**数据结构。该结构应严格遵循文档格式 `[{ label, value, children: [...] }]`，用于参数绑定。
-   **`constructExecutionPayload(uiBindings, formInputs)`**: 根据前端传递的 UI 绑定关系 (`ui_bindings.json`) 和用户输入值，动态构建调用 ComfyUI API 所需的 `payload`。此函数的核心是将 `ComponentID -> Node.Param` 的映射转换为 `Node.Param -> Value` 的格式。

### 2.2 API 路由重构 (`/backend/routes/`)

调整现有路由，使其更符合 RESTful 规范，并调用新创建的 `workflowService`。

-   **`POST /api/workflows/upload`**: 接收上传的 `.json` 文件，调用 `workflowService.parseWorkflow`，并将解析后的结构化数据存入 MongoDB。返回包含 `workflowId` 和节点树的响应。
-   **`GET /api/workflows/:workflowId/cascader`**: 获取指定工作流用于参数绑定的 Cascader 数据结构，直接调用 `workflowService.getWorkflowAsCascader`。
-   **`POST /api/apps/:appId/run`**: 运行应用。接收包含 `uiBindings` 和表单输入的请求体，调用 `workflowService.constructExecutionPayload` 生成执行负载，然后通过 `axios` 将其发送到 ComfyUI 实例，并返回结果。

### 2.3 数据模型 (`/backend/models/`)

-   **`Workflow.js`**: 优化模型，增加 `nodesTree` (Object) 和 `cascaderData` (Object) 字段，用于缓存解析后的工作流结构和前端下拉菜单数据，避免重复计算。
-   **`App.js`**: 增加 `uiBindings` (Object) 和 `paramsSchema` (Object) 字段，用于存储画布的 UI 绑定关系和暴露给前端的参数结构。

---

## 3. 前端架构优化 (React/Vite)

### 3.1 引入全局状态管理 (Zustand)

为简化状态管理，推荐使用轻量级的 `Zustand`。

**创建 Store (`/frontend/src/store/`):**

-   **`useWorkflowStore`**: 管理当前加载的工作流数据，包括原始 JSON、解析后的节点树 (`nodesTree`) 和用于绑定的 `cascaderData`。
-   **`useAppBuilderStore`**: 管理应用构建器的状态，包括画布中的所有组件 (`components`)、UI 绑定关系 (`uiBindings`)、当前选中的组件 (`selectedComponent`) 等。

### 3.2 组件结构重构

对现有组件进行拆分和职责重组。

-   **`AppBuilder` (容器组件)**: 作为顶层协调器，负责整合 `WorkflowUploader`、`AppConfigForm` 和 `PageBuilder`，并处理它们之间的通信（通过 Store）。
-   **`WorkflowUploader` (功能组件)**: 仅负责文件上传逻辑。上传成功后，调用 `useWorkflowStore` 的 action 更新全局状态。
-   **`AppConfigForm` (配置表单)**: 从 `useWorkflowStore` 获取 `cascaderData`，渲染树形下拉选择器。用户完成参数映射配置后，更新 `useAppBuilderStore` 中的 `paramsSchema`。
-   **`PageBuilder` (画布核心)**: 渲染画布和其中的 UI 组件。它从 `useAppBuilderStore` 获取画布组件列表。
-   **`PropertyPanel` (属性面板)**: 当用户在 `PageBuilder` 中选中一个组件时，此面板显示其属性。其中的“绑定工作流参数”字段同样使用 `useWorkflowStore` 中的 `cascaderData` 来渲染下拉树。绑定操作会更新 `useAppBuilderStore` 中的 `uiBindings`。
-   **`ParameterCascader` (原子组件)**: 创建一个可复用的树形下拉选择器组件，接收 `data` 和 `onChange` props，供 `AppConfigForm` 和 `PropertyPanel` 使用。

### 3.3 数据流与交互逻辑

1.  **上传与解析**: `WorkflowUploader` 上传文件 -> 后端解析并返回 `nodesTree` 和 `cascaderData` -> `useWorkflowStore` 更新状态。
2.  **应用配置**: `AppConfigForm` 从 `useWorkflowStore` 读取 `cascaderData` -> 用户配置参数映射 -> 更新 `useAppBuilderStore` 的 `paramsSchema`。
3.  **画布搭建**: 用户从工具栏拖拽组件到 `PageBuilder` -> `useAppBuilderStore` 添加新组件 -> 用户选中组件，`PropertyPanel` 显示属性 -> 用户在 `PropertyPanel` 中使用 `ParameterCascader` 绑定参数 -> 更新 `useAppBuilderStore` 的 `uiBindings`。
4.  **运行与预览**: `AppRunner` 组件收集用户在画布中输入的值，并结合 `useAppBuilderStore` 中的 `uiBindings` -> 调用后端 `POST /api/apps/:appId/run` API -> 显示结果。

---

## 4. 遗漏需求补充与功能修复

-   **实时校验与提示**: 在 `AppConfigForm` 和 `PropertyPanel` 中增加实时校验逻辑。当用户选择一个参数进行绑定后，立即检查该参数是否已被其他组件绑定，并给出提示。
-   **解除绑定功能**: 在 `PropertyPanel` 中，为已绑定的参数提供一个“解除绑定”按钮。
-   **画布状态持久化**: 利用 `localStorage` 或后端 API，在用户刷新页面或下次访问时，能够恢复画布的布局、组件和绑定状态。
-   **错误边界 (Error Boundaries)**: 在 React 组件树的关键位置（如 `PageBuilder`、`AppRunner`）添加错误边界，防止单个组件的渲染错误导致整个应用崩溃，并向用户提供友好的错误提示。

通过以上架构优化和代码重构，`canvas2.0` 项目将变得更加结构化、可扩展，并能更好地满足文档中描述的复杂交互需求。

