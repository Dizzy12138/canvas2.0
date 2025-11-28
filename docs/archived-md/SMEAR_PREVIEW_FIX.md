# 实时涂抹预览优化

## 问题描述

用户反馈涂抹效果不明显,虽然日志显示"涂抹已应用",但视觉效果不理想。

### 主要问题

1. **预览层被遮挡**
   - 原始图片的 z-index 可能高于预览层
   - 预览图像显示不出来

2. **每次涂抹创建新 asset**
   - 导致多次应用,产生大量 asset
   - 性能问题

3. **SVG 笔刷轨迹位置不对**
   - 相对坐标计算错误
   - 笔刷显示位置偏移

## 解决方案

### 1. 隐藏原始图片

在进入涂抹模式时,将原始图片透明度设为接近 0:

```javascript
// 进入涂抹模式时
editor.updateShapes([{
  ...shape,
  opacity: 0.01  // 几乎透明,避免遮挡预览层
}]);

// 退出涂抹模式时恢复
return () => {
  const currentShape = editor.getShape(session.shapeId);
  if (currentShape) {
    editor.updateShapes([{
      ...currentShape,
      opacity: 1  // 恢复完全不透明
    }]);
  }
};
```

**为什么是 0.01 而不是 0**:
- `opacity: 0` 可能导致图片无法被选中
- `opacity: 0.01` 几乎看不见,但保持可选择性

### 2. 优化预览层渲染

确保预览层在正确的层级和位置:

```javascript
{/* 实时预览层 */}
{previewImageUrl && bounds && (
  <div
    className="absolute pointer-events-none"
    style={{
      left: `${bounds.left}px`,
      top: `${bounds.top}px`,
      width: `${bounds.width}px`,
      height: `${bounds.height}px`,
      zIndex: 998,  // 低于涂抹画布(1000),但高于原始图片
      backgroundColor: 'transparent'
    }}
  >
    <img
      src={previewImageUrl}
      alt="预览"
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'fill',
        display: 'block'
      }}
    />
  </div>
)}
```

**层级结构**:
```
z-index: 1000  ← 涂抹画布(笔刷轨迹)
z-index: 998   ← 预览层(实时效果)
z-index: auto  ← 原始图片(opacity: 0.01)
```

### 3. 修正笔刷轨迹坐标

SVG 笔刷轨迹需要相对于 bounds 计算坐标:

```javascript
{/* 显示涂抹笔刷轨迹 */}
{displayStroke.length > 0 && previewPoints && (
  <svg 
    className="absolute pointer-events-none"
    style={{
      left: `${bounds.left}px`,
      top: `${bounds.top}px`,
      width: `${bounds.width}px`,
      height: `${bounds.height}px`,
      overflow: 'visible'
    }}
  >
    {previewPoints.map((point, i) => (
      <circle
        key={i}
        cx={point.x - bounds.left}  // 相对坐标
        cy={point.y - bounds.top}   // 相对坐标
        r={brushSize / 2}
        fill="rgba(0, 0, 0, 0.5)"
      />
    ))}
  </svg>
)}
```

**坐标转换**:
```
previewPoints[i].x → 屏幕绝对坐标
bounds.left        → SVG 容器左边距
point.x - bounds.left → SVG 内部相对坐标
```

## 技术细节

### 层级管理

```
┌─────────────────────────────────────┐
│  涂抹画布层 (z: 1000)               │  ← 笔刷轨迹
│  ┌───────────────────────────────┐  │
│  │ 预览层 (z: 998)              │  │  ← 实时效果
│  │ ┌─────────────────────────┐  │  │
│  │ │ 原始图片 (opacity: 0.01) │  │  │  ← 几乎透明
│  │ └─────────────────────────┘  │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

### 透明度控制

```javascript
// 进入涂抹模式
┌────────────┐
│ opacity: 1 │  原始图片
└────────────┘
      ↓
┌──────────────┐
│ opacity: 0.01│  隐藏原始图片
└──────────────┘
      ↓ (用户涂抹)
┌──────────────┐
│ opacity: 0.01│  预览层显示效果
└──────────────┘
      ↓ (松开鼠标)
┌────────────┐
│ opacity: 1 │  应用并恢复
└────────────┘
```

### 坐标系统

```
屏幕坐标系:
┌─────────────────────────────────┐
│ (0, 0)                          │
│                                 │
│    ┌──────────────┐            │
│    │ 图片区域     │            │
│    │ (left, top)  │            │
│    │              │            │
│    └──────────────┘            │
│                                 │
└─────────────────────────────────┘

SVG 内部坐标系:
┌──────────────┐
│ (0, 0)       │  ← bounds.left, bounds.top
│              │
│   笔刷轨迹   │
│              │
└──────────────┘
```

## 工作流程

### 完整流程

```
1. 用户点击"涂抹"
   ↓
2. 隐藏原始图片 (opacity: 0.01)
   ↓
3. 加载图片数据到 canvas
   ↓
