# 涂抹连续轨迹和效果保留修复

## 问题描述

用户反馈两个问题：

### 问题 1: 涂抹轨迹是点状的
- 涂抹时显示为一系列分散的圆点 ● ● ● ●
- 缺少连接线，看起来不连续
- 需要完整的轨迹效果

### 问题 2: 完成后效果被清空
- 点击"完成"按钮后，涂抹效果消失
- 图片恢复为原始状态
- 应该保留已应用的涂抹效果

## 解决方案

### 修复 1: 连续轨迹绘制

#### 之前的问题

```javascript
// 只绘制孤立的圆点
points.forEach((point) => {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
});

// 结果: ● ● ● ● (点状)
```

#### 修复后

```javascript
// 先绘制连接的路径
ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
ctx.lineWidth = brushPx;
ctx.lineCap = 'round';
ctx.lineJoin = 'round';

ctx.beginPath();
points.forEach((point, index) => {
  const x = point.x * img.width;
  const y = point.y * img.height;
  
  if (index === 0) {
    ctx.moveTo(x, y);
  } else {
    ctx.lineTo(x, y);
  }
});
ctx.stroke();  // 绘制连接线

// 再在每个点绘制圆形，使路径更平滑
points.forEach((point) => {
  ctx.beginPath();
  ctx.arc(x, y, brushPx / 2, 0, Math.PI * 2);
  ctx.fill();
});

// 结果: ●━●━●━● (连续轨迹)
```

**关键点**:
1. 使用 `lineTo()` 连接各个点
2. 设置 `lineCap: 'round'` 和 `lineJoin: 'round'` 使线条圆滑
3. 先绘制路径，再绘制端点圆形

### 修复 2: 保留涂抹效果

#### 之前的问题

```javascript
// 应用后重新加载原始图像
await onApply(finalImageUrl);

// 从 asset 重新加载图像
img.src = asset.props.src;  // ❌ 加载的是原始图像
setPreviewImageUrl(canvas.toDataURL());  // ❌ 覆盖了涂抹效果
```

**问题**: 重新加载会覆盖已应用的涂抹效果

#### 修复后

```javascript
// 应用擦除后的图像
const finalImageUrl = resultCanvas.toDataURL('image/png');
await onApply(eraseMode, brushSize, finalImageUrl);

// 直接使用擦除后的图像作为新起点
canvasRef.current = resultCanvas;  // ✅ 使用结果画布
setPreviewImageUrl(finalImageUrl);  // ✅ 保留涂抹效果
```

**关键**: 不重新加载，直接使用擦除后的结果作为下次涂抹的基础

## 技术细节

### 1. 连续路径绘制

```javascript
// 设置路径样式
ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';  // 黑色 50% 透明
ctx.lineWidth = brushPx;                  // 笔刷宽度
ctx.lineCap = 'round';                    // 圆形端点
ctx.lineJoin = 'round';                   // 圆形连接

// 绘制路径
ctx.beginPath();
points.forEach((point, index) => {
  if (index === 0) {
    ctx.moveTo(x, y);   // 起点
  } else {
    ctx.lineTo(x, y);   // 连接到下一点
  }
});
ctx.stroke();  // 描边路径
```

**视觉效果**:
```
moveTo(A) → lineTo(B) → lineTo(C) → lineTo(D)
   A━━━━━B━━━━━C━━━━━D
```

### 2. 平滑端点处理

```javascript
// 在每个点绘制圆形，填补间隙
points.forEach((point) => {
  ctx.beginPath();
  ctx.arc(x, y, brushPx / 2, 0, Math.PI * 2);
  ctx.fill();
});
```

**作用**: 确保路径转角和端点平滑

```
只有路径:     路径 + 端点:
A━━━B         A●━━━●B
 ╲            ╲●
  ╲            ╲●
   C            ●C
```

### 3. 状态管理

```javascript
// 预览时
canvasRef.current = 初始画布
previewImageUrl = 原图 + 黑色轨迹

// 应用后
canvasRef.current = 擦除后的画布  // 作为下次起点
previewImageUrl = 擦除后的图像    // 保留效果

// 下次涂抹
从 canvasRef.current 开始
继续在擦除后的图像上涂抹
```

## 工作流程

### 完整流程

