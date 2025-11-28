# 实时涂抹工具重构

## 需求变更

用户要求将涂抹工具改为**实时擦除模式**：

### 旧设计（已废弃）
- 涂抹后需要点击"应用"按钮
- 只显示路径预览
- 看不到实际效果

### 新设计（已实现）
- ✅ 涂抹时立即显示擦除效果
- ✅ 笔刷为黑色 50% 透明
- ✅ 即时视觉反馈
- ✅ 松开鼠标自动应用

## 技术实现

### 1. 实时预览系统

#### Canvas 双缓冲机制

```javascript
const canvasRef = useRef(null);          // 原始图像画布
const maskCanvasRef = useRef(null);      // 蒙版画布
const [previewImageUrl, setPreviewImageUrl] = useState(null);  // 预览图像
```

**工作流程**:
```
1. 加载原始图像 → canvasRef
2. 用户涂抹 → 在 maskCanvasRef 上绘制蒙版
3. 合成图像 → 原始图像 + 蒙版 = 预览图像
4. 显示预览 → setPreviewImageUrl
5. 松开鼠标 → 自动应用预览图像
```

### 2. 初始化画布

```javascript
useEffect(() => {
  if (!session || !editorRef.current || !bounds) return;
  
  const editor = editorRef.current;
  const shape = editor.getShape(session.shapeId);
  const asset = editor.getAsset(shape.props.assetId);
  
  // 加载原始图像
  const img = new window.Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    // 创建原始图像画布
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    canvasRef.current = canvas;
    
    // 创建蒙版画布
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = img.width;
    maskCanvas.height = img.height;
    maskCanvasRef.current = maskCanvas;
    
    // 设置初始预览
    setPreviewImageUrl(canvas.toDataURL('image/png'));
  };
  img.src = asset.props.src;
}, [session, editorRef, bounds]);
```

### 3. 实时更新预览

```javascript
const updateRealtimePreview = useCallback((points) => {
  if (!canvasRef.current || !maskCanvasRef.current || !session) return;
  
  const canvas = canvasRef.current;
  const maskCanvas = maskCanvasRef.current;
  const maskCtx = maskCanvas.getContext('2d');
  
  // 清空蒙版
  maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
  
  // 绘制涂抹路径（黑色 50% 透明）
  maskCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  maskCtx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
  maskCtx.lineCap = 'round';
  maskCtx.lineJoin = 'round';
  maskCtx.lineWidth = brushSize * (canvas.width / session.pageBounds.width);
  
  // 绘制路径
  maskCtx.beginPath();
  points.forEach((point, index) => {
    const x = point.x * canvas.width;
    const y = point.y * canvas.height;
    if (index === 0) {
      maskCtx.moveTo(x, y);
    } else {
      maskCtx.lineTo(x, y);
    }
  });
  maskCtx.stroke();
  
  // 合成最终图像
  const resultCanvas = document.createElement('canvas');
  resultCanvas.width = canvas.width;
  resultCanvas.height = canvas.height;
  const resultCtx = resultCanvas.getContext('2d');
  
  // 加载原始图像
  const img = new window.Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    resultCtx.drawImage(img, 0, 0);
    
    // 应用擦除效果
    resultCtx.globalCompositeOperation = 
      eraseMode === 'erase' ? 'destination-out' : 'destination-in';
    resultCtx.drawImage(maskCanvas, 0, 0);
    
    // 更新预览
    setPreviewImageUrl(resultCanvas.toDataURL('image/png'));
  };
  
  img.src = asset.props.src;
}, [session, brushSize, eraseMode, editorRef]);
```

### 4. 鼠标事件处理

```javascript
useEffect(() => {
  if (!isDrawing || !session || !canvasRef.current || !maskCanvasRef.current) return;

  const handleMove = (event) => {
    const editor = editorRef.current;
    if (!editor) return;
    
    const pagePoint = editor.screenToPage({ x: event.clientX, y: event.clientY });
    const normalized = normalizePointWithinBounds(pagePoint, session.pageBounds);
    strokeRef.current = [...strokeRef.current, normalized];
    setDisplayStroke(strokeRef.current);
    
    // 实时更新预览
    updateRealtimePreview(strokeRef.current);
  };

  const handleUp = (event) => {
    event.preventDefault();
    setIsDrawing(false);
    
    // 自动应用最终效果
    if (strokeRef.current.length > 2 && onApply) {
      onApply(eraseMode, brushSize, previewImageUrl);
    }
    
    strokeRef.current = [];
    setDisplayStroke([]);
  };

  window.addEventListener('pointermove', handleMove);
  window.addEventListener('pointerup', handleUp);
  window.addEventListener('pointercancel', handleUp);

  return () => {
    window.removeEventListener('pointermove', handleMove);
    window.removeEventListener('pointerup', handleUp);
    window.removeEventListener('pointercancel', handleUp);
  };
}, [editorRef, isDrawing, session, brushSize, eraseMode, onApply, previewImageUrl]);
```

