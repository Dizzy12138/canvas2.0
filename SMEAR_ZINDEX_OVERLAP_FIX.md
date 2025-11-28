# 涂抹工具 Z-Index 遮挡修复

## 问题诊断

根据调试日志：
```
✅ handleUp 被触发，路径点数: 15
✅ 生成最终预览，长度: 2214498
✅ 更新 session 状态为 ready
✅ previewImageUrl: 有, bounds: 有, session.status: ready
```

**所有数据都正常！** 但用户看不到遮罩。

## 根本原因

### Z-Index 层级遮挡

**元素层级结构**:
```html
<div className="canvas-container">
  <!-- 原始图片 (tldraw shape, opacity: 0.01) -->
  
  <!-- 预览层 (zIndex: 998) -->
  <div style="zIndex: 998">
    <img src={previewImageUrl} />  <!-- 黑色半透明遮罩图像 -->
  </div>
  
  <!-- 涂抹画布区域 (zIndex: 1000) -->
  <div style="zIndex: 1000, pointer-events: auto">
    <!-- 这层会遮挡预览层！❌ -->
  </div>
</div>
```

**问题**:
1. 预览层 zIndex = 998
2. 涂抹画布 zIndex = 1000（更高）
3. 涂抹画布遮挡了预览层
4. 虽然 `previewImageUrl` 有数据，但被遮挡看不见

**为什么绘制时能看到**:
- 绘制时，预览图像会实时更新
- 用户正在交互，注意力在鼠标上
- 即使被部分遮挡，仍能感觉到变化

**为什么松开后看不见**:
- 松开鼠标后，预览图像不再更新
- 涂抹画布（zIndex:1000）完全遮挡了预览层（zIndex:998）
- 用户看到的是空白的涂抹画布，而不是预览图像

## 修复方案

### 条件渲染涂抹画布

**修复前**:
```jsx
{/* 涂抹画布区域 - 始终存在 */}
<div
  className="absolute inset-0 pointer-events-auto"
  style={{ 
    zIndex: 1000,  // ❌ 始终遮挡预览层
    cursor: '...'
  }}
  onPointerDown={handlePointerDown}
/>
```

**修复后**:
```jsx
{/* 涂抹画布区域 - 只在绘制时存在 */}
{session.status !== 'ready' && (
  <div
    className="absolute inset-0 pointer-events-auto"
    style={{ 
      zIndex: 1000,
      cursor: '...'
    }}
    onPointerDown={handlePointerDown}
  />
)}
```

**关键改进**:
- ✅ 只在 `session.status !== 'ready'` 时渲染涂抹画布
- ✅ 当 `status === 'ready'` 时，移除涂抹画布
- ✅ 预览层不再被遮挡
- ✅ 黑色半透明遮罩可见

## 状态与层级对应

### status = 'drawing'（绘制中）

```
层级结构:
  原始图片 (opacity: 0.01) - 几乎透明
  预览层 (zIndex: 998) - 实时更新的预览图像
  涂抹画布 (zIndex: 1000) - 捕获鼠标事件 ✅
  控制栏 (zIndex: 9999) - 笔刷大小控制
```

**交互**:
- 用户在涂抹画布上绘制
- 鼠标事件被捕获
- 预览层实时更新
- 用户看到黑色半透明路径

### status = 'ready'（绘制完成）

**修复前**:
```
层级结构:
  原始图片 (opacity: 0.01) - 几乎透明
  预览层 (zIndex: 998) - 最终预览图像 ❌ 被遮挡
  涂抹画布 (zIndex: 1000) - 空白 ❌ 遮挡预览
  控制栏 (zIndex: 9999) - 保留/擦除按钮
```

**问题**: 预览层被涂抹画布遮挡

**修复后**:
```
层级结构:
  原始图片 (opacity: 0.01) - 几乎透明
  预览层 (zIndex: 998) - 最终预览图像 ✅ 可见
  涂抹画布 - 不渲染 ✅
  控制栏 (zIndex: 9999) - 保留/擦除按钮
```

**效果**: 预览层可见，遮罩显示

## 完整工作流程

```
1. 点击"涂抹"
   → session.status = 'drawing'
   → 渲染涂抹画布 (zIndex: 1000) ✅
   ↓
2. 绘制路径
   → handleMove → updateRealtimePreview
   → 预览层更新 (zIndex: 998)
   → 用户看到实时预览 ✅
   ↓
3. 松开鼠标
   → handleUp
   → 生成最终预览 ✅
   → session.status = 'ready' ✅
   → 涂抹画布不再渲染 ✅
   ↓
4. 渲染
   → 原始图片 (opacity: 0.01)
   → 预览层 (zIndex: 998) ✅ 没有遮挡
   → 控制栏 (zIndex: 9999)
   ↓
5. 用户看到
   → 黑色半透明遮罩 ✅
   → "保留/擦除/取消"按钮 ✅
```

## 测试验证

### 测试场景

```
1. 上传图片
2. 点击"涂抹"
3. 绘制路径
   预期: 实时看到黑色半透明轨迹 ✅
   实际: 实时显示 ✅
4. 松开鼠标
   预期: 黑色轨迹持续显示 ✅
   实际: 现在应该能看到了！✅
5. 看到"保留"/"擦除"/"取消"按钮 ✅
```

## 代码对比

### 修复前

```jsx
{/* 预览层 */}
<div style={{ zIndex: 998 }}>
  <img src={previewImageUrl} />
</div>

{/* 涂抹画布 - 始终存在 */}
<div style={{ zIndex: 1000 }}>
  <!-- 空白 div，遮挡预览层 ❌ -->
</div>
```

### 修复后

```jsx
{/* 预览层 */}
<div style={{ zIndex: 998 }}>
  <img src={previewImageUrl} />
</div>

{/* 涂抹画布 - 条件渲染 */}
{session.status !== 'ready' && (
  <div style={{ zIndex: 1000 }}>
    <!-- 只在绘制时存在 ✅ -->
  </div>
)}
```

## 相关修复

- [涂抹预览内联修复](./SMEAR_PREVIEW_INLINE_FIX.md) - 内联生成预览
- [涂抹变量冲突修复](./SMEAR_VARIABLE_CONFLICT_FIX.md) - brushPx 重复声明
- **本次修复** - Z-Index 遮挡问题

---

**修复时间**: 2024-11-26  
**版本**: 2.0.20  
**状态**: ✅ 已修复  
**关键**: 条件渲染涂抹画布，避免遮挡预览层

