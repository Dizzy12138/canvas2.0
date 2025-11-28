# 图片上传优化说明

## 问题描述

用户上传图片后看到：
1. ✅ **白框（实际是蓝色选择框）** - 这是正常现象，表示图片已选中
2. ⚠️ **CSP 报错** - 浏览器扩展引起，可以忽略
3. ❌ **操作栏未显示** - 由于视口同步延迟导致

## 已修复问题

### 修复内容

在 `src/components/canvas/EditableCanvas.jsx` 中优化了图片上传后的处理逻辑：

#### 1. 自动选中上传的图片
```javascript
// 选中新添加的图片
if (newShapes.length > 0) {
  const lastShape = newShapes[newShapes.length - 1];
  editor.select(lastShape.id);
}
```

#### 2. 自动缩放视口以显示图片
```javascript
// 确保图片在视口中可见
const bounds = editor.getShapePageBounds(lastShape.id);
if (bounds) {
  editor.zoomToBounds(bounds, { 
    animation: { duration: 300 },
    inset: 100 
  });
}
```

### 修复效果

**修复前**:
- 图片上传后虽然被选中，但可能不在视口中心
- 操作栏可能因为视口位置问题不显示
- 需要手动点击图片才能看到操作栏

**修复后**:
- ✅ 图片上传后自动选中
- ✅ 视口自动平滑缩放到图片位置
- ✅ 操作栏立即显示在图片上方
- ✅ 300ms 平滑动画，体验更好

## 关于报错说明

### CSP 报错（可忽略）

```
tab.js:1 Executing inline script violates the following Content Security Policy directive...
```

**原因**: 
- 这是浏览器扩展（chrome-extension://17bc3e28-...）注入的脚本引起的
- 不是项目代码的问题

**影响**: 
- 不影响功能
- 只在开发环境显示
- 生产环境不会出现

**解决方案**:
1. **推荐**: 忽略此报错
2. 或临时禁用该浏览器扩展
3. 或在浏览器中添加该扩展到 CSP 白名单

### 图层命名日志（正常）

```
[LayerNameDebug] shape added
[LayerNameDebug] asset filename mapped
[LayerNameDebug] updateLayerNamesForAsset: rename layer
```

**说明**:
- 这些是调试日志，用于追踪图层命名逻辑
- 表示系统正常工作
- 图片上传后会自动重命名为文件名

## 使用说明

### 图片上传工作流

1. **拖拽图片到画布**
   - 图片会添加到画布中心
   - 自动选中并缩放视口

2. **查看操作栏**
   - 操作栏自动显示在图片上方
   - 包含：扩展、涂抹、填充模式、下载

3. **编辑图片**
   - 点击"涂抹"进入涂抹模式
   - 拖动边缘控制点扩展/裁剪
   - 点击"下载"保存图片

### 选择框说明

**蓝色选择框（正常现象）**:
- 表示图片当前被选中
- 四周有8个控制点（调整大小）
- 四边中点有扩展/裁剪手柄
- 点击空白处取消选择

**操作栏（悬浮在图片上方）**:
```
┌─────────────────────────────────────┐
│ [扩展] [涂抹] [白色/透明] [下载]    │
└─────────────────────────────────────┘
        ↓ 显示在这里 ↓
┌─────────────────────────────────────┐
│                                     │
│           [图片内容]                │
│                                     │
└─────────────────────────────────────┘
```

## 技术细节

### 视口缩放参数

```javascript
editor.zoomToBounds(bounds, { 
  animation: { duration: 300 },  // 300ms 平滑动画
  inset: 100                     // 留出 100px 边距
});
```

**参数说明**:
- `duration: 300` - 动画时长 300 毫秒
- `inset: 100` - 图片周围留出 100 像素空间
- 确保操作栏和选择框完全可见

### 选择逻辑

```javascript
// 1. 添加图片
await editor.putExternalContent({ ... });

// 2. 等待 shape 创建
await new Promise(resolve => setTimeout(resolve, 100));

// 3. 获取新 shape
const newShapes = shapesAfter.filter(s => !shapeIdsBefore.has(s.id));

// 4. 选中并缩放
editor.select(lastShape.id);
editor.zoomToBounds(bounds, { ... });
```

## 最佳实践

### 推荐工作流

1. **单图上传**
   ```
   拖拽图片 → 自动选中 → 查看操作栏 → 编辑
   ```

2. **批量上传**
   ```
   拖拽多张 → 依次添加 → 最后一张自动选中 → 逐个编辑
   ```

3. **重复操作**
   ```
   编辑完 → 点击空白处 → 选择下一张 → 继续编辑
   ```

### 性能优化

```javascript
// 避免重复处理
const processedImagesRef = useRef(new Set());

// 批量操作标志
const isProcessingRef = useRef(false);

// 防止并发
if (isProcessingRef.current) return;
```

## 故障排除

### 问题1: 操作栏不显示

**原因**: 视口缩放未完成  
**解决**: 等待动画完成（300ms）或手动点击图片

### 问题2: 图片不在视口中

**原因**: 画布位置不正确  
**解决**: 使用 `Ctrl + 0` 重置缩放

### 问题3: 选择框消失

**原因**: 误点击空白处取消了选择  
**解决**: 重新点击图片即可

### 问题4: 多个图片重叠

**原因**: 同时上传多张图片  
**解决**: 拖动图片到不同位置，使用图层面板管理

## 后续优化

### 计划中的改进

- [ ] 批量上传时平铺排列
- [ ] 自定义上传位置
- [ ] 图片预加载优化
- [ ] 缩略图预览
- [ ] 拖拽排序支持

### V2.1 功能

- [ ] 智能图片对齐
- [ ] 批量编辑模式
- [ ] 图片格式转换
- [ ] 压缩和优化

## 相关文档

- [Canvas 2.0 升级摘要](./V2.0_UPGRADE_SUMMARY.md)
- [快速开始指南](./QUICK_START_V2.md)
- [完整文档](./README.md)

---

**更新时间**: 2024-11-26  
**版本**: 2.0.0  
**状态**: ✅ 已修复