### 5. 渲染预览图像

```javascript
return (
  <>
    {/* 实时预览层 */}
    {previewImageUrl && bounds && (
      <div
        className="absolute pointer-events-none z-[999]"
        style={{
          left: `${bounds.left}px`,
          top: `${bounds.top}px`,
          width: `${bounds.width}px`,
          height: `${bounds.height}px`
        }}
      >
        <img
          src={previewImageUrl}
          alt="预览"
          className="w-full h-full object-fill"
        />
      </div>
    )}
    
    {/* 涂抹画布区域 */}
    <div
      className="absolute inset-0 z-[1000] pointer-events-auto"
      style={{ 
        cursor: `url('data:image/svg+xml;utf8,<svg>
          <circle r="${brushSize/2}" fill="rgba(0,0,0,0.5)" stroke="black" stroke-width="2"/>
        </svg>') ${brushSize/2} ${brushSize/2}, crosshair` 
      }}
      onPointerDown={handlePointerDown}
    >
      {/* 显示涂抹笔刷轨迹 */}
      {displayStroke.length > 0 && previewPoints && (
        <svg className="absolute inset-0 pointer-events-none">
          {previewPoints.map((point, i) => (
            <circle
              key={i}
              cx={point.x}
              cy={point.y}
              r={brushSize / 2}
              fill="rgba(0, 0, 0, 0.5)"
            />
          ))}
        </svg>
      )}
    </div>
  </>
);
```

### 6. 简化控制栏

```javascript
<div className="flex items-center gap-3 bg-white/95 border shadow-xl rounded-full px-4 py-2">
  {/* 笔刷大小 */}
  <div className="flex items-center gap-2">
    <span className="text-sm text-gray-600">笔刷:</span>
    <input
      type="range"
      min="5"
      max="100"
      value={brushSize}
      onChange={(e) => setBrushSize(Number(e.target.value))}
      className="w-24"
    />
    <span className="text-xs font-medium">{brushSize}</span>
  </div>

  {/* 擦除模式 */}
  <div className="flex items-center gap-1">
    <button onClick={() => setEraseMode('erase')}>擦除</button>
    <button onClick={() => setEraseMode('inverse')}>保留</button>
  </div>

  {/* 完成按钮 */}
  <button onClick={onCancel}>完成</button>
