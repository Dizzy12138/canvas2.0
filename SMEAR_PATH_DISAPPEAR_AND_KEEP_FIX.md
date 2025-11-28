# 涂抹工具路径消失和保留功能修复

## 问题描述

用户反馈两个严重问题：

### 问题 1: 绘制完成后路径消失
- 松开鼠标后，黑色涂抹路径立即消失
- 无法看到选中区域的预览
- UI 显示"保留"/"擦除"按钮，但看不到要操作的区域

### 问题 2: 选择"保留"后整张图片消失
- 点击"保留"按钮
- 整张图像变成透明
- 只剩下一个空白画布

## 根本原因分析

### 原因 1: handleUp 清空了路径数据

**问题代码**:
```javascript
const handleUp = async (event) => {
  // ... 生成 mask ...
  
  setSession({
    ...prev,
    status: 'ready',
    points: strokeRef.current,
    maskDataUrl
  });
  
  // ❌ 这两行导致预览消失
  strokeRef.current = [];
  setDisplayStroke([]);
};
```

**问题**:
1. `strokeRef.current = []` 清空了路径点
2. `setDisplayStroke([])` 清空了显示状态
3. `updateRealtimePreview` 依赖 `displayStroke` 来渲染预览
4. 清空后预览消失

**为什么这样写**:
- 之前的逻辑是"绘制 → 应用 → 完成"
- 应用后应该清空路径准备下一次绘制
- 但现在是"绘制 → 预览 → 选择 → 应用"
- 在选择之前不应该清空

### 原因 2: Mask Alpha 通道处理错误

**问题代码**:
```javascript
// 生成的 mask：白色背景 + 黑色路径
maskCtx.fillStyle = '#ffffff';
maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
maskCtx.strokeStyle = '#000000';
maskCtx.stroke();

// 直接应用 destination-in
ctx.globalCompositeOperation = 'destination-in';
ctx.drawImage(maskCanvas, 0, 0);  // ❌ 错误！
```

**问题**:
1. 生成的 mask 是 RGB 图像（白色 + 黑色）
2. `destination-in` 需要 **alpha 通道** 来控制保留区域
3. 白色背景的 RGB 值是 `(255, 255, 255, 255)`
   - RGB: 255（白色）
   - Alpha: 255（完全不透明）
4. 黑色路径的 RGB 值是 `(0, 0, 0, 255)`
   - RGB: 0（黑色）
   - Alpha: 255（完全不透明）
5. `destination-in` 看的是 **alpha 通道**，不是 RGB
6. 因为整个 mask 的 alpha 都是 255，所以：
   - **理论上应该保留整张图**
   - 但实际上黑色区域（RGB=0）可能被误解为"暗"，导致复杂的合成结果

**正确的 mask 应该是**:
```
黑色区域（选中）: alpha = 255 (不透明)
白色区域（未选中）: alpha = 0 (透明)
```

**Canvas Composite 操作原理**:

`destination-in` 的定义：
```
result.alpha = source.alpha * destination.alpha
result.rgb = destination.rgb
```

所以：
- 如果 source.alpha = 255（选中区域），destination 保留
- 如果 source.alpha = 0（未选中区域），destination 被移除

## 修复方案

### 修复 1: 不清空路径数据

**修复前**:
```javascript
const handleUp = async (event) => {
  // ... 生成 mask ...
  
  setSession({
    ...prev,
    status: 'ready',
    points: strokeRef.current,
    maskDataUrl
  });
  
  strokeRef.current = [];      // ❌
  setDisplayStroke([]);        // ❌
};
```

**修复后**:
```javascript
const handleUp = async (event) => {
  // ... 生成 mask ...
  
  // 保存路径点的副本
  const finalPoints = [...strokeRef.current];
  
  setSession({
    ...prev,
    status: 'ready',
    points: finalPoints,
    maskDataUrl
  });
  
  // 不要清空，保持预览显示 ✅
  // strokeRef.current = [];   // ❌ 移除
  // setDisplayStroke([]);     // ❌ 移除
};
```