4. 显示初始预览层
   ↓
5. 用户按下鼠标
   ↓
6. 开始绘制笔刷轨迹
   ↓
7. 鼠标移动时:
   - 更新笔刷轨迹
   - 重新生成蒙版
   - 合成新的预览图
   - 更新预览层
   ↓
8. 松开鼠标:
   - 应用最终效果
   - 创建新 asset
   - 更新图片
   - 清除笔刷轨迹
   ↓
9. 点击"完成":
   - 恢复原始图片透明度 (opacity: 1)
   - 清理预览层
   - 退出涂抹模式
```

### 状态变化

```javascript
// 状态管理
const [previewImageUrl, setPreviewImageUrl] = useState(null);
const [displayStroke, setDisplayStroke] = useState([]);
const [isDrawing, setIsDrawing] = useState(false);

// 状态转换
初始化 → 加载图片 → 显示预览
        ↓
     按下鼠标 → isDrawing = true
        ↓
     移动鼠标 → 更新 displayStroke → 更新 previewImageUrl
        ↓
     松开鼠标 → isDrawing = false → 应用效果
```

## 性能优化

### 1. 避免频繁创建 Canvas

```javascript
// 复用 canvas 引用
const canvasRef = useRef(null);
const maskCanvasRef = useRef(null);

// 只在初始化时创建
useEffect(() => {
  const canvas = document.createElement('canvas');
  canvasRef.current = canvas;
  // ...
}, [session]);  // 只在 session 变化时重新创建
```

### 2. 减少图片加载次数

```javascript
// 缓存原始图片
const img = new window.Image();
img.onload = () => {
  // 一次性绘制到 canvas
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  canvasRef.current = canvas;
};
```

### 3. 优化预览更新频率

```javascript
// 使用 requestAnimationFrame 节流
const updatePreview = useCallback(() => {
  if (isUpdating.current) return;
  isUpdating.current = true;
  
  requestAnimationFrame(() => {
    updateRealtimePreview(strokeRef.current);
    isUpdating.current = false;
  });
}, [updateRealtimePreview]);
```

## 测试验证

### 测试步骤

1. **选择图片并进入涂抹模式**
   ```
   选中图片 → 点击"涂抹"
   预期: 
   - 原始图片几乎透明
   - 显示初始预览层
   - 光标变为黑色半透明圆形
   ```

2. **开始涂抹**
   ```
   在图片上按住鼠标拖动
   预期:
   - 显示黑色半透明笔刷轨迹
   - 预览层实时更新擦除效果
   - 可以清楚看到擦除的部分
   ```

3. **松开鼠标**
   ```
   观察效果
   预期:
   - 擦除效果立即应用
   - 笔刷轨迹消失
   - 预览层更新为最新效果
   - 显示"涂抹已应用"提示
   ```

4. **退出涂抹模式**
   ```
   点击"完成"按钮
   预期:
   - 原始图片透明度恢复为 1
   - 预览层消失
   - 返回正常编辑模式
   ```

### 预期结果

- ✅ 原始图片被隐藏,不遮挡预览
- ✅ 预览层清晰可见
- ✅ 笔刷轨迹位置正确
- ✅ 实时擦除效果流畅
- ✅ 松开鼠标自动应用
- ✅ 退出时恢复正常

## 故障排除

### 问题 1: 预览层看不见

**检查**:
```javascript
// 打开浏览器控制台,检查预览层
const previewDiv = document.querySelector('[alt="预览"]');
console.log('预览层:', previewDiv);
console.log('z-index:', window.getComputedStyle(previewDiv.parentElement).zIndex);
console.log('opacity:', window.getComputedStyle(previewDiv.parentElement).opacity);
```

**解决**:
- 确保 `previewImageUrl` 不为 null
- 确认 z-index 设置正确
- 检查原始图片是否被隐藏

### 问题 2: 笔刷轨迹位置不对

**检查**:
```javascript
console.log('bounds:', bounds);
console.log('previewPoints[0]:', previewPoints[0]);
console.log('相对坐标:', previewPoints[0].x - bounds.left, previewPoints[0].y - bounds.top);
```

**解决**:
- 确保 SVG 位置正确
- 检查坐标转换公式
- 验证 bounds 计算

### 问题 3: 原始图片没有隐藏

**检查**:
```javascript
const shape = editor.getShape(session.shapeId);
console.log('shape opacity:', shape.opacity);
```

**解决**:
- 确认 `editor.updateShapes` 被调用
- 检查 useEffect 是否执行
- 验证 shape 引用是否正确

## 相关文档

- [实时涂抹工具重构](./REALTIME_SMEAR_FIX.md)
- [涂抹视觉效果修复](./SMEAR_VISUAL_FIX.md)
- [所有修复总结](./ALL_FIXES_SUMMARY.md)

---

**优化时间**: 2024-11-26  
**版本**: 2.0.7  
**状态**: ✅ 已优化  
**改进**: 预览层显示 + 坐标修正