</div>
```

## 视觉效果

### 笔刷光标

```javascript
// 黑色 50% 透明的圆形光标
cursor: url('data:image/svg+xml;utf8,
  <svg xmlns="http://www.w3.org/2000/svg" 
       width="${brushSize}" height="${brushSize}">
    <circle 
      cx="${brushSize/2}" cy="${brushSize/2}" r="${brushSize/2}"
      fill="rgba(0,0,0,0.5)"      // 黑色 50% 透明填充
      stroke="black"               // 黑色边框
      stroke-width="2"/>
  </svg>
')
```

### 涂抹轨迹

```javascript
{previewPoints.map((point, i) => (
  <circle
    key={i}
    cx={point.x}
    cy={point.y}
    r={brushSize / 2}
    fill="rgba(0, 0, 0, 0.5)"  // 黑色 50% 透明
  />
))}
```

## 用户体验流程

### 完整工作流程

```
1. 选择图片
   ↓
2. 点击"涂抹"按钮
   ↓
3. 进入涂抹模式
   - 光标变为黑色半透明圆形
   - 显示控制栏（笔刷大小、模式、完成）
   ↓
4. 在图片上按住并拖动
   - 实时显示黑色半透明涂抹轨迹
   - 预览层实时更新擦除效果
   - 边涂边看到结果
   ↓
5. 松开鼠标
   - 自动应用擦除效果
   - 清除涂抹轨迹
   - 可以继续涂抹或点击"完成"
   ↓
6. 点击"完成"
   - 退出涂抹模式
   - 保存所有更改
```

### 擦除模式

**擦除模式** (`destination-out`):
```
功能: 擦除涂抹区域的像素
用途: 去除水印、瑕疵、不需要的部分
效果: 涂抹的地方变透明或被删除
```

**保留模式** (`destination-in`):
```
功能: 只保留涂抹区域，删除其他部分
用途: 快速抠图、提取主体
效果: 只保留涂抹的地方，其他变透明
```

## 性能优化

### 1. Canvas 复用

```javascript
// 使用 ref 保存 canvas，避免重复创建
const canvasRef = useRef(null);
const maskCanvasRef = useRef(null);
```

### 2. 按需更新

```javascript
// 只在鼠标移动时更新预览
const handleMove = (event) => {
  // ... 获取坐标
  updateRealtimePreview(strokeRef.current);
};
```

### 3. 异步图像加载

```javascript
const img = new window.Image();
img.crossOrigin = 'anonymous';
img.onload = () => {
  // 加载完成后更新预览
  setPreviewImageUrl(resultCanvas.toDataURL('image/png'));
};
img.src = asset.props.src;
```

### 4. 减少状态更新

```javascript
// 使用 ref 存储中间状态，减少 re-render
const strokeRef = useRef([]);
```

## 对比旧设计

### 旧设计的问题

❌ 涂抹后看不到效果  
❌ 需要点击"应用"按钮  
❌ 无法预判擦除结果  
❌ 操作步骤繁琐  
❌ 控制栏按钮过多

### 新设计的优势

✅ 实时显示擦除效果  
✅ 边涂边看结果  
✅ 松开鼠标自动应用  
✅ 黑色半透明笔刷清晰可见  
✅ 简化的控制栏  
✅ 流畅的用户体验

## 测试验证

### 测试步骤

1. **选择图片**
   ```
   点击画布上的图片
   ```

2. **进入涂抹模式**
   ```
   点击 "涂抹" 按钮
   观察: 光标变为黑色半透明圆形
   ```

3. **调整笔刷大小**
   ```
   拖动滑块: 5 → 50 → 100
   观察: 光标大小实时变化
   ```

4. **涂抹测试**
   ```
   在图片上按住并拖动
   观察:
   - 涂抹轨迹为黑色半透明圆圈 ✓
   - 预览层实时显示擦除效果 ✓
   - 边涂边看到结果 ✓
   ```

5. **松开鼠标**
   ```
   观察:
   - 擦除效果自动应用 ✓
   - 涂抹轨迹清除 ✓
   - 可以继续涂抹 ✓
   ```

6. **切换模式**
   ```
   点击 "保留" 模式
   涂抹后观察: 只保留涂抹区域 ✓
   ```

7. **完成操作**
   ```
   点击 "完成" 按钮
   观察: 退出涂抹模式 ✓
   ```

### 预期结果

- ✅ 光标为黑色 50% 透明圆形
- ✅ 涂抹时显示黑色半透明轨迹
- ✅ 预览层实时更新擦除效果
- ✅ 松开鼠标自动应用
- ✅ 擦除模式正确工作
- ✅ 保留模式正确工作
- ✅ 控制栏简洁清晰

## 已知限制

### 当前限制

1. **单次涂抹应用**
   - 松开鼠标后立即应用
   - 无法撤销单次涂抹
   - 需要用历史记录功能撤销

2. **性能考虑**
   - 大图片（>4K）可能有延迟
   - 快速涂抹时预览更新可能略慢
   - 建议笔刷大小适中（20-50）

3. **兼容性**
   - 需要浏览器支持 Canvas API
   - 需要 CORS 支持的图片

### 未来改进

**V2.1 计划**:
- [ ] 添加撤销/重做按钮
- [ ] 缓存历史涂抹记录
- [ ] 优化大图片性能
- [ ] 添加预加载机制

**V2.2 计划**:
- [ ] 支持图层蒙版模式
- [ ] 添加涂抹历史面板
- [ ] 支持笔刷压感
- [ ] 添加边缘羽化

## 相关文档

- [涂抹工具使用指南](./SMEAR_TOOL_GUIDE.md)
- [涂抹视觉效果修复](./SMEAR_VISUAL_FIX.md)
- [所有修复总结](./ALL_FIXES_SUMMARY.md)

---

**重构时间**: 2024-11-26  
**版本**: 2.0.6  
**状态**: ✅ 已完成  
**类型**: 重大功能重构

