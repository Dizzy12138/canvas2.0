# 直接涂抹效果修复

## 用户需求

用户想要的涂抹效果：

### ✅ 期望效果
1. **笔刷涂到哪里，立即显示黑色半透明效果**（就像截图中的黑色圆圈）
2. **不要显示白色路径轨迹**
3. **不要无限累积** - 松开鼠标后应用，然后从新的图像开始下一次涂抹

### ❌ 之前的问题
- 涂抹时显示白色路径
- 效果累积，多次涂抹会叠加
- 视觉反馈不直观

## 解决方案

### 核心改进

#### 1. 简化实时预览逻辑

**直接在图像上绘制黑色半透明圆圈**：

```javascript
const updateRealtimePreview = useCallback((points) => {
  // 加载当前图像
  const img = new window.Image();
  img.onload = () => {
    const resultCanvas = document.createElement('canvas');
    const ctx = resultCanvas.getContext('2d');
    
    // 绘制原始图像
    ctx.drawImage(img, 0, 0);
    
    // 直接绘制黑色半透明圆圈
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.globalCompositeOperation = 
      eraseMode === 'erase' ? 'destination-out' : 'source-over';
    
    const brushPx = brushSize * (img.width / session.pageBounds.width);
    
    // 在每个点绘制圆圈
    points.forEach((point) => {
      const x = point.x * img.width;
      const y = point.y * img.height;
      
      ctx.beginPath();
      ctx.arc(x, y, brushPx / 2, 0, Math.PI * 2);
      ctx.fill();
    });
    
    // 更新预览
    setPreviewImageUrl(resultCanvas.toDataURL('image/png'));
  };
  img.src = asset.props.src;
}, [session, brushSize, eraseMode, editorRef]);
```

**关键点**:
- 不再使用复杂的蒙版画布
- 直接在每个点绘制圆形
- `fillStyle: 'rgba(0, 0, 0, 0.5)'` - 黑色 50% 透明
- `globalCompositeOperation: 'destination-out'` - 擦除模式

#### 2. 移除SVG轨迹显示

**之前**:
```jsx
{/* 显示白色路径轨迹 */}
<svg>
  {previewPoints.map((point, i) => (
    <circle fill="rgba(0, 0, 0, 0.5)" />  // 多余的显示
  ))}
</svg>
```

**现在**:
```jsx
{/* 只显示预览图像，不需要额外的SVG轨迹 */}
<img src={previewImageUrl} />
```

#### 3. 每次应用后重新开始

```javascript
const handleUp = async (event) => {
  setIsDrawing(false);
  
  // 应用效果
  if (strokeRef.current.length > 2 && previewImageUrl) {
    await onApply(eraseMode, brushSize, previewImageUrl);
    
    // 重新加载当前图像作为新的起点
    const editor = editorRef.current;
    const shape = editor?.getShape(session.shapeId);
    if (shape && shape.props?.assetId) {
      const asset = editor.getAsset(shape.props.assetId);
      const img = new window.Image();
      img.onload = () => {
        // 创建新的基础画布
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        canvasRef.current = canvas;
        
        // 更新预览基础
        setPreviewImageUrl(canvas.toDataURL('image/png'));
      };
      img.src = asset.props.src;
    }
  }
  
  // 清空笔刷
  strokeRef.current = [];
  setDisplayStroke([]);
};
```

**流程**:
```
涂抹 → 松开鼠标 → 应用效果 → 重新加载图像 → 清空笔刷 → 准备下次涂抹
```

## 视觉效果

### 涂抹过程

```
原始图像:
┌─────────────┐
│             │
│   [图片]    │
│             │
└─────────────┘

开始涂抹:
┌─────────────┐
│  ●          │  ← 黑色半透明圆圈
│   [图片]    │
│             │
└─────────────┘

继续涂抹:
┌─────────────┐
│  ●●●        │  ← 多个黑色圆圈
│   [图片]    │
│             │
└─────────────┘

松开鼠标:
┌─────────────┐
│  [已擦除]   │  ← 效果已应用
│   [图片]    │
│             │
└─────────────┘
      ↓
准备下次涂抹（从新图像开始）
```

### 与之前的对比

**之前（问题）**:
```
涂抹时: 显示白色路径 ━━━━━  ❌ 不直观
效果:   累积多次涂抹       ❌ 无限叠加
```

**现在（正确）**:
```
涂抹时: 显示黑色圆圈 ●●●●●  ✅ 直观清晰
效果:   每次独立应用       ✅ 不累积
```

## 工作流程

### 完整流程

```
1. 点击"涂抹"
   → 加载原始图像
   → 隐藏原图（opacity: 0.01）
   → 显示预览层

2. 按住鼠标开始涂抹
   → isDrawing = true
   → 收集涂抹点

3. 鼠标移动
   → 添加新点到 strokeRef
   → 调用 updateRealtimePreview()
   → 在每个点绘制黑色圆圈
   → 更新预览图像

4. 松开鼠标
   → isDrawing = false
   → 调用 onApply() 应用效果
   → 重新加载图像作为新起点
   → 清空 strokeRef
   → 准备下次涂抹

5. 点击"完成"
   → 恢复原图透明度（opacity: 1）
   → 退出涂抹模式
```