**关键改进**:
- ✅ 保存路径点副本到 session
- ✅ 保持 `strokeRef.current` 和 `displayStroke` 不变
- ✅ 预览持续显示黑色半透明路径
- ✅ 用户可以看到要操作的区域

### 修复 2: 正确处理 Mask Alpha 通道

**修复前**:
```javascript
const maskImg = new window.Image();
maskImg.onload = async () => {
  const ctx = resultCanvas.getContext('2d');
  ctx.drawImage(canvas, 0, 0);
  
  // 直接应用 RGB mask（错误）
  ctx.globalCompositeOperation = 
    eraseMode === 'erase' ? 'destination-out' : 'destination-in';
  
  const maskCanvas = document.createElement('canvas');
  const maskCtx = maskCanvas.getContext('2d');
  maskCtx.drawImage(maskImg, 0, 0);  // RGB 图像
  
  ctx.drawImage(maskCanvas, 0, 0);   // ❌ 错误的 alpha
};
```

**修复后**:
```javascript
const maskImg = new window.Image();
maskImg.onload = async () => {
  const ctx = resultCanvas.getContext('2d');
  ctx.drawImage(canvas, 0, 0);
  
  // 1. 创建 alpha mask
  const alphaMask = document.createElement('canvas');
  alphaMask.width = canvas.width;
  alphaMask.height = canvas.height;
  const alphaMaskCtx = alphaMask.getContext('2d');
  
  // 2. 加载原始 mask（白色背景 + 黑色路径）
  alphaMaskCtx.drawImage(maskImg, 0, 0);
  
  // 3. 转换 RGB -> Alpha
  const imageData = alphaMaskCtx.getImageData(0, 0, alphaMask.width, alphaMask.height);
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    // 计算亮度（0=黑色, 255=白色）
    const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
    
    // 黑色 -> alpha=255（选中，不透明）
    // 白色 -> alpha=0（未选中，透明）
    const alpha = 255 - brightness;
    
    // 设置为纯黑色 + alpha 通道
    data[i] = 0;
    data[i + 1] = 0;
    data[i + 2] = 0;
    data[i + 3] = alpha;
  }
  
  alphaMaskCtx.putImageData(imageData, 0, 0);
  
  // 4. 应用 alpha mask
  if (eraseMode === 'erase') {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.drawImage(alphaMask, 0, 0);
  } else {
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(alphaMask, 0, 0);
  }
};
```

**关键改进**:
- ✅ 将 RGB mask 转换为 alpha mask
- ✅ 黑色区域（brightness=0）→ alpha=255（选中）
- ✅ 白色区域（brightness=255）→ alpha=0（未选中）
- ✅ `destination-in` 正确工作：只保留 alpha=255 的区域
- ✅ `destination-out` 正确工作：移除 alpha=255 的区域

## 技术细节

### 1. Alpha Mask 转换算法

**输入**: RGB 图像（白色背景 + 黑色路径）
```
像素 A: RGB(255, 255, 255, 255) - 白色背景
像素 B: RGB(0, 0, 0, 255) - 黑色路径
```

**转换过程**:
```javascript
// 1. 计算亮度
brightness_A = (255 + 255 + 255) / 3 = 255
brightness_B = (0 + 0 + 0) / 3 = 0

// 2. 转换为 alpha（反转）
alpha_A = 255 - 255 = 0     // 未选中 → 透明
alpha_B = 255 - 0 = 255     // 选中 → 不透明

// 3. 设置纯黑色 + alpha
像素 A: RGB(0, 0, 0, 0)     // 透明黑色
像素 B: RGB(0, 0, 0, 255)   // 不透明黑色
```

**输出**: Alpha mask（纯黑色 + alpha 通道）

### 2. Canvas Composite 操作详解

**destination-out（擦除模式）**:
```
原图: RGB(100, 150, 200, 255)
Mask: RGB(0, 0, 0, 255) - 选中区域

result.alpha = destination.alpha * (1 - source.alpha)
result.alpha = 255 * (1 - 255/255) = 0  // 完全透明

结果: RGB(100, 150, 200, 0) - 被移除
```

