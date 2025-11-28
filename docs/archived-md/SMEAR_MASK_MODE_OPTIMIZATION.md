# 涂抹工具 Mask 模式优化

## 优化目标

用户反馈：**绘制完成后默认以 mask 形式展示，不要直接擦除或反向擦除**

### 优化需求

1. 涂抹完成后显示为**半透明红色 mask 叠加效果**
2. 提供三个操作选项：
   - **应用擦除** - 删除 mask 区域
   - **应用保留** - 只保留 mask 区域
   - **保存为 Mask** - 将 mask 保存为图层蒙版
3. 用户可以预览效果后再决定如何处理

## 核心改进

### 1. 绘制阶段 - 半透明红色预览

**修改前（黑色涂抹）**:
```javascript
// 绘制黑色半透明路径
ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
```

**修改后（红色 mask 预览）**:
```javascript
// 绘制半透明红色 mask 路径
ctx.strokeStyle = 'rgba(255, 0, 0, 0.4)';  // 红色 40% 透明

// 填充路径内部
ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
ctx.fill();
```

**效果**:
- ✅ 绘制时看到红色轨迹（而非黑色）
- ✅ 清晰显示要操作的区域
- ✅ 符合行业标准（Photoshop/Lovart 等）

### 2. 完成绘制 - 生成 Mask

**修改前（直接擦除）**:
```javascript
const handleUp = async () => {
  // 直接应用擦除效果
  ctx.globalCompositeOperation = 'destination-out';
  ctx.stroke();
  
  // 立即更新图像
  await onApply(eraseMode, brushSize, finalImageUrl);
};
```

**修改后（生成 Mask + 预览）**:
```javascript
const handleUp = async () => {
  // 1. 创建黑白 mask canvas
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = canvas.width;
  maskCanvas.height = canvas.height;
  const maskCtx = maskCanvas.getContext('2d');
  
  // 2. 白色背景（未选中区域）
  maskCtx.fillStyle = '#ffffff';
  maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
  
  // 3. 黑色涂抹路径（选中区域）
  maskCtx.strokeStyle = '#000000';
  maskCtx.stroke();
  
  // 4. 保存 mask 图像
  const maskDataUrl = maskCanvas.toDataURL('image/png');
  setMaskImageUrl(maskDataUrl);
  
  // 5. 创建带红色叠加的预览
  const previewCanvas = document.createElement('canvas');
  const previewCtx = previewCanvas.getContext('2d');
  previewCtx.drawImage(canvas, 0, 0);  // 原图
  
  // 红色半透明叠加
  previewCtx.strokeStyle = 'rgba(255, 0, 0, 0.4)';
  previewCtx.fillStyle = 'rgba(255, 0, 0, 0.3)';
  previewCtx.stroke();
  previewCtx.fill();
  
  setPreviewImageUrl(previewCanvas.toDataURL('image/png'));
  
  // 6. 更新 session 状态为 'ready'
  setSession(prev => ({
    ...prev,
    status: 'ready',
    points: strokeRef.current,
    maskDataUrl: maskDataUrl
  }));
};
```

**关键改进**:
- ✅ 不直接擦除图像
- ✅ 生成独立的 mask 数据
- ✅ 预览显示红色叠加效果
- ✅ 状态变为 'ready'，等待用户选择操作

### 3. 操作选项 - 三个按钮

**UI 变化**:

**绘制模式（status !== 'ready'）**:
```jsx
<div className="flex items-center gap-3">
  {/* 笔刷大小 */}
  <input type="range" min="5" max="100" value={brushSize} ... />
  
  {/* 模式选择（擦除/保留） */}
  <button onClick={() => setEraseMode('erase')}>擦除</button>
  <button onClick={() => setEraseMode('inverse')}>保留</button>
  
  {/* 完成绘制 */}
  <button onClick={onCancel}>完成</button>
</div>
```

