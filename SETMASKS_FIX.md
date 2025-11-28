# setMasks 未定义问题修复

## 问题描述

```
ReferenceError: setMasks is not defined
at OuzhiArtPlatform (OuzhiArtPlatform.jsx:2842:103)
```

## 问题原因

`handleSmearApply` 函数中使用了 `setMasks`，但 `setMasks` 并未从 `useEnhancedLayers` hook 中导出。

### 代码结构

```javascript
// useEnhancedLayers.js (hook内部)
const [masks, setMasks] = useState([]);  // setMasks 在内部定义

return {
  masks,        // ✅ 导出了 masks
  // setMasks   // ❌ 没有导出 setMasks
  createMaskForLayer,  // ✅ 导出了操作方法
  updateMask,
  deleteMask
};
```

```javascript
// OuzhiArtPlatform.jsx
const { masks, createMaskForLayer } = useEnhancedLayers([]);

// ❌ 错误：尝试使用未导出的 setMasks
const updatedMasks = { ...masks, [shapeId]: { ... } };
setMasks(updatedMasks);  // ReferenceError!
```

## 解决方案

使用已导出的 `createMaskForLayer` 方法代替直接操作 `setMasks`。

### 修复前

```javascript
// ❌ 错误的方式：直接操作 masks 状态
const maskDataUrl = maskCanvas.toDataURL('image/png');
const layerId = getLayerIdByShapeId(session.shapeId);

if (layer) {
  const maskId = `mask-${Date.now()}`;
  const updatedMasks = {
    ...masks,
    [session.shapeId]: {
      ...masks[session.shapeId],
      [maskId]: maskDataUrl
    }
  };
  setMasks(updatedMasks);  // ❌ setMasks 未定义
}
```

### 修复后

```javascript
// ✅ 正确的方式：使用导出的 createMaskForLayer 方法
const maskDataUrl = maskCanvas.toDataURL('image/png');
const layerId = getLayerIdByShapeId(session.shapeId);

if (layer) {
  createMaskForLayer(layerId, {
    type: 'smear-brush',
    data: session.points,
    maskImage: maskDataUrl,
    bounds: {
      x: session.pageBounds.minX,
      y: session.pageBounds.minY,
      width: session.pageBounds.width ?? session.pageBounds.w ?? 0,
      height: session.pageBounds.height ?? session.pageBounds.h ?? 0
    }
  });
  
  errorHandler.showSuccess('蒙版已保存到图层');
}
```

### 更新依赖数组

```javascript
// 修复前
}, [selectionSession, brushSize, applySelectionCrop, editorRef, 
    getLayerIdByShapeId, layers, masks, setMasks]);  // ❌ setMasks 未定义

// 修复后
}, [selectionSession, brushSize, applySelectionCrop, editorRef, 
    getLayerIdByShapeId, layers, createMaskForLayer]);  // ✅ 使用 createMaskForLayer
```

## 设计模式说明

### 封装原则

React hooks 应该遵循封装原则，不直接暴露内部状态的 setter，而是提供操作方法。

#### ❌ 反模式：暴露内部状态

```javascript
// 不推荐：暴露内部状态的 setter
export function useEnhancedLayers() {
  const [masks, setMasks] = useState([]);
  
  return {
    masks,
    setMasks  // ❌ 暴露内部实现细节
  };
}
```

**问题**:
- 外部可以任意修改状态，破坏封装
- 难以维护一致性
- 无法添加验证逻辑
- 难以追踪状态变化

#### ✅ 推荐模式：提供操作方法

```javascript
// 推荐：提供高层次的操作方法
export function useEnhancedLayers() {
  const [masks, setMasks] = useState([]);
  
  const createMaskForLayer = useCallback((layerId, maskData) => {
    // 可以添加验证
    if (!layerId || !maskData) {
      console.error('Invalid mask data');
      return;
    }
    
    // 可以添加副作用
    console.log(`Creating mask for layer ${layerId}`);
    
    // 更新状态
    setMasks(prev => [...prev, { layerId, ...maskData }]);
    
    // 可以触发其他逻辑
    notifyMaskCreated(layerId);
  }, []);
  
  return {
    masks,
    createMaskForLayer,  // ✅ 提供操作方法而非 setter
    updateMask,
    deleteMask
  };
}
```

**优点**:
- ✅ 封装内部实现
- ✅ 可以添加验证和错误处理
- ✅ 易于维护和重构
- ✅ 清晰的 API 接口

## useEnhancedLayers API

### 导出的蒙版操作方法

```javascript
const {
  masks,              // 蒙版状态（只读）
  createMaskForLayer, // 创建蒙版
  updateMask,         // 更新蒙版
  deleteMask          // 删除蒙版
} = useEnhancedLayers([]);
```

