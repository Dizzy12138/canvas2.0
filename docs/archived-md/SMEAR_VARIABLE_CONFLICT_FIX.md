# 涂抹工具变量冲突修复

## 问题描述

构建错误：
```
ERROR: The symbol "brushPx" has already been declared
/root/canvas2.0/src/components/OuzhiArtPlatform.jsx:582:14
```

## 根本原因

在 `handleUp` 函数中，`brushPx` 变量被声明了两次：

```javascript
const handleUp = async (event) => {
  // ...
  
  // 第一次声明（用于 mask canvas）
  const brushPx = brushSize * (canvas.width / (session.pageBounds.width || 1));
  maskCtx.lineWidth = brushPx * 2;
  
  // ... 中间的代码 ...
  
  // 第二次声明（用于 preview canvas）❌ 重复声明！
  const brushPx = brushSize * (canvas.width / (session.pageBounds.width || 1));
  previewCtx.lineWidth = brushPx * 2;
};
```

**问题**: 在同一作用域中不能重复声明 `const` 变量

## 修复方案

移除第二次声明，重用第一次计算的值：

```javascript
const handleUp = async (event) => {
  // ...
  
  // 第一次声明（用于 mask canvas）
  const brushPx = brushSize * (canvas.width / (session.pageBounds.width || 1));
  maskCtx.lineWidth = brushPx * 2;
  
  // ... 中间的代码 ...
  
  // ✅ 重用之前的 brushPx
  previewCtx.lineWidth = brushPx * 2;
};
```

## 代码对比

### 修复前

```javascript
// 生成 mask
const brushPx = brushSize * (canvas.width / (session.pageBounds.width || 1));
maskCtx.lineWidth = brushPx * 2;
// ...

// 生成预览
const brushPx = brushSize * (canvas.width / (session.pageBounds.width || 1));  // ❌ 重复声明
previewCtx.lineWidth = brushPx * 2;
```

### 修复后

```javascript
// 生成 mask
const brushPx = brushSize * (canvas.width / (session.pageBounds.width || 1));
maskCtx.lineWidth = brushPx * 2;
// ...

// 生成预览（重用 brushPx）
previewCtx.lineWidth = brushPx * 2;  // ✅ 重用变量
```

## 验证

构建成功：
```bash
✓ 2592 modules transformed.
✓ built in 15.13s
```

---

**修复时间**: 2024-11-26  
**版本**: 2.0.19  
**状态**: ✅ 已修复  
**关键**: 移除重复的 const 声明