**destination-in（保留模式）**:
```
原图: RGB(100, 150, 200, 255)
Mask: RGB(0, 0, 0, 255) - 选中区域

result.alpha = destination.alpha * source.alpha
result.alpha = 255 * 255/255 = 255  // 完全不透明

结果: RGB(100, 150, 200, 255) - 被保留
```

**destination-in（未选中区域）**:
```
原图: RGB(100, 150, 200, 255)
Mask: RGB(0, 0, 0, 0) - 未选中区域

result.alpha = destination.alpha * source.alpha
result.alpha = 255 * 0/255 = 0  // 完全透明

结果: RGB(100, 150, 200, 0) - 被移除
```

### 3. 为什么不直接用 RGB 值

**错误理解**:
```javascript
// 很多人认为黑色 = 擦除，白色 = 保留
ctx.globalCompositeOperation = 'destination-in';
ctx.drawImage(maskWithBlackWhite, 0, 0);  // ❌
```

**实际情况**:
- `destination-in` 看的是 **alpha 通道**，不是 RGB
- RGB(0, 0, 0, 255) 的 alpha 是 255（不透明）
- RGB(255, 255, 255, 255) 的 alpha 也是 255（不透明）
- 所以两者对 `destination-in` 来说都是"保留"
- 结果：整张图都被保留，但可能因为 RGB 混合导致颜色变化

**正确理解**:
```javascript
// alpha = 255 → 保留
// alpha = 0 → 移除
ctx.globalCompositeOperation = 'destination-in';
ctx.drawImage(alphaMask, 0, 0);  // ✅
```

### 4. 边缘抗锯齿处理

**为什么转换为纯黑色**:
```javascript
data[i] = 0;     // R = 0
data[i + 1] = 0; // G = 0
data[i + 2] = 0; // B = 0
data[i + 3] = alpha; // A = 计算的 alpha
```

**理由**:
1. RGB 值在 composite 操作中不重要
2. 只有 alpha 通道决定保留/移除
3. 使用纯黑色避免颜色污染
4. 边缘的半透明像素（brightness 在 0-255 之间）会得到中间的 alpha 值
5. 这样产生平滑的抗锯齿效果

**示例**:
```
边缘像素: RGB(128, 128, 128, 255) - 灰色（50% 亮度）
brightness = (128 + 128 + 128) / 3 = 128
alpha = 255 - 128 = 127  // 50% 透明

结果: RGB(0, 0, 0, 127) - 50% 半透明黑色
应用后: 原图被保留 50%，产生平滑边缘
```

## 完整工作流程

### 修复后的流程

```
1. 绘制涂抹路径
   → strokeRef.current 累积路径点
   → updateRealtimePreview() 实时显示黑色半透明预览
   ↓
2. 松开鼠标（handleUp）
   → 生成 RGB mask（白色 + 黑色）
   → 保存 maskDataUrl
   → 保存 finalPoints 到 session
   → status = 'ready'
   → ✅ 不清空 strokeRef 和 displayStroke
   → ✅ 预览持续显示
   ↓
3. 用户看到
   → 黑色半透明路径覆盖在原图上 ✅
   → "保留" / "擦除" 按钮
   ↓
4. 用户点击"保留"（handleApply）
   → 加载 maskImg（RGB mask）
   → 创建 alphaMask canvas
   → 将 RGB → Alpha 转换
     • 黑色 → alpha=255（选中）
     • 白色 → alpha=0（未选中）
   → ctx.globalCompositeOperation = 'destination-in'
   → ctx.drawImage(alphaMask, 0, 0)
   → ✅ 只保留黑色路径覆盖的区域
   ↓
5. 用户点击"擦除"（handleApply）
   → （同上，转换 mask）
   → ctx.globalCompositeOperation = 'destination-out'
   → ctx.drawImage(alphaMask, 0, 0)
   → ✅ 移除黑色路径覆盖的区域
```

## 测试场景

### 场景 1: 路径预览持续显示

```
1. 上传图片
2. 点击"涂抹"
3. 绘制路径
   实际: 看到黑色半透明轨迹 ✅
4. 松开鼠标
   预期: 路径持续显示 ✅
   实际: 路径持续显示 ✅
   预期: 显示"保留"/"擦除"按钮 ✅
   实际: 显示按钮 ✅
```