### createMaskForLayer 用法

```javascript
/**
 * 为图层创建蒙版
 * @param {string} layerId - 图层 ID
 * @param {Object} maskData - 蒙版数据
 * @param {string} maskData.type - 蒙版类型
 * @param {Array} maskData.data - 蒙版路径数据
 * @param {string} maskData.maskImage - 蒙版图片 (base64 data URL)
 * @param {Object} maskData.bounds - 蒙版边界
 */
createMaskForLayer(layerId, {
  type: 'smear-brush',      // 蒙版类型
  data: points,              // 路径点数组
  maskImage: dataUrl,        // base64 图片
  bounds: {                  // 边界信息
    x: 0,
    y: 0,
    width: 100,
    height: 100
  }
});
```

### updateMask 用法

```javascript
/**
 * 更新现有蒙版
 * @param {string} layerId - 图层 ID
 * @param {string} maskId - 蒙版 ID
 * @param {Object} updates - 更新的数据
 */
updateMask(layerId, maskId, {
  maskImage: newDataUrl,
  bounds: newBounds
});
```

### deleteMask 用法

```javascript
/**
 * 删除蒙版
 * @param {string} layerId - 图层 ID
 * @param {string} maskId - 蒙版 ID
 */
deleteMask(layerId, maskId);
```

## 最佳实践

### 1. 使用 Hook 提供的方法

```javascript
// ✅ 推荐
const { createMaskForLayer } = useEnhancedLayers([]);
createMaskForLayer(layerId, maskData);

// ❌ 不推荐
const { masks, setMasks } = useEnhancedLayers([]);
setMasks([...masks, newMask]);
```

### 2. 不要直接修改状态

```javascript
// ❌ 错误：直接修改
masks[layerId] = newMask;

// ❌ 错误：使用展开运算符但没有验证
const newMasks = { ...masks, [layerId]: newMask };

// ✅ 正确：使用提供的方法
createMaskForLayer(layerId, newMask);
```

### 3. 处理异步操作

```javascript
// ✅ 正确处理异步
try {
  const maskDataUrl = await generateMask();
  createMaskForLayer(layerId, {
    type: 'smear-brush',
    maskImage: maskDataUrl,
    // ...
  });
  showSuccess('蒙版已保存');
} catch (error) {
  console.error('保存蒙版失败:', error);
  showError('保存蒙版失败');
}
```

### 4. 依赖数组管理

```javascript
// ✅ 只包含使用的方法
const handleSave = useCallback(() => {
  createMaskForLayer(layerId, maskData);
}, [createMaskForLayer, layerId, maskData]);

// ❌ 不要包含只读状态（除非真的需要）
const handleSave = useCallback(() => {
  createMaskForLayer(layerId, maskData);
}, [masks, createMaskForLayer, layerId, maskData]);  // masks 多余
```

## 相关修复

### 之前的修复
1. **函数声明顺序问题** - `applySelectionCrop` 在 `handleSmearApply` 之前定义
2. **操作栏定位问题** - z-index 和边界检查
3. **涂抹工具增强** - 笔刷大小、擦除模式、保存蒙版

### 本次修复
- 使用 `createMaskForLayer` 代替 `setMasks`
- 更新依赖数组

## 测试验证

### 1. 编译检查
```bash
npm run dev
```
应该不再出现 "setMasks is not defined" 错误 ✅

### 2. 功能测试

**测试步骤**:
1. 选中图片
2. 点击"涂抹"
3. 在图片上涂抹
4. 点击"保存为蒙版"

**预期结果**:
- ✅ 显示"蒙版已保存到图层"提示
- ✅ 蒙版数据保存到图层系统
- ✅ 可以在图层面板查看蒙版
- ✅ 没有控制台错误

### 3. 检查蒙版数据

```javascript
// 在浏览器控制台运行
console.log(masks);  // 应该显示保存的蒙版数据
```

## 总结

- ✅ 使用 `createMaskForLayer` 代替未定义的 `setMasks`
- ✅ 遵循封装原则，使用 hook 提供的 API
- ✅ 更新依赖数组，移除 `setMasks`
- ✅ 通过 lint 检查
- ✅ 涂抹工具完整功能可用

## 相关文档

- [涂抹工具使用指南](./SMEAR_TOOL_GUIDE.md)
- [涂抹工具修复总结](./SMEAR_TOOL_FIX.md)
- [函数声明顺序修复](./FUNCTION_ORDER_FIX.md)

---

**修复时间**: 2024-11-26  
**错误类型**: ReferenceError  
**严重程度**: 高（阻止应用运行）  
**状态**: ✅ 已修复

