# 新组件使用示例 📖

> 快速上手指南 - 如何使用 P0 新增的组件

---

## 1. ErrorBoundary - 全局错误边界

### ✅ 已自动应用
无需任何操作，已在 `App.jsx` 中全局应用。

### 如何测试
在开发环境中，故意触发一个错误来测试：
```jsx
// 临时添加到任意组件中测试
const TestError = () => {
  throw new Error('测试错误边界');
};
```

### 预期效果
- 应用不会白屏崩溃
- 显示友好的错误 UI
- 提供重试、刷新、返回首页按钮
- 开发环境显示详细堆栈信息

---

## 2. LoadingIndicator - 加载状态

### 基础使用
```jsx
import LoadingIndicator, { Spinner, InlineLoader, ButtonLoader } from '@/components/common/LoadingIndicator';

// 示例1: 简单加载
<LoadingIndicator
  isLoading={isLoading}
  message="加载中..."
/>

// 示例2: 带进度条
<LoadingIndicator
  isLoading={isGenerating}
  message="正在生成图片..."
  progress={progress}  // 0-100
  estimatedTime={60}   // 秒
  onCancel={() => setIsGenerating(false)}
/>

// 示例3: 多阶段进度
<LoadingIndicator
  isLoading={isGenerating}
  message="正在处理..."
  stages={[
    { key: 'submit', label: '提交任务', duration: 1 },
    { key: 'queue', label: '排队中', duration: 3 },
    { key: 'processing', label: '处理中', duration: 30 },
    { key: 'done', label: '完成', duration: 1 }
  ]}
  currentStage={2}  // 当前在第3个阶段
  overlay={true}    // 覆盖整个页面
/>

// 示例4: 小组件
<Spinner size="md" />
<InlineLoader text="加载中..." />
<button disabled={loading}>
  {loading ? <ButtonLoader /> : '提交'}
</button>
```

### 在 OuzhiArtPlatform 中使用
```jsx
// 找到生成图片的地方
const [generationStage, setGenerationStage] = useState(0);
const generationStages = [
  { key: 'submit', label: '提交任务', duration: 1 },
  { key: 'processing', label: 'AI 处理中', duration: 30 },
  { key: 'polling', label: '获取结果', duration: 5 }
];

// 在 handleAIGenerate 中更新阶段
const handleAIGenerate = async (params) => {
  setIsGenerating(true);
  setGenerationStage(0);
  
  try {
    setGenerationStage(1); // 处理中
    const result = await api.post('/generate', params);
    
    setGenerationStage(2); // 获取结果
    await pollResult(result.promptId);
    
    setGenerationStage(3); // 完成
  } finally {
    setIsGenerating(false);
  }
};

// 在 JSX 中渲染
{isGenerating && (
  <LoadingIndicator
    isLoading={true}
    message="正在生成图片..."
    stages={generationStages}
    currentStage={generationStage}
    onCancel={() => {
      setIsGenerating(false);
      // 取消生成逻辑
    }}
    overlay={true}
  />
)}
```

---

## 3. Toast - 通知系统

### 独立使用（推荐）
```jsx
import toast from '@/components/common/Toast';

// 成功提示
toast.success('操作成功', '图层已创建');

// 错误提示
toast.error('操作失败', '网络连接错误');

// 警告提示
toast.warning('请注意', '文件大小超过 10MB');

// 信息提示
toast.info('提示', '您有新消息');
```

### 在实际场景中使用
```jsx
// 创建图层
const handleLayerAdd = async () => {
  try {
    const newLayer = await createLayer();
    toast.success('图层已创建', `新图层 "${newLayer.name}" 已添加`);
  } catch (error) {
    toast.error('创建失败', error.message);
  }
};

// 删除图层
const handleLayerDelete = async (layerId) => {
  try {
    await deleteLayer(layerId);
    toast.success('图层已删除', '操作已完成');
  } catch (error) {
    toast.error('删除失败', error.message);
  }
};

// 保存项目
const handleSave = async () => {
  try {
    await saveProject();
    toast.success('保存成功', '项目已保存');
  } catch (error) {
    toast.error('保存失败', '请检查网络连接');
  }
};
```

### 带操作按钮的 Toast
```jsx
// 使用 ToastProvider（高级用法）
import { ToastProvider, useToast } from '@/components/common/Toast';

// 在 App.jsx 中包裹
<ToastProvider position="top-right">
  <App />
</ToastProvider>

// 在组件中使用
const { toast } = useToast();

toast.success('操作成功', {
  message: '图层已删除',
  action: {
    label: '撤销',
    onClick: () => {
      undoDelete();
    }
  },
  duration: 5000
});
```

---

## 4. EmptyState - 空状态