**完成模式（status === 'ready'）**:
```jsx
<div className="flex items-center gap-3">
  <span>选择操作：</span>
  
  {/* 应用擦除/保留 */}
  <button onClick={handleApply} className="bg-blue-500">
    {eraseMode === 'erase' ? '应用擦除' : '应用保留'}
  </button>
  
  {/* 保存为 Mask */}
  <button onClick={handleSaveAsMask} className="bg-purple-500">
    保存为 Mask
  </button>
  
  {/* 取消 */}
  <button onClick={onCancel} className="bg-gray-500">
    取消
  </button>
</div>
```

**操作流程**:
```
1. 绘制涂抹路径 (红色预览)
2. 松开鼠标 → status = 'ready'
3. UI 切换到操作选项
4. 用户选择:
   - 应用擦除 → 删除红色区域
   - 应用保留 → 只保留红色区域
   - 保存为 Mask → 创建蒙版图层
   - 取消 → 放弃操作
```

### 4. 应用擦除/保留

**handleApply 实现**:
```javascript
const handleApply = useCallback(async () => {
  if (!maskImageUrl) return;
  
  const canvas = canvasRef.current;
  
  // 加载 mask 图像
  const maskImg = new window.Image();
  maskImg.onload = async () => {
    // 创建结果画布
    const resultCanvas = document.createElement('canvas');
    resultCanvas.width = canvas.width;
    resultCanvas.height = canvas.height;
    const ctx = resultCanvas.getContext('2d');
    
    // 绘制原图
    ctx.drawImage(canvas, 0, 0);
    
    // 应用 mask
    ctx.globalCompositeOperation = 
      eraseMode === 'erase' 
        ? 'destination-out'   // 擦除模式
        : 'destination-in';   // 保留模式
    
    // 创建临时 mask canvas
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = canvas.width;
    maskCanvas.height = canvas.height;
    const maskCtx = maskCanvas.getContext('2d');
    maskCtx.drawImage(maskImg, 0, 0);
    
    ctx.drawImage(maskCanvas, 0, 0);
    
    // 应用结果
    const finalImageUrl = resultCanvas.toDataURL('image/png');
    await onApply(eraseMode, brushSize, finalImageUrl);
    
    // 更新 canvas 为应用后的结果
    canvasRef.current = resultCanvas;
  };
  maskImg.src = maskImageUrl;
}, [maskImageUrl, eraseMode, brushSize, onApply]);
```

**关键点**:
- ✅ 使用保存的 mask 图像
- ✅ 支持擦除/保留两种模式
- ✅ 应用后更新 canvasRef（累积效果）

### 5. 保存为 Mask 图层

**handleSaveAsMask 实现**:
```javascript
const handleSaveAsMask = useCallback(async () => {
  if (!maskImageUrl) return;
  
  // 调用 onApply 并传递 'save-mask' 模式
  await onApply('save-mask', brushSize, null, maskImageUrl);
}, [maskImageUrl, brushSize, onApply]);
```

**handleSmearApply 处理**:
```javascript
const handleSmearApply = useCallback(async (mode, customBrushSize, previewDataUrl, maskDataUrl) => {
  if (mode === 'save-mask' && maskDataUrl) {
    const layerId = getLayerIdByShapeId(selectionSession.shapeId);
    const layer = layers.find(l => l.id === layerId);
    
    if (layer) {
      // 使用 createMaskForLayer 创建蒙版
      createMaskForLayer(layerId, {
        type: 'smear-brush',
        data: selectionSession.points || [],
        maskImage: maskDataUrl,
        bounds: {
          x: selectionSession.pageBounds.minX,
          y: selectionSession.pageBounds.minY,
          width: selectionSession.pageBounds.width,
          height: selectionSession.pageBounds.height
        }
      });
      
      errorHandler.showSuccess('蒙版已保存到图层');
    }
    
    setSelectionSession(null);
    setSelectionAction(null);
  }
}, [selectionSession, getLayerIdByShapeId, layers, createMaskForLayer]);
```