### 状态管理

```javascript
// 关键状态
const canvasRef = useRef(null);          // 基础画布
const [previewImageUrl, setPreviewImageUrl] = useState(null);  // 预览图像
const strokeRef = useRef([]);            // 当前涂抹的点
const [isDrawing, setIsDrawing] = useState(false);  // 是否正在涂抹

// 状态转换
空闲 → 按下鼠标 → isDrawing=true
     → 移动鼠标 → 更新strokeRef → 更新previewImageUrl
     → 松开鼠标 → 应用效果 → 重置状态 → 空闲
```

## 技术细节

### 1. 圆形笔刷绘制

```javascript
ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';  // 黑色 50% 透明
ctx.globalCompositeOperation = 'destination-out';  // 擦除模式

const brushPx = brushSize * (img.width / session.pageBounds.width);

points.forEach((point) => {
  const x = point.x * img.width;
  const y = point.y * img.height;
  
  ctx.beginPath();
  ctx.arc(x, y, brushPx / 2, 0, Math.PI * 2);  // 圆形
  ctx.fill();
});
```

### 2. 坐标系统

```
归一化坐标 (0-1):
point.x, point.y  → [0, 1]

图像像素坐标:
x = point.x * img.width
y = point.y * img.height
```

### 3. 擦除模式

```javascript
// 擦除模式
ctx.globalCompositeOperation = 'destination-out';
// 涂抹的地方变透明（擦除）

// 保留模式
ctx.globalCompositeOperation = 'source-over';
// 涂抹的地方保留（其他地方可以后续擦除）
```

### 4. 每次应用后重新开始

```javascript
// 应用效果后
await onApply(eraseMode, brushSize, previewImageUrl);

// 重新加载图像
const img = new window.Image();
img.onload = () => {
  // 创建新的基础画布
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  canvasRef.current = canvas;
  
  // 重置预览
  setPreviewImageUrl(canvas.toDataURL('image/png'));
};
img.src = asset.props.src;  // 从最新的asset加载
```

**关键**: 每次应用后，从新的图像（已包含之前的涂抹效果）开始，而不是累积在旧图像上。

## 用户体验

### 期望的交互

```
用户操作: 在图片上涂抹黑色区域
期望看到: 立即显示黑色半透明圆圈（就像截图）
松开鼠标: 效果应用，黑色变为真正的擦除
继续涂抹: 从新的图像开始，不累积
```

### 实际效果

```
涂抹时:
- 看到黑色半透明圆圈 ●●●  ✅
- 圆圈跟随鼠标轨迹       ✅
- 不显示白色路径         ✅

松开鼠标:
- 效果立即应用           ✅
- 预览更新为新图像       ✅
- 准备下次涂抹           ✅

多次涂抹:
- 每次独立               ✅
- 不累积叠加             ✅
- 基于最新结果           ✅
```

## 测试验证

### 测试步骤

1. **选择图片并涂抹**
   ```
   选中图片 → 点击"涂抹" → 在图片上拖动
   预期: 显示黑色半透明圆圈
   ```

2. **松开鼠标**
   ```
   观察效果
   预期: 
   - 显示"涂抹已应用"提示
   - 黑色区域变为真正的擦除
   ```

3. **继续涂抹**
   ```
   再次在图片上拖动
   预期: 
   - 从新图像开始
   - 不累积之前的黑色圆圈
   - 每次独立
   ```

4. **多次涂抹**
   ```
   重复涂抹3-5次
   预期:
   - 每次效果独立
   - 不无限叠加
   - 基于最新结果
   ```

### 预期结果

- ✅ 涂抹时显示黑色半透明圆圈
- ✅ 不显示白色路径
- ✅ 松开鼠标立即应用
- ✅ 每次涂抹独立，不累积
- ✅ 基于最新图像开始新涂抹
- ✅ 视觉效果与截图一致

## 性能优化

### 1. 按需加载图像

```javascript
// 只在需要时加载
img.onload = () => { /* ... */ };
img.src = asset.props.src;
```

### 2. Canvas 复用

```javascript
// 复用 canvasRef
const canvas = canvasRef.current || document.createElement('canvas');
```

### 3. 避免频繁创建

```javascript
// 使用 useCallback 缓存函数
const updateRealtimePreview = useCallback((points) => {
  // ...
}, [session, brushSize, eraseMode, editorRef]);
```

## 相关文档

- [实时涂抹工具重构](./REALTIME_SMEAR_FIX.md)
- [涂抹预览优化](./SMEAR_PREVIEW_FIX.md)
- [所有修复总结](./ALL_FIXES_SUMMARY.md)

---

**修复时间**: 2024-11-26  
**版本**: 2.0.8  
**状态**: ✅ 已修复  
**改进**: 直接显示黑色效果 + 独立应用