### 在 LayerPanel 中使用
```jsx
import { NoLayersState } from '@/components/common/EmptyState';

const LayerPanel = ({ layers, onLayerAdd, ... }) => {
  return (
    <div className="layer-panel">
      {layers.length === 0 ? (
        <NoLayersState
          onCreateLayer={onLayerAdd}
          onUploadImage={handleImageUpload}
        />
      ) : (
        <div className="layer-list">
          {layers.map(layer => <LayerItem key={layer.id} layer={layer} />)}
        </div>
      )}
    </div>
  );
};
```

### 自定义空状态
```jsx
import EmptyState from '@/components/common/EmptyState';
import { Layers, Upload } from 'lucide-react';

<EmptyState
  icon={Layers}
  title="还没有图层"
  description="创建第一个图层开始您的创作之旅"
  actions={[
    {
      label: '上传图片',
      onClick: handleUpload,
      primary: true,
      icon: <Upload size={16} />
    },
    {
      label: '新建空白图层',
      onClick: handleNewLayer
    },
    {
      label: '查看教程',
      onClick: openTutorial,
      variant: 'link'
    }
  ]}
  tips={[
    '支持拖拽上传图片文件',
    '可以使用快捷键 Ctrl+V 粘贴图片',
    '支持 PNG、JPG、WebP 格式'
  ]}
  size="md"
/>
```

### 其他预设组件
```jsx
import { 
  NoSearchResultsState, 
  NoDataState, 
  LoadErrorState 
} from '@/components/common/EmptyState';

// 无搜索结果
<NoSearchResultsState
  query={searchQuery}
  onClearSearch={() => setSearchQuery('')}
/>

// 无数据
<NoDataState
  title="暂无历史记录"
  description="还没有任何操作记录"
  onRefresh={fetchHistory}
/>

// 加载失败
<LoadErrorState onRetry={retryLoad} />
```

---

## 5. KeyboardShortcuts - 快捷键系统

### 完整集成示例
```jsx
import KeyboardShortcutsHelp, { 
  useKeyboardShortcuts,
  ShortcutHelpButton,
  shortcuts 
} from '@/components/common/KeyboardShortcuts';

const OuzhiArtPlatform = () => {
  // 快捷键处理函数
  const shortcutHandlers = {
    // 基础操作
    undo: () => {
      if (canUndo) handleUndo();
    },
    redo: () => {
      if (canRedo) handleRedo();
    },
    copy: () => {
      if (selectedLayerIds.size > 0) handleCopy();
    },
    paste: () => {
      handlePaste();
    },
    delete: () => {
      if (selectedLayerIds.size > 0) handleDelete();
    },
    save: () => {
      handleSave();
    },
    
    // 图层操作
    newLayer: () => {
      handleLayerAdd();
    },
    duplicateLayer: () => {
      if (activeLayerId) handleLayerDuplicate(activeLayerId);
    },
    groupLayers: () => {
      if (selectedLayerIds.size > 1) handleGroupSelectedLayers();
    },
    prevLayer: () => {
      selectPrevLayer();
    },
    nextLayer: () => {
      selectNextLayer();
    },
    
    // 面板切换
    toggleLayers: () => {
      setIsLayerPanelCollapsed(prev => !prev);
    }
  };

  const { helpOpen, setHelpOpen } = useKeyboardShortcuts(shortcutHandlers);

  return (
    <div>
      {/* 主要内容 */}
      {/* ... */}

      {/* 快捷键帮助 */}
      <KeyboardShortcutsHelp
        isOpen={helpOpen}
        onClose={() => setHelpOpen(false)}
      />

      {/* 快捷键帮助按钮 */}
      <ShortcutHelpButton onClick={() => setHelpOpen(true)} />
    </div>
  );
};
```

### 快捷键列表
所有可用的快捷键在 `shortcuts` 对象中定义：

```javascript
import { shortcuts } from '@/components/common/KeyboardShortcuts';

// 查看所有快捷键
console.log(shortcuts);

// 自定义快捷键处理
const handlers = {
  undo: myUndoFunction,
  redo: myRedoFunction,
  // ... 根据需要实现
};
```

---

## 6. API 错误处理

### ✅ 已自动应用
所有 API 请求都会自动使用优化后的错误处理。

### 自动处理的场景
```javascript
// 401 - 未认证
// 自动: 清除 token + 跳转登录 + Toast 提示

// 403 - 无权限
// 自动: Toast 提示 "您没有权限执行此操作"

// 404 - 资源不存在
// 自动: Toast 提示 "请求的资源不存在"

// 429 - 请求过频
// 自动: Toast 提示 + 自动重试（最多3次）

// 500/502/503/504 - 服务器错误
// 自动: Toast 提示 "服务器错误，请稍后重试"

// 网络错误
// 自动: Toast 提示 "网络连接失败"
```

### 无需改动现有代码
```jsx
// 现有代码继续正常工作
try {
  const result = await api.post('/generate', params);
  // 处理成功
} catch (error) {
  // API 拦截器已自动显示 Toast
  // 这里只需处理业务逻辑
}
```

---

## 🎯 快速集成指南