**Mask 数据结构**:
```javascript
{
  id: 'mask-1234567890-abc123',
  layerId: 'layer-xxx',
  type: 'smear-brush',
  data: [...points],           // 涂抹路径点
  maskImage: 'data:image/png;base64,...',  // mask 图像
  bounds: { x, y, width, height },
  inverted: false,
  density: 1,
  feather: 0
}
```

## 完整工作流程

### 用户操作流程

```
┌─────────────────────────────────────┐
│ 1. 点击"涂抹"按钮                   │
│    → selectionSession 创建           │
│    → status = 'drawing'              │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 2. 绘制涂抹路径                      │
│    → 实时显示红色半透明轨迹         │
│    → updateRealtimePreview()        │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 3. 松开鼠标（完成绘制）              │
│    → handleUp()                      │
│    → 生成 mask canvas（黑白）       │
│    → 生成 preview（带红色叠加）     │
│    → status = 'ready'                │
│    → UI 切换到操作选项               │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 4. 用户选择操作                      │
│                                      │
│   ┌──────────────────────────────┐ │
│   │ a) 应用擦除                   │ │
│   │    → handleApply()            │ │
│   │    → destination-out          │ │
│   │    → 删除 mask 区域           │ │
│   └──────────────────────────────┘ │
│                                      │
│   ┌──────────────────────────────┐ │
│   │ b) 应用保留                   │ │
│   │    → handleApply()            │ │
│   │    → destination-in           │ │
│   │    → 只保留 mask 区域         │ │
│   └──────────────────────────────┘ │
│                                      │
│   ┌──────────────────────────────┐ │
│   │ c) 保存为 Mask                │ │
│   │    → handleSaveAsMask()       │ │
│   │    → createMaskForLayer()     │ │
│   │    → 创建蒙版图层             │ │
│   └──────────────────────────────┘ │
│                                      │
│   ┌──────────────────────────────┐ │
│   │ d) 取消                       │ │
│   │    → onCancel()               │ │
│   │    → 放弃操作                 │ │
│   └──────────────────────────────┘ │
└─────────────────────────────────────┘
```

### 代码执行流程

```javascript
// ========== 阶段 1: 开始绘制 ==========
handleStartSmearErase()
  → setSelectionSession({ status: 'drawing', ... })
  → 初始化 canvas 和 maskCanvas

// ========== 阶段 2: 实时绘制 ==========
handlePointerDown() → setIsDrawing(true)
  ↓
handleMove() → updateRealtimePreview(points)
  ↓
  // 显示红色半透明路径
  ctx.strokeStyle = 'rgba(255, 0, 0, 0.4)'
  ctx.fillStyle = 'rgba(255, 0, 0, 0.2)'
  ctx.stroke()
  ctx.fill()
  ↓
  setPreviewImageUrl(...)

// ========== 阶段 3: 完成绘制 ==========
handleUp()
  ↓
  // 1. 生成黑白 mask
  maskCanvas.fillStyle = '#ffffff'
  maskCanvas.fillRect(...)
  maskCanvas.strokeStyle = '#000000'
  maskCanvas.stroke()
  maskDataUrl = maskCanvas.toDataURL()
  ↓
  // 2. 生成带红色叠加的预览
  previewCanvas.drawImage(canvas, 0, 0)
  previewCtx.strokeStyle = 'rgba(255, 0, 0, 0.4)'
  previewCtx.fillStyle = 'rgba(255, 0, 0, 0.3)'
  previewCtx.stroke()
  previewCtx.fill()
  setPreviewImageUrl(...)
  ↓
  // 3. 更新 session 状态
  setSession({ 
    ...prev, 
    status: 'ready',
    maskDataUrl 
  })

// ========== 阶段 4a: 应用擦除/保留 ==========
handleApply()
  ↓
  // 加载 mask 图像
  maskImg.src = maskImageUrl
  maskImg.onload = () => {
    // 应用 mask
    ctx.drawImage(canvas, 0, 0)
    ctx.globalCompositeOperation = 
      eraseMode === 'erase' ? 'destination-out' : 'destination-in'
    ctx.drawImage(maskCanvas, 0, 0)
    
    // 更新图像
    await onApply(eraseMode, brushSize, finalImageUrl)
  }

// ========== 阶段 4b: 保存为 Mask ==========
handleSaveAsMask()
  ↓
  await onApply('save-mask', brushSize, null, maskImageUrl)
  ↓
handleSmearApply(mode='save-mask', ..., maskDataUrl)
  ↓
  createMaskForLayer(layerId, {
    type: 'smear-brush',
    maskImage: maskDataUrl,
    ...
  })
  ↓
  errorHandler.showSuccess('蒙版已保存到图层')
```

