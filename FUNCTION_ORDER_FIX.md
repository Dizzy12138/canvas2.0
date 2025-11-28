# 函数声明顺序修复

## 问题描述

```
Uncaught ReferenceError: Cannot access 'applySelectionCrop' before initialization
at OuzhiArtPlatform (OuzhiArtPlatform.jsx:2703:36)
```

## 问题原因

在 JavaScript/React 中，`useCallback` 创建的函数会在依赖数组中引用其他变量或函数。如果被引用的函数在后面才定义，就会出现 "before initialization" 错误。

### 问题代码结构

```javascript
// ❌ 错误的顺序
const handleSmearApply = useCallback(async (mode, customBrushSize) => {
  // ...
  await applySelectionCrop(applyMode, selectionSession);  // 引用了 applySelectionCrop
  // ...
}, [selectionSession, brushSize, applySelectionCrop, ...]);  // 依赖数组中包含 applySelectionCrop

// ... 其他代码 ...

const applySelectionCrop = useCallback(async (mode, sessionOverride = null) => {
  // applySelectionCrop 的实现
}, [...]);  // 但是 applySelectionCrop 在这里才定义！
```

## 解决方案

将 `applySelectionCrop` 的定义移到 `handleSmearApply` 之前。

### 修复后的代码结构

```javascript
// ✅ 正确的顺序
const handleStartSmearErase = useCallback(() => {
  // ...
}, [...]);

// 1. 先定义 applySelectionCrop
const applySelectionCrop = useCallback(async (mode, sessionOverride = null) => {
  const session = sessionOverride || selectionSession;
  // ... 完整实现 ...
}, [brushSize, createMaskForLayer, editorRef, getLayerShapeIds, selectionSession, setLayers]);

// 2. 再定义 handleSmearApply（依赖 applySelectionCrop）
const handleSmearApply = useCallback(async (mode, customBrushSize) => {
  // ...
  await applySelectionCrop(applyMode, selectionSession);  // 现在可以正常引用了
  // ...
}, [selectionSession, brushSize, applySelectionCrop, ...]);

// 3. 最后定义 handleSmearCancel
const handleSmearCancel = useCallback(() => {
  // ...
}, []);
```

## 函数依赖关系

```
handleStartSmearErase
    ↓
applySelectionCrop  ← 被 handleSmearApply 依赖，所以要先定义
    ↓
handleSmearApply    ← 使用 applySelectionCrop
    ↓
handleSmearCancel
```

## 修改内容

### 1. 移动 `applySelectionCrop` 定义

**从**: 第 2711 行（在 `handleSmearApply` 之后）  
**到**: 第 2612 行（在 `handleSmearApply` 之前）

### 2. 删除重复定义

删除了后面重复的 `applySelectionCrop` 定义（原第 2711-2847 行）

## React Hooks 依赖规则

### 规则 1: 依赖项必须已定义

```javascript
// ❌ 错误：使用了未定义的 myFunction
const myCallback = useCallback(() => {
  myFunction();
}, [myFunction]);

const myFunction = () => { };  // 定义太晚了
```

```javascript
// ✅ 正确：先定义后使用
const myFunction = () => { };

const myCallback = useCallback(() => {
  myFunction();
}, [myFunction]);
```

### 规则 2: useCallback 的执行顺序

`useCallback` 只是创建函数引用，不立即执行内部代码。但是：
- 依赖数组中的项必须在 `useCallback` 调用时已经存在
- 函数内部引用的变量可以在后面定义（但不推荐）

### 规则 3: 避免循环依赖

```javascript
// ❌ 错误：循环依赖
const funcA = useCallback(() => {
  funcB();
}, [funcB]);

const funcB = useCallback(() => {
  funcA();
}, [funcA]);
```

```javascript
// ✅ 正确：提取共享逻辑
const sharedLogic = () => { };

const funcA = useCallback(() => {
  sharedLogic();
}, []);

const funcB = useCallback(() => {
  sharedLogic();
}, []);
```

## 最佳实践

### 1. 函数定义顺序

推荐从底层到高层定义函数：