```
1. 第一次涂抹
   原图 → 涂抹黑色轨迹 → 松开鼠标 → 应用擦除 → 图像A

2. 第二次涂抹
   图像A → 涂抹黑色轨迹 → 松开鼠标 → 应用擦除 → 图像B

3. 点击"完成"
   图像B → 恢复透明度 → 退出涂抹模式 → 保留图像B ✅
```

### 状态转换

```
初始状态:
├─ canvasRef: null
├─ previewImageUrl: null
└─ opacity: 1

进入涂抹模式:
├─ canvasRef: 原始画布
├─ previewImageUrl: 原始图像
└─ opacity: 0.01

涂抹中:
├─ canvasRef: 原始画布
├─ previewImageUrl: 原图 + 黑色轨迹
└─ opacity: 0.01

应用后:
├─ canvasRef: 擦除后画布  ← 新起点
├─ previewImageUrl: 擦除后图像  ← 保留效果
└─ opacity: 0.01

退出涂抹模式:
├─ canvasRef: null
├─ previewImageUrl: null
└─ opacity: 1  ← 恢复，但图像已是擦除后的
```

## 视觉效果对比

### 问题 1 修复前后

**修复前（点状）**:
```
● ● ● ● ●
    ● ●
      ●
```

**修复后（连续）**:
```
●━●━●━●━●
    ╲●━●
      ╲●
```

### 问题 2 修复前后

**修复前（效果丢失）**:
```
涂抹 → 应用 → 完成 → [原始图像] ❌
```

**修复后（效果保留）**:
```
涂抹 → 应用 → 完成 → [擦除后图像] ✅
```

## 测试验证

### 测试步骤

1. **测试连续轨迹**
   ```
   选中图片 → 点击"涂抹"
   在图片上绘制曲线
   预期: 显示连续的黑色半透明轨迹（不是点状）
   ```

2. **测试效果保留**
   ```
   涂抹后松开鼠标
   预期: 效果应用，轨迹变为真正的擦除
   
   再次涂抹
   预期: 在擦除后的图像上继续涂抹
   
   点击"完成"
   预期: 退出涂抹模式，保留所有擦除效果
   ```

3. **测试多次涂抹**
   ```
   涂抹 → 松开 → 再涂抹 → 松开 → 再涂抹 → 完成
   预期: 
   - 每次涂抹都显示连续轨迹
   - 每次松开都应用效果
   - 效果累积保留
   - 最后完成时，所有效果都在
   ```

### 预期结果

- ✅ 涂抹轨迹连续平滑（不是点状）
- ✅ 路径转角圆滑
- ✅ 松开鼠标应用效果
- ✅ 可以继续涂抹（基于上次结果）
- ✅ 点击完成后效果保留
- ✅ 多次涂抹效果累积

## 代码对比

### 涂抹预览

**修复前**:
```javascript
points.forEach((point) => {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
});
```

**修复后**:
```javascript
// 绘制连接线
ctx.beginPath();
points.forEach((point, index) => {
  if (index === 0) ctx.moveTo(x, y);
  else ctx.lineTo(x, y);
});
ctx.stroke();

// 绘制端点
points.forEach((point) => {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
});
```

### 效果保留

**修复前**:
```javascript
await onApply(finalImageUrl);

// 重新加载原始图像
img.src = asset.props.src;  // ❌
setPreviewImageUrl(newCanvas.toDataURL());  // ❌
```

**修复后**:
```javascript
await onApply(finalImageUrl);

// 直接使用结果
canvasRef.current = resultCanvas;  // ✅
setPreviewImageUrl(finalImageUrl);  // ✅
```

## 性能优化

### 1. 路径优化

```javascript
// 使用单个 beginPath 绘制整个路径
ctx.beginPath();
points.forEach(...);
ctx.stroke();

// 而不是每个点都 beginPath
```

### 2. Canvas 复用

```javascript
// 直接复用结果画布
canvasRef.current = resultCanvas;

// 而不是创建新画布
```

### 3. 减少图像加载

```javascript
// 不重新加载图像
// 直接使用内存中的 canvas
```

## 相关文档

- [直接涂抹效果修复](./SMEAR_DIRECT_FIX.md)
- [实时涂抹工具重构](./REALTIME_SMEAR_FIX.md)
- [所有修复总结](./ALL_FIXES_SUMMARY.md)

---

**修复时间**: 2024-11-26  
**版本**: 2.0.9  
**状态**: ✅ 已修复  
**改进**: 连续轨迹 + 效果保留