## 技术细节

### 1. Mask Canvas 生成

**黑白 Mask**:
```javascript
// 白色 = 未选中区域（保留）
// 黑色 = 选中区域（要操作）

const maskCanvas = document.createElement('canvas');
maskCanvas.width = imageWidth;
maskCanvas.height = imageHeight;
const ctx = maskCanvas.getContext('2d');

// 填充白色背景
ctx.fillStyle = '#ffffff';
ctx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);

// 绘制黑色路径（选中区域）
ctx.strokeStyle = '#000000';
ctx.lineCap = 'round';
ctx.lineJoin = 'round';
ctx.lineWidth = brushSize * 2;

ctx.beginPath();
points.forEach((point, index) => {
  const x = point.x * imageWidth;
  const y = point.y * imageHeight;
  if (index === 0) ctx.moveTo(x, y);
  else ctx.lineTo(x, y);
});
ctx.stroke();

const maskDataUrl = maskCanvas.toDataURL('image/png');
```

### 2. 预览叠加效果

**红色半透明叠加**:
```javascript
const previewCanvas = document.createElement('canvas');
previewCanvas.width = canvas.width;
previewCanvas.height = canvas.height;
const ctx = previewCanvas.getContext('2d');

// 绘制原图
ctx.drawImage(canvas, 0, 0);

// 叠加红色（源叠加模式）
ctx.globalCompositeOperation = 'source-over';
ctx.strokeStyle = 'rgba(255, 0, 0, 0.4)';  // 边框
ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';    // 填充

ctx.beginPath();
points.forEach((point, index) => {
  const x = point.x * canvas.width;
  const y = point.y * canvas.height;
  if (index === 0) ctx.moveTo(x, y);
  else ctx.lineTo(x, y);
});
ctx.stroke();
ctx.fill();

setPreviewImageUrl(previewCanvas.toDataURL('image/png'));
```

### 3. 应用 Mask 擦除

**Destination-Out（擦除）**:
```javascript
ctx.drawImage(originalImage, 0, 0);
ctx.globalCompositeOperation = 'destination-out';
ctx.drawImage(maskCanvas, 0, 0);

// 结果: mask 的黑色区域会变透明（擦除）
```

**Destination-In（保留）**:
```javascript
ctx.drawImage(originalImage, 0, 0);
ctx.globalCompositeOperation = 'destination-in';
ctx.drawImage(inverseMaskCanvas, 0, 0);

// 结果: 只保留 mask 的黑色区域
```

### 4. Session 状态管理

```javascript
const [selectionSession, setSelectionSession] = useState(null);

// 初始状态
{
  shapeId: 'shape:xxx',
  layerId: 'layer-xxx',
  tool: 'brush',
  status: 'drawing',      // 'drawing' | 'ready'
  points: [],
  pageBounds: { minX, minY, maxX, maxY, width, height }
}

// 完成绘制后
{
  ...prev,
  status: 'ready',
  points: [...finalPoints],
  maskDataUrl: 'data:image/png;base64,...'
}
```

