# 涂抹工具修复总结

## 修复的问题

### 1. ❌ 点击涂抹后未切换涂抹笔刷
**问题**: 用户点击"涂抹"按钮后，光标没有变化，不知道如何操作

**修复**: 
- ✅ 添加自定义光标，显示笔刷大小
- ✅ 光标形状为圆形，直径等于当前笔刷大小
- ✅ 实时更新光标预览

### 2. ❌ 无法选择擦除模式
**问题**: 只有固定的反向擦除模式，无法切换

**修复**:
- ✅ 添加 "擦除" 模式按钮
- ✅ 添加 "反向擦除" 模式按钮
- ✅ 按钮高亮显示当前模式

### 3. ❌ 缺少保存蒙版功能
**问题**: 涂抹后只能立即应用，无法保存为蒙版以便后续使用

**修复**:
- ✅ 添加 "保存为蒙版" 按钮
- ✅ 蒙版存储在图层系统中
- ✅ 可在图层面板查看和管理蒙版

## 新增功能

### 1. 完整的涂抹工具界面

```
┌──────────────────────────────────────────────────────────────┐
│  笔刷大小: [====|=====] 20  │  模式: [擦除] [反向擦除]       │
│  ───────────────────────────────────────────────────────────│
│  [ 应用 ] [ 保存为蒙版 ] [ 重画 ] [ 取消 ]                   │
└──────────────────────────────────────────────────────────────┘
```

**组件**: `SelectionOverlay` 增强版

**位置**: 屏幕顶部居中，z-index 9999

**样式**: 白色背景 + 蓝色边框 + 阴影

### 2. 笔刷大小控制

**范围**: 5-100 像素

**控件**: 滑块 + 数字显示

**实时预览**: 
```javascript
cursor: url('data:image/svg+xml;utf8,
  <svg>
    <circle r="${brushSize/2}" ... />
  </svg>
')
```

### 3. 擦除模式切换

**擦除模式** (`erase` / `destination-out`):
- 擦除涂抹区域的像素
- 其他区域保持不变

**反向擦除模式** (`inverse` / `destination-in`):
- 保留涂抹区域的像素
- 其他区域被擦除

### 4. 操作按钮

**应用按钮**:
- 根据选择的模式擦除图像
- 立即更新图片
- 绿色背景

**保存为蒙版按钮**:
- 将涂抹路径保存为蒙版
- 不修改原图
- 紫色背景

**重画按钮**:
- 清除当前涂抹路径
- 重新开始涂抹
- 灰色背景

**取消按钮**:
- 退出涂抹模式
- 不做任何修改
- 红色背景

## 代码修改

### 1. `SelectionOverlay` 组件增强

#### 添加状态管理
```javascript
const [brushSize, setBrushSize] = useState(20);
const [eraseMode, setEraseMode] = useState('erase');
```

#### 自定义光标
```javascript
style={{
  cursor: `url('data:image/svg+xml;utf8,
    <svg xmlns="http://www.w3.org/2000/svg" 
         width="${brushSize}" height="${brushSize}">
      <circle cx="${brushSize/2}" cy="${brushSize/2}" 
              r="${brushSize/2}" 
              fill="none" stroke="black" stroke-width="1"/>
    </svg>
  ') ${brushSize/2} ${brushSize/2}, crosshair`
}}
```

#### 控制界面
```jsx
<div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[9999]">
  <div className="flex items-center gap-3 bg-white border-2 border-blue-500 shadow-2xl rounded-2xl px-4 py-3">
    {/* 笔刷大小滑块 */}
    <input type="range" min="5" max="100" value={brushSize} ... />
    
    {/* 模式切换按钮 */}
    <button onClick={() => setEraseMode('erase')}>擦除</button>
    <button onClick={() => setEraseMode('inverse')}>反向擦除</button>
    
    {/* 操作按钮 */}
    <button onClick={handleApply}>应用</button>
    <button onClick={handleSaveAsMask}>保存为蒙版</button>
    <button onClick={handleRedraw}>重画</button>
    <button onClick={onCancel}>取消</button>
  </div>
</div>
```

### 2. 回调函数实现

#### `handleSmearApply`
```javascript
const handleSmearApply = useCallback(async (mode, customBrushSize) => {
  if (mode === 'save-mask') {
    // 创建蒙版画布
    const maskCanvas = document.createElement('canvas');
    // ... 绘制涂抹路径
    // 保存为蒙版
    const maskDataUrl = maskCanvas.toDataURL('image/png');
    setMasks({ ...masks, [shapeId]: { [maskId]: maskDataUrl } });
  } else {
    // 应用擦除
    const applyMode = mode === 'erase' ? 'inverse' : 'crop';
    await applySelectionCrop(applyMode, selectionSession);
  }
  
  setSelectionSession(null);
}, [selectionSession, ...]);
```

#### `handleSmearCancel`
```javascript
const handleSmearCancel = useCallback(() => {
  setSelectionSession(null);
  setSelectionAction(null);
}, []);
```

### 3. 主组件调用

```jsx
{selectionSession && (
  <SelectionOverlay
    containerRef={containerRef}
    editorRef={editorRef}
    session={selectionSession}
    setSession={setSelectionSession}
    viewportRevision={viewportRevision}
    onApply={handleSmearApply}      // 新增
    onCancel={handleSmearCancel}    // 新增
  />
)}
```

## 使用流程

### 流程图

```
┌─────────────┐
│  选择图片    │
└──────┬──────┘
       │
       ↓