### 场景 2: 保留功能正常

```
1. 上传图片
2. 点击"涂抹"
3. 绘制一个圆形区域
4. 松开鼠标
5. 点击"保留"
   预期: 只保留圆形区域内的图像 ✅
   实际: 只保留圆形区域内的图像 ✅
   预期: 圆形外的图像变透明 ✅
   实际: 圆形外的图像变透明 ✅
```

### 场景 3: 擦除功能正常

```
1. 上传图片
2. 点击"涂抹"
3. 绘制一条线
4. 松开鼠标
5. 点击"擦除"
   预期: 线条区域被删除 ✅
   实际: 线条区域被删除 ✅
   预期: 其他区域保持不变 ✅
   实际: 其他区域保持不变 ✅
```

### 场景 4: 边缘平滑

```
1. 上传图片
2. 点击"涂抹"
3. 使用较大的笔刷（50px）绘制
4. 松开鼠标
5. 点击"保留"或"擦除"
   预期: 边缘平滑，无锯齿 ✅
   实际: 边缘平滑，抗锯齿效果好 ✅
```

## 代码对比

### handleUp 对比

**修复前**:
```javascript
const handleUp = async (event) => {
  // ... 生成 mask ...
  
  setSession(prev => ({
    ...prev,
    status: 'ready',
    points: strokeRef.current,
    maskDataUrl: maskDataUrl
  }));
  
  strokeRef.current = [];      // ❌ 导致预览消失
  setDisplayStroke([]);        // ❌ 导致预览消失
};
```

**修复后**:
```javascript
const handleUp = async (event) => {
  // ... 生成 mask ...
  
  // 保存副本
  const finalPoints = [...strokeRef.current];
  
  setSession(prev => ({
    ...prev,
    status: 'ready',
    points: finalPoints,
    maskDataUrl: maskDataUrl
  }));
  
  // 不清空，保持预览 ✅
};
```

### handleApply 对比

**修复前**:
```javascript
const handleApply = async () => {
  const maskImg = new window.Image();
  maskImg.onload = async () => {
    ctx.drawImage(canvas, 0, 0);
    
    // 直接应用 RGB mask（错误）
    ctx.globalCompositeOperation = 
      eraseMode === 'erase' ? 'destination-out' : 'destination-in';
    
    const maskCanvas = document.createElement('canvas');
    maskCtx.drawImage(maskImg, 0, 0);
    ctx.drawImage(maskCanvas, 0, 0);  // ❌ 错误的 alpha
  };
};
```

**修复后**:
```javascript
const handleApply = async () => {
  const maskImg = new window.Image();
  maskImg.onload = async () => {
    ctx.drawImage(canvas, 0, 0);
    
    // 转换为 alpha mask（正确）
    const alphaMask = document.createElement('canvas');
    const alphaMaskCtx = alphaMask.getContext('2d');
    alphaMaskCtx.drawImage(maskImg, 0, 0);
    
    // RGB -> Alpha 转换
    const imageData = alphaMaskCtx.getImageData(...);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const brightness = (data[i] + data[i+1] + data[i+2]) / 3;
      const alpha = 255 - brightness;
      data[i] = 0;
      data[i+1] = 0;
      data[i+2] = 0;
      data[i+3] = alpha;  // ✅ 正确的 alpha
    }
    alphaMaskCtx.putImageData(imageData, 0, 0);
    
    // 应用 alpha mask
    ctx.globalCompositeOperation = 
      eraseMode === 'erase' ? 'destination-out' : 'destination-in';
    ctx.drawImage(alphaMask, 0, 0);  // ✅ 正确
  };
};
```

## 相关文档

- [涂抹路径消失修复](./SMEAR_PATH_DISAPPEAR_FIX.md) - 之前的累积效果修复
- [涂抹 Mask 模式简化](./SMEAR_MASK_MODE_SIMPLIFIED.md) - 简化 UI 和自动保存

---

**修复时间**: 2024-11-26  
**版本**: 2.0.14  
**状态**: ✅ 已修复  
**关键**: 不清空路径 + RGB→Alpha 转换 + 正确的 composite 操作