## 优势与改进

### 优势

1. **✅ 非破坏性编辑**
   - 不直接修改图像
   - 可以预览后再决定
   - 支持取消操作

2. **✅ 灵活的工作流程**
   - 支持擦除/保留两种模式
   - 可以保存为独立 mask 图层
   - 后续可以修改或重新应用

3. **✅ 清晰的视觉反馈**
   - 红色半透明显示选区
   - 符合行业标准
   - 易于理解和使用

4. **✅ 数据完整性**
   - mask 保存为独立数据
   - 包含路径点和图像
   - 可以重新生成或编辑

### 相比之前的改进

**之前（直接擦除）**:
- ❌ 绘制完成立即擦除
- ❌ 无法预览
- ❌ 无法撤销
- ❌ 黑色预览不清晰

**现在（Mask 模式）**:
- ✅ 绘制完成显示红色 mask
- ✅ 可以预览效果
- ✅ 三种操作选项
- ✅ 可以保存为 mask 图层
- ✅ 红色预览清晰直观

## 测试场景

### 场景 1: 应用擦除

```
1. 上传图片
2. 点击"涂抹"
3. 绘制路径（看到红色轨迹） ✅
4. 松开鼠标（看到红色叠加预览） ✅
5. UI 显示"应用擦除"、"应用保留"、"保存为 Mask" ✅
6. 点击"应用擦除"
7. 红色区域被删除 ✅
8. selectionSession 清空 ✅
```

### 场景 2: 应用保留

```
1. 上传图片
2. 点击"涂抹"
3. 选择"保留"模式
4. 绘制路径（看到红色轨迹） ✅
5. 松开鼠标（看到红色叠加预览） ✅
6. 点击"应用保留"
7. 只保留红色区域，其他变透明 ✅
```

### 场景 3: 保存为 Mask

```
1. 上传图片
2. 点击"涂抹"
3. 绘制路径（看到红色轨迹） ✅
4. 松开鼠标（看到红色叠加预览） ✅
5. 点击"保存为 Mask"
6. 蒙版保存到图层 ✅
7. 原图不变 ✅
8. 可以在图层面板看到 mask ✅
```

### 场景 4: 取消操作

```
1. 上传图片
2. 点击"涂抹"
3. 绘制路径（看到红色轨迹） ✅
4. 松开鼠标（看到红色叠加预览） ✅
5. 点击"取消"
6. selectionSession 清空 ✅
7. 预览消失 ✅
8. 原图不变 ✅
```

### 场景 5: 连续涂抹

```
1. 上传图片
2. 点击"涂抹"
3. 绘制第一条路径 ✅
4. 松开鼠标 → 预览 ✅
5. 点击"应用擦除" ✅
6. 继续涂抹（点击"涂抹"） ✅
7. 绘制第二条路径 ✅
8. 松开鼠标 → 预览 ✅
9. 点击"应用擦除" ✅
10. 累积擦除效果 ✅
```

## 相关文件

### 修改的文件

- `src/components/OuzhiArtPlatform.jsx`
  - `SelectionOverlay` 组件
  - `handleUp` 函数
  - `updateRealtimePreview` 函数
  - `handleApply` 函数
  - `handleSaveAsMask` 函数
  - `handleSmearApply` 函数
  - 控制栏 UI

### 相关文档

- [涂抹工具指南](./SMEAR_TOOL_GUIDE.md) - 基础使用
- [涂抹路径消失修复](./SMEAR_PATH_DISAPPEAR_FIX.md) - 累积效果
- [涂抹路径宽度修复](./SMEAR_PATH_WIDTH_FIX.md) - 路径渲染

---

**优化时间**: 2024-11-26  
**版本**: 2.0.12  
**状态**: ✅ 已完成  
**关键**: Mask 预览 + 操作选项 + 非破坏性编辑