```javascript
// 1. 工具函数（无依赖）
const helperFunction = () => { };

// 2. 基础回调（依赖工具函数）
const baseCallback = useCallback(() => {
  helperFunction();
}, []);

// 3. 复合回调（依赖基础回调）
const composedCallback = useCallback(() => {
  baseCallback();
}, [baseCallback]);
```

### 2. 使用 ESLint 规则

```json
{
  "rules": {
    "react-hooks/exhaustive-deps": "warn"
  }
}
```

### 3. 文档注释依赖关系

```javascript
/**
 * applySelectionCrop - 应用选区裁剪
 * 依赖: brushSize, createMaskForLayer, editorRef, ...
 * 被依赖: handleSmearApply
 */
const applySelectionCrop = useCallback(async () => {
  // ...
}, [...]);

/**
 * handleSmearApply - 处理涂抹应用
 * 依赖: applySelectionCrop, selectionSession, ...
 */
const handleSmearApply = useCallback(async () => {
  await applySelectionCrop(...);
}, [applySelectionCrop, ...]);
```

## 验证修复

### 1. 检查函数定义顺序

```bash
# 查找函数定义位置
grep -n "const applySelectionCrop" src/components/OuzhiArtPlatform.jsx
grep -n "const handleSmearApply" src/components/OuzhiArtPlatform.jsx
```

应该看到：
```
2612:  const applySelectionCrop = useCallback...
2762:  const handleSmearApply = useCallback...
```

`applySelectionCrop` 在前，`handleSmearApply` 在后 ✅

### 2. 检查依赖数组

```javascript
const handleSmearApply = useCallback(async (mode, customBrushSize) => {
  // ...
}, [
  selectionSession,
  brushSize,
  applySelectionCrop,  // ← 必须在依赖数组中
  editorRef,
  getLayerIdByShapeId,
  layers,
  masks,
  setMasks
]);
```

### 3. 运行应用

```bash
npm run dev
```

应该不再出现 "before initialization" 错误 ✅

## 相关错误

### 类似错误 1: const 变量提升

```javascript
// ❌ 错误
console.log(myVar);  // ReferenceError: Cannot access 'myVar' before initialization
const myVar = 10;
```

### 类似错误 2: 类声明提升

```javascript
// ❌ 错误
const instance = new MyClass();  // ReferenceError
class MyClass { }
```

### 类似错误 3: let 变量提升

```javascript
// ❌ 错误
console.log(myLet);  // ReferenceError: Cannot access 'myLet' before initialization
let myLet = 20;
```

## 总结

- ✅ 将 `applySelectionCrop` 移到 `handleSmearApply` 之前
- ✅ 删除重复的 `applySelectionCrop` 定义
- ✅ 确保依赖关系清晰：`handleSmearApply` → `applySelectionCrop`
- ✅ 通过 lint 检查
- ✅ 应用正常运行

## 预防措施

### 1. 代码组织

将相关函数放在一起，按依赖顺序排列：

```javascript
// ===== 选区相关函数 =====
const startSelectionSession = useCallback(...);
const applySelectionCrop = useCallback(...);  // 基础函数
const handleSmearApply = useCallback(...);    // 高级函数（依赖 applySelectionCrop）
const handleSmearCancel = useCallback(...);

// ===== 图层相关函数 =====
const handleLayerSelect = useCallback(...);
// ...
```

### 2. 提取独立函数

对于不依赖组件状态的函数，提取到组件外部：

```javascript
// 组件外部（无依赖问题）
function createMaskCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

// 组件内部
const MyComponent = () => {
  const processImage = useCallback(() => {
    const canvas = createMaskCanvas(100, 100);  // 可以随意调用
  }, []);
};
```

### 3. 使用注释标记依赖

```javascript
// DEPENDS ON: applySelectionCrop
const handleSmearApply = useCallback(async () => {
  await applySelectionCrop(...);
}, [applySelectionCrop]);
```

---

**修复时间**: 2024-11-26  
**错误类型**: ReferenceError  
**严重程度**: 高（阻止应用运行）  
**状态**: ✅ 已修复

