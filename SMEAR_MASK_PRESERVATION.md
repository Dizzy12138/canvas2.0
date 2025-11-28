# 涂抹工具遮罩保留功能

## 用户需求

**重要说明**：
1. **绘制完成后，遮罩（黑色半透明路径）必须持续显示**
2. **点击"取消"时，也要保留遮罩作为 mask 图层**（而不是清除）

## 需求分析

### 当前行为（修复前）

```
绘制涂抹路径 → 松开鼠标 → 显示"保留/擦除/取消"
  ↓
点击"取消"
  → setSelectionSession(null)
  → SelectionOverlay 组件卸载
  → 遮罩消失 ❌
  → 什么都不保存 ❌
```

### 期望行为（修复后）

```
绘制涂抹路径 → 松开鼠标 → 显示"保留/擦除/取消"
  ↓
点击"保留"
  → 保存 mask 到图层 ✅
  → 只保留涂抹区域 ✅
  → 退出涂抹模式 ✅

点击"擦除"
  → 保存 mask 到图层 ✅
  → 删除涂抹区域 ✅
  → 退出涂抹模式 ✅

点击"取消"
  → 保存 mask 到图层 ✅
  → 图像不修改 ✅
  → 退出涂抹模式 ✅
```

**关键区别**：
- **修复前**："取消"= 放弃所有操作，什么都不保存
- **修复后**："取消"= 保存 mask，但不修改图像

## 修复实现

### 修复前的 handleSmearCancel

```javascript
const handleSmearCancel = useCallback(() => {
  // 直接清除 session
  setSelectionSession(null);
  setSelectionAction(null);
}, []);
```

**问题**:
- ❌ 不保存 mask
- ❌ 遮罩消失
- ❌ 用户绘制的工作丢失

### 修复后的 handleSmearCancel

```javascript
const handleSmearCancel = useCallback(async () => {
  // 如果有 session 并且状态是 ready（已绘制完成），保存 mask
  if (selectionSession && 
      selectionSession.status === 'ready' && 
      selectionSession.maskDataUrl) {
    try {
      const layerId = getLayerIdByShapeId(selectionSession.shapeId);
      const layer = layers.find(l => l.id === layerId);
      
      if (layer) {
        // 使用 createMaskForLayer 创建蒙版
        createMaskForLayer(layerId, {
          type: 'smear-brush',
          data: selectionSession.points || [],
          maskImage: selectionSession.maskDataUrl,
          bounds: {
            x: selectionSession.pageBounds.minX,
            y: selectionSession.pageBounds.minY,
            width: selectionSession.pageBounds.width,
            height: selectionSession.pageBounds.height
          }
        });
        
        errorHandler.showSuccess('蒙版已保存');
      }
    } catch (error) {
      console.error('保存蒙版失败:', error);
    }
  }
  
  // 清除 session，退出涂抹模式
  setSelectionSession(null);
  setSelectionAction(null);
}, [selectionSession, getLayerIdByShapeId, layers, createMaskForLayer]);
```

**改进**:
- ✅ 检查是否已绘制完成（`status === 'ready'`）
- ✅ 保存 mask 到图层
- ✅ 显示成功提示
- ✅ 然后清除 session，退出涂抹模式
- ✅ 遮罩数据保留在图层面板中

## 完整工作流程

### 场景 1: 用户绘制后点击"保留"

```
1. 绘制涂抹路径
   → 实时显示黑色半透明预览 ✅
   ↓
2. 松开鼠标
   → 生成 mask
   → 显示"保留/擦除/取消"按钮 ✅
   ↓
3. 点击"保留"
   → handleApply('inverse')
   → 保存 mask 到图层 ✅
   → 只保留涂抹区域 ✅
   → 清除 session
   → 退出涂抹模式 ✅
```

### 场景 2: 用户绘制后点击"擦除"

```
1. 绘制涂抹路径
   → 实时显示黑色半透明预览 ✅
   ↓
2. 松开鼠标
   → 生成 mask
   → 显示"保留/擦除/取消"按钮 ✅
   ↓
3. 点击"擦除"
   → handleApply('erase')
   → 保存 mask 到图层 ✅
   → 删除涂抹区域 ✅
   → 清除 session
   → 退出涂抹模式 ✅
```

### 场景 3: 用户绘制后点击"取消"（本次修复）

```
1. 绘制涂抹路径
   → 实时显示黑色半透明预览 ✅
   ↓
2. 松开鼠标
   → 生成 mask
   → 显示"保留/擦除/取消"按钮 ✅
   ↓
3. 点击"取消"
   → handleSmearCancel()
   → 检查 session.status === 'ready' ✅
   → 保存 mask 到图层 ✅ （新增）
   → 图像保持不变 ✅
   → 显示"蒙版已保存" ✅
   → 清除 session
   → 退出涂抹模式 ✅
   ↓
4. 结果
   → 原图不变 ✅
   → mask 保存在图层面板中 ✅
   → 可以随时查看/修改 mask ✅
```

### 场景 4: 用户点击"涂抹"但未绘制就取消

```
1. 点击"涂抹"
   → 进入涂抹模式
   → 显示笔刷大小控制
   ↓
2. 直接点击"完成"（取消）
   → handleSmearCancel()
   → session.status !== 'ready' (还是 'drawing')
   → 不保存 mask（因为没有绘制）✅
   → 清除 session
   → 退出涂抹模式 ✅
```

## 按钮语义对比

### 修复前

| 按钮 | 操作 | Mask 保存 | 图像修改 | 用途 |
|------|------|-----------|----------|------|
| 保留 | 应用保留 | ✅ | ✅ 只保留 | 保留选区 |
| 擦除 | 应用擦除 | ✅ | ✅ 删除 | 擦除选区 |
| 取消 | 退出 | ❌ | ❌ 不变 | 放弃操作 |