### 步骤 1: 在主组件中添加 Toast 示例
找到 `src/components/OuzhiArtPlatform.jsx`，在需要反馈的地方添加：

```jsx
import toast from '@/components/common/Toast';

// 图层创建成功
const handleLayerAdd = () => {
  const newLayer = addLayer();
  toast.success('图层已创建', `"${newLayer.name}" 已添加到画布`);
};

// 图层删除成功
const handleLayerDelete = (layerId) => {
  deleteLayer(layerId);
  toast.success('图层已删除', '操作已完成');
};
```

### 步骤 2: 添加空状态（可选）
在 `LayerPanel.jsx` 中：

```jsx
import { NoLayersState } from '@/components/common/EmptyState';

// 在渲染图层列表的地方
{layers.length === 0 ? (
  <NoLayersState
    onCreateLayer={onLayerAdd}
    onUploadImage={handleImageUpload}
  />
) : (
  // 正常的图层列表
)}
```

### 步骤 3: 添加快捷键（可选）
在主组件中：

```jsx
import KeyboardShortcutsHelp, { 
  useKeyboardShortcuts,
  ShortcutHelpButton 
} from '@/components/common/KeyboardShortcuts';

const { helpOpen, setHelpOpen } = useKeyboardShortcuts({
  undo: handleUndo,
  redo: handleRedo,
  save: handleSave,
  // 根据需要添加更多
});

// 在 JSX 中
<>
  {/* 内容 */}
  <KeyboardShortcutsHelp isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
  <ShortcutHelpButton onClick={() => setHelpOpen(true)} />
</>
```

---

## 💡 最佳实践

### Toast 使用建议
```jsx
// ✅ 好的做法
toast.success('操作成功', '图层已创建');  // 清晰的标题和描述

// ❌ 避免
toast.success('成功');  // 信息不明确
```

### LoadingIndicator 使用建议
```jsx
// ✅ 长时间操作使用覆盖层
<LoadingIndicator
  isLoading={isGenerating}
  message="正在生成图片..."
  overlay={true}  // 防止用户进行其他操作
/>

// ✅ 短时间操作使用内联
<InlineLoader text="保存中..." />

// ✅ 按钮操作使用按钮加载
<button disabled={saving}>
  {saving ? <ButtonLoader /> : '保存'}
</button>
```

### EmptyState 使用建议
```jsx
// ✅ 提供明确的操作引导
<EmptyState
  title="还没有图层"
  actions={[
    { label: '上传图片', onClick: handleUpload, primary: true },
    { label: '新建图层', onClick: handleCreate }
  ]}
  tips={[
    '支持拖拽上传',
    '支持 Ctrl+V 粘贴'
  ]}
/>

// ❌ 避免只显示文字，没有操作
<EmptyState title="暂无数据" />
```

---

## 🔍 调试技巧

### 查看错误日志
```javascript
// 在浏览器控制台中
const errorLogs = JSON.parse(localStorage.getItem('errorLogs') || '[]');
console.table(errorLogs);
```

### 测试 Toast
```javascript
// 在浏览器控制台中快速测试
import('@/components/common/Toast.jsx').then(module => {
  const toast = module.default;
  toast.success('测试成功');
  toast.error('测试错误');
  toast.warning('测试警告');
  toast.info('测试信息');
});
```

### 测试快捷键
1. 按 `?` 键打开快捷键帮助面板
2. 搜索想要的快捷键
3. 按 ESC 关闭面板

---

## 📝 迁移指南

### 从 errorHandler 迁移到 Toast
```jsx
// 旧代码
import errorHandler from '@/utils/errorHandler';
errorHandler.showSuccess('成功');
errorHandler.showError('失败');
errorHandler.showWarning('警告');

// 新代码
import toast from '@/components/common/Toast';
toast.success('操作成功', '详细信息');
toast.error('操作失败', '详细信息');
toast.warning('请注意', '详细信息');
```

**注意**: API 错误会自动显示 Toast，无需手动调用。

---

## 🎉 总结

### 新增的 5 个组件
1. **ErrorBoundary** - 已全局应用 ✅
2. **LoadingIndicator** - 随时可用
3. **Toast** - 随时可用（推荐立即使用）
4. **EmptyState** - 可选集成
5. **KeyboardShortcuts** - 可选集成

### 推荐集成顺序
1. **立即**: Toast（替换 errorHandler）
2. **今天**: EmptyState（图层面板）
3. **本周**: LoadingIndicator（生成进度）
4. **本周**: KeyboardShortcuts（快捷键）

### 工作量估计
- Toast 集成: 30 分钟
- EmptyState 集成: 30 分钟
- LoadingIndicator 集成: 1 小时
- KeyboardShortcuts 集成: 1 小时

**总计**: 约 3 小时可完成所有集成

---

**文档更新**: 2025-11-27  
**状态**: ✅ 组件就绪，可立即使用
EOF
cat /root/canvas2.0/USAGE_EXAMPLES.md