┌─────────────┐
│ 点击"涂抹"   │
└──────┬──────┘
       │
       ↓
┌─────────────┐
│ 调整笔刷大小 │
└──────┬──────┘
       │
       ↓
┌─────────────┐
│ 选择擦除模式 │
│ · 擦除      │
│ · 反向擦除   │
└──────┬──────┘
       │
       ↓
┌─────────────┐
│ 在图片上涂抹 │
└──────┬──────┘
       │
       ↓
┌─────────────┐
│   操作选择   │
│ · 应用      │
│ · 保存蒙版   │
│ · 重画      │
│ · 取消      │
└─────────────┘
```

### 详细步骤

1. **选择图片**
   ```
   点击画布上的任意图片
   → 显示蓝色选择框和操作栏
   ```

2. **进入涂抹模式**
   ```
   点击操作栏的 "涂抹" 按钮
   → 屏幕顶部显示涂抹控制栏
   → 光标变为圆形笔刷预览
   ```

3. **调整设置**
   ```
   拖动滑块调整笔刷大小 (5-100)
   点击按钮切换擦除模式 (擦除/反向擦除)
   ```

4. **开始涂抹**
   ```
   在图片上按住鼠标左键
   → 拖动鼠标绘制路径
   → 松开鼠标完成涂抹
   → 蓝色路径显示涂抹区域
   ```

5. **完成操作**
   ```
   选项 A: 点击 "应用" → 根据模式擦除图像
   选项 B: 点击 "保存为蒙版" → 保存涂抹路径
   选项 C: 点击 "重画" → 清除路径重新涂抹
   选项 D: 点击 "取消" → 退出不做修改
   ```

## 技术亮点

### 1. 自定义 SVG 光标
```javascript
// 动态生成 SVG 数据 URL
const cursorSVG = `data:image/svg+xml;utf8,
  <svg xmlns="http://www.w3.org/2000/svg" 
       width="${brushSize}" height="${brushSize}">
    <circle cx="${brushSize/2}" cy="${brushSize/2}" 
            r="${brushSize/2}" 
            fill="none" stroke="black" stroke-width="1"/>
  </svg>`;

// 设置光标偏移为笔刷中心
cursor: `url('${cursorSVG}') ${brushSize/2} ${brushSize/2}, crosshair`
```

### 2. 笔刷大小自适应
```javascript
// 根据图像实际尺寸计算笔刷像素
const brushPx = Math.max(
  2,
  customBrushSize * (originalWidth / pageBounds.width)
);
```

### 3. Canvas 合成模式
```javascript
// 擦除模式
resultCtx.globalCompositeOperation = 'destination-out';

// 反向擦除模式
resultCtx.globalCompositeOperation = 'destination-in';
```

### 4. 蒙版存储结构
```javascript
masks = {
  [shapeId]: {
    [maskId]: maskDataUrl,  // base64 PNG
    [maskId2]: maskDataUrl2,
    ...
  }
}
```

## 测试清单

- [x] 点击"涂抹"按钮进入涂抹模式
- [x] 光标显示笔刷大小预览
- [x] 笔刷大小滑块工作正常
- [x] 擦除模式切换正常
- [x] 反向擦除模式切换正常
- [x] 在图片上涂抹显示蓝色路径
- [x] 路径宽度等于笔刷大小
- [x] "应用"按钮根据模式擦除图像
- [x] "保存为蒙版"按钮保存涂抹路径
- [x] "重画"按钮清除路径
- [x] "取消"按钮退出涂抹模式
- [x] 蒙版保存到图层系统
- [x] 控制栏显示在正确位置（顶部居中）
- [x] 所有按钮样式正确（颜色、高亮）

## 已知限制

1. **单次涂抹**: 目前只支持单次涂抹，松开鼠标后不能继续添加
   - **解决方案**: V2.1 将支持多次涂抹和橡皮擦

2. **笔刷形状**: 只支持圆形笔刷
   - **解决方案**: V2.2 将支持自定义笔刷形状

3. **压感**: 不支持数位板压感
   - **解决方案**: V2.1 将添加压感支持

4. **边缘羽化**: 涂抹边缘是硬边
   - **解决方案**: V2.2 将支持羽化效果

## 后续优化

### V2.1 计划
- [ ] 橡皮擦工具（擦除涂抹的部分）
- [ ] 多次涂抹支持
- [ ] 压感支持
- [ ] 涂抹历史记录

### V2.2 计划
- [ ] 自定义笔刷形状
- [ ] 边缘羽化
- [ ] 智能边缘检测
- [ ] 蒙版编辑器

## 相关文档

- [涂抹工具使用指南](./SMEAR_TOOL_GUIDE.md)
- [Canvas 2.0 升级摘要](./V2.0_UPGRADE_SUMMARY.md)
- [完整文档](./README.md)

---

**修复时间**: 2024-11-26  
**版本**: 2.0.0  
**状态**: ✅ 已完成