**问题**: 点击"取消"会丢失所有工作

### 修复后

| 按钮 | 操作 | Mask 保存 | 图像修改 | 用途 |
|------|------|-----------|----------|------|
| 保留 | 应用保留 | ✅ | ✅ 只保留 | 保留选区 |
| 擦除 | 应用擦除 | ✅ | ✅ 删除 | 擦除选区 |
| 取消 | 保存 mask | ✅ | ❌ 不变 | 只保存 mask |

**改进**: 点击"取消"也保存 mask，但不修改图像

## 用户价值

### 修复前的问题

1. **用户体验差**
   - 用户花时间绘制了涂抹路径
   - 突然不确定要"保留"还是"擦除"
   - 想先退出看看效果
   - 点击"取消" → 所有工作丢失 ❌

2. **工作流程不合理**
   - 用户必须立即决定"保留"还是"擦除"
   - 不能先保存 mask，稍后再决定
   - 不能反复尝试不同效果

### 修复后的优势

1. **非破坏性工作流程**
   - 绘制 → 保存 mask → 稍后决定如何使用 ✅
   - 可以先点"取消"保存 mask
   - 稍后再来应用"保留"或"擦除"
   - 或者保留 mask 用于其他用途

2. **灵活性**
   - Mask 保存在图层面板中
   - 可以随时查看
   - 可以修改
   - 可以删除
   - 可以导出

3. **安全性**
   - 用户的工作不会轻易丢失
   - "取消"不再是"放弃"，而是"暂时保存"
   - 降低操作风险

## 技术细节

### 条件检查

```javascript
if (selectionSession && 
    selectionSession.status === 'ready' && 
    selectionSession.maskDataUrl) {
  // 保存 mask
}
```

**为什么检查 `status === 'ready'`**:
- `status === 'drawing'`: 用户还在绘制中，没有完成
- `status === 'ready'`: 用户已松开鼠标，绘制完成
- 只有完成后才有完整的 mask 数据

**为什么检查 `maskDataUrl`**:
- `maskDataUrl` 是在 `handleUp` 中生成的
- 确保 mask 图像已经创建
- 避免保存空 mask

### Mask 数据结构

```javascript
createMaskForLayer(layerId, {
  type: 'smear-brush',           // 类型标识
  data: selectionSession.points, // 路径点数组
  maskImage: maskDataUrl,        // mask 图像（黑白）
  bounds: {                      // 边界框
    x: pageBounds.minX,
    y: pageBounds.minY,
    width: pageBounds.width,
    height: pageBounds.height
  }
});
```

**完整的 mask 数据**:
- ✅ 路径点（可重新生成）
- ✅ Mask 图像（黑白）
- ✅ 边界信息
- ✅ 类型标识

## 测试场景

### 测试 1: 绘制后点击"取消"

```
1. 上传图片
2. 点击"涂抹"
3. 绘制一个圆形区域
4. 松开鼠标
   预期: 看到黑色半透明圆形 ✅
5. 点击"取消"
   预期: 
   - 显示"蒙版已保存" ✅
   - 原图不变 ✅
   - 退出涂抹模式 ✅
6. 查看图层面板
   预期: 看到新增的 mask ✅
```

### 测试 2: 未绘制就取消

```
1. 上传图片
2. 点击"涂抹"
3. 直接点击"完成"（不绘制）
   预期:
   - 不显示"蒙版已保存"（没有 mask）✅
   - 退出涂抹模式 ✅
4. 查看图层面板
   预期: 没有新增 mask ✅
```

### 测试 3: 连续操作

```
1. 上传图片
2. 第一次涂抹
   → 绘制路径 A
   → 点击"取消"
   → mask A 保存 ✅
3. 第二次涂抹
   → 绘制路径 B
   → 点击"擦除"
   → mask B 保存 + 删除 B 区域 ✅
4. 查看图层面板
   → 有 mask A ✅
   → 有 mask B ✅
5. 可以单独编辑/删除每个 mask ✅
```

## 代码对比

### handleSmearCancel 对比

**修复前**:
```javascript
const handleSmearCancel = useCallback(() => {
  setSelectionSession(null);    // ❌ 直接清除
  setSelectionAction(null);
}, []);

// 结果: mask 数据丢失
```

**修复后**:
```javascript
const handleSmearCancel = useCallback(async () => {
  // ✅ 先保存 mask（如果已绘制完成）
  if (selectionSession?.status === 'ready' && selectionSession.maskDataUrl) {
    createMaskForLayer(layerId, {
      type: 'smear-brush',
      data: selectionSession.points,
      maskImage: selectionSession.maskDataUrl,
      bounds: { ... }
    });
    errorHandler.showSuccess('蒙版已保存');
  }
  
  // ✅ 然后清除 session
  setSelectionSession(null);
  setSelectionAction(null);
}, [selectionSession, ...]);

// 结果: mask 数据保留
```

## 相关修复

- [涂抹预览最终修复](./SMEAR_PREVIEW_FINAL_FIX.md) - 预览持续显示
- [涂抹显示和模式修复](./SMEAR_DISPLAY_AND_MODE_FIX.md) - 按钮功能
- [涂抹 Mask 模式简化](./SMEAR_MASK_MODE_SIMPLIFIED.md) - 自动保存

---

**修复时间**: 2024-11-26  
**版本**: 2.0.17  
**状态**: ✅ 已修复  
**关键**: "取消"也保存 mask，实现非破坏性工作流程

