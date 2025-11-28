# Canvas 2.0 大版本升级计划

## 版本信息
- **当前版本**: 1.0.0
- **目标版本**: 2.0.0
- **升级类型**: 重大功能升级 + 性能优化
- **升级时间**: 2024年

## 一、升级概述

基于对整个项目的全面审查，Canvas 2.0 将在以下几个核心领域进行重大改进：

### 1.1 核心改进方向
1. **性能优化**: 渲染性能提升50%+，大幅图层场景支持
2. **用户体验**: 重构交互流程，提升操作便利性
3. **功能完善**: 补充缺失功能，优化现有特性
4. **架构升级**: 代码结构优化，提高可维护性
5. **智能化增强**: AI功能深度集成

## 二、性能优化计划

### 2.1 渲染性能优化 (P0 - 最高优先级)

#### 问题分析
1. **多图层场景性能瓶颈**
   - 每次图层变化都会触发全量重渲染
   - 缺少脏区检测机制
   - 图层排序算法效率低下

2. **缺少渲染缓存**
   - 未缓存图层合成结果
   - 重复渲染相同内容

#### 优化方案
```javascript
// 1. 实现增量渲染系统
class IncrementalRenderEngine {
  constructor() {
    this.layerCache = new Map(); // 图层渲染缓存
    this.dirtyLayers = new Set(); // 脏图层追踪
    this.compositeCache = null;   // 合成缓存
  }

  markDirty(layerId) {
    this.dirtyLayers.add(layerId);
    this.invalidateComposite();
  }

  render(layers) {
    // 只重新渲染脏图层
    this.dirtyLayers.forEach(layerId => {
      this.renderLayer(layerId);
    });
    
    // 合成所有图层
    return this.composite(layers);
  }
}

// 2. 虚拟化长列表
// 图层面板使用虚拟滚动，只渲染可见区域
import { FixedSizeList } from 'react-window';

// 3. Web Worker 后台渲染
// 将复杂图层效果移到 Worker 处理
```

**预期效果**:
- 渲染性能提升 60%
- 支持 100+ 图层流畅操作
- 首屏加载时间减少 40%

### 2.2 内存优化 (P0)

#### 问题分析
1. 图层历史记录无限增长
2. 未释放的图像资源
3. 重复的图层数据存储

#### 优化方案
```javascript
// 1. 图层历史限制与压缩
const MAX_HISTORY_SIZE = 50;
const useLayerHistoryOptimized = () => {
  const [history, setHistory] = useState([]);
  
  const addHistory = useCallback((snapshot) => {
    setHistory(prev => {
      const newHistory = [...prev, compressSnapshot(snapshot)];
      // 只保留最近 50 条记录
      return newHistory.slice(-MAX_HISTORY_SIZE);
    });
  }, []);
  
  return { history, addHistory };
};

// 2. 图像资源池管理
class ImageResourcePool {
  constructor() {
    this.pool = new Map();
    this.refCount = new Map();
  }
  
  acquire(url) {
    if (!this.pool.has(url)) {
      this.pool.set(url, loadImage(url));
      this.refCount.set(url, 0);
    }
    this.refCount.set(url, this.refCount.get(url) + 1);
    return this.pool.get(url);
  }
  
  release(url) {
    const count = this.refCount.get(url) - 1;
    this.refCount.set(url, count);
    
    if (count === 0) {
      // 延迟删除，避免频繁加载
      setTimeout(() => {
        if (this.refCount.get(url) === 0) {
          this.pool.delete(url);
          this.refCount.delete(url);
        }
      }, 60000); // 1分钟后清理
    }
  }
}
```

**预期效果**:
- 内存占用减少 50%
- 避免内存泄漏
- 长时间使用不卡顿

### 2.3 状态管理优化 (P1)

#### 问题分析
1. 过度使用 `useState` 导致不必要的重渲染
2. 缺少全局状态管理
3. 跨组件通信效率低

#### 优化方案
```javascript
// 使用 Zustand 替代部分 useState
import create from 'zustand';

// 分离频繁更新和不频繁更新的状态
const useCanvasStore = create((set, get) => ({
  // 频繁更新的状态
  cursor: { x: 0, y: 0 },
  zoom: 1,
  
  // 不频繁更新的状态
  layers: [],
  activeLayerId: null,
  
  // Actions
  updateCursor: (cursor) => set({ cursor }),
  updateZoom: (zoom) => set({ zoom }),
  
  // 批量更新优化
  batchUpdate: (updates) => set(updates),
}));

// 使用 useMemo 和 useCallback 减少重渲染
const LayerPanelOptimized = React.memo(({ layers, onLayerSelect }) => {
  const sortedLayers = useMemo(
    () => [...layers].sort((a, b) => a.orderIndex - b.orderIndex),
    [layers]
  );
  
  return <LayerList layers={sortedLayers} onSelect={onLayerSelect} />;
});
```

**预期效果**:
- 组件渲染次数减少 70%
- 交互响应时间降低 50ms+
- 代码可维护性提升

## 三、用户体验优化

### 3.1 交互流程重构 (P0)

#### 优化点
1. **图像选择操作栏优化** ✓ (已完成)
   - 悬浮操作栏集成所有常用功能
   - 一键涂抹、扩展、下载
   - 视觉反馈增强

2. **快捷键系统**
```javascript
const SHORTCUTS = {
  // 基础操作
  'ctrl+z': 'undo',
  'ctrl+shift+z': 'redo',
  'ctrl+c': 'copy',
  'ctrl+v': 'paste',
  'delete': 'delete',
  
  // 工具切换
  'v': 'select',
  'h': 'hand',
  'b': 'brush',
  'e': 'eraser',
  
  // 图层操作
  'ctrl+shift+n': 'newLayer',
  'ctrl+shift+d': 'duplicateLayer',
  'ctrl+e': 'mergeLayer',
  
  // 视图控制
  'ctrl++': 'zoomIn',
  'ctrl+-': 'zoomOut',
  'ctrl+0': 'zoomReset',
  'space': 'pan',
};
```

3. **智能引导系统**
```javascript
// 首次使用引导
const useOnboarding = () => {
  const [step, setStep] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  
  const steps = [
    { target: '.generator-panel', content: '从这里开始AI生成' },
    { target: '.canvas', content: '在画布上查看和编辑' },
    { target: '.layer-panel', content: '管理你的图层' },
  ];
  
  return { step, steps, nextStep: () => setStep(s => s + 1) };
};
```

### 3.2 响应式设计 (P1)

#### 优化点
1. **移动端适配**
   - 触摸手势支持
   - 响应式布局
   - 移动端工具栏

2. **多分辨率支持**
   - 4K 显示优化
   - Retina 屏幕适配

### 3.3 加载状态优化 (P1)

```javascript
// 骨架屏加载
const LoadingSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-12 bg-gray-200 rounded mb-4" />
    <div className="h-64 bg-gray-200 rounded" />
  </div>
);

// 渐进式加载
const ProgressiveImageLoading = ({ src }) => {
  const [loaded, setLoaded] = useState(false);
  const [placeholder, setPlaceholder] = useState(null);
  
  useEffect(() => {
    // 先加载低质量版本
    loadLowQuality(src).then(setPlaceholder);
    // 再加载高质量版本
    loadHighQuality(src).then(() => setLoaded(true));
  }, [src]);
  
  return loaded ? <img src={src} /> : <img src={placeholder} />;
};
```

## 四、功能完善计划

### 4.1 画布增强功能 (P0)

#### 新增功能
1. **多选与批量操作**
```javascript
// 框选多个对象
const useBoxSelect = () => {
  const [box, setBox] = useState(null);
  const [selected, setSelected] = useState([]);
  
  const onMouseDown = (e) => {
    setBox({ x: e.clientX, y: e.clientY, w: 0, h: 0 });
  };
  
  const onMouseMove = (e) => {
    if (!box) return;
    setBox({
      ...box,
      w: e.clientX - box.x,
      h: e.clientY - box.y
    });
  };
  
  const onMouseUp = () => {
    // 查找框内的所有对象
    const objects = findObjectsInBox(box);
    setSelected(objects);
    setBox(null);
  };
  
  return { box, selected, onMouseDown, onMouseMove, onMouseUp };
};

// 批量应用效果
const batchApplyEffect = (layerIds, effect) => {
  setLayers(prev => prev.map(layer => 
    layerIds.includes(layer.id)
      ? { ...layer, effects: [...layer.effects, effect] }
      : layer
  ));
};
```

2. **智能对齐与分布**
   - 自动对齐参考线
   - 智能间距建议
   - 对象吸附

3. **形状库与模板**
```javascript
// 预设形状库
const SHAPE_LIBRARY = {
  basic: [
    { type: 'rectangle', icon: '□' },
    { type: 'circle', icon: '○' },
    { type: 'triangle', icon: '△' },
  ],
  arrows: [
    { type: 'arrow-right', icon: '→' },
    { type: 'arrow-left', icon: '←' },
  ],
  // ... more shapes
};

// 模板系统
const TEMPLATES = {
  'social-media': {
    name: '社交媒体海报',
    size: { width: 1080, height: 1920 },
    layers: [
      { type: 'background', color: '#fff' },
      { type: 'text', content: '标题', style: 'h1' },
    ]
  },
  // ... more templates
};
```

### 4.2 AI功能增强 (P0)

#### 优化点
1. **智能提示词优化**
```javascript
// AI 提示词增强
const enhancePrompt = async (prompt) => {
  // 分析用户意图
  const intent = analyzeIntent(prompt);
  
  // 添加质量修饰词
  const qualityModifiers = ['high quality', 'detailed', '4k'];
  
  // 添加风格建议
  const styleModifiers = suggestStyle(intent);
  
  return `${prompt}, ${styleModifiers.join(', ')}, ${qualityModifiers.join(', ')}`;
};

// 提示词模板
const PROMPT_TEMPLATES = {
  portrait: 'portrait of {subject}, {style}, professional lighting',
  landscape: '{scene}, {time_of_day}, {weather}, scenic view',
  product: '{product}, {background}, commercial photography',
};
```

2. **局部重绘优化**
   - 智能区域检测
   - 边缘融合
   - 多次迭代支持

3. **批量生成**
```javascript
// 批量 AI 生成
const batchGenerate = async (prompts, options) => {
  const results = [];
  const batchSize = 4; // 每批处理4个
  
  for (let i = 0; i < prompts.length; i += batchSize) {
    const batch = prompts.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(prompt => generateImage(prompt, options))
    );
    results.push(...batchResults);
    
    // 进度更新
    onProgress((i + batchSize) / prompts.length);
  }
  
  return results;
};
```

### 4.3 协作功能 (P2)

```javascript
// WebRTC 实时协作
const useCollaboration = (roomId) => {
  const [peers, setPeers] = useState([]);
  const [changes, setChanges] = useState([]);
  
  useEffect(() => {
    const socket = io('/collaboration');
    
    socket.emit('join-room', roomId);
    
    socket.on('peer-joined', (peer) => {
      setPeers(prev => [...prev, peer]);
    });
    
    socket.on('layer-changed', (change) => {
      applyRemoteChange(change);
    });
    
    return () => socket.disconnect();
  }, [roomId]);
  
  const broadcastChange = (change) => {
    socket.emit('layer-change', change);
  };
  
  return { peers, broadcastChange };
};
```

## 五、架构优化

### 5.1 代码结构优化 (P1)

#### 重构计划
1. **组件拆分**
   - 将 OuzhiArtPlatform 拆分为更小的子组件
   - 每个组件职责单一

2. **Hooks 抽象**
```javascript
// 统一的画布操作 Hook
const useCanvas = () => {
  const editorRef = useRef(null);
  const layers = useCanvasStore(state => state.layers);
  
  const addShape = useCallback((shape) => {
    // ...
  }, []);
  
  const updateShape = useCallback((id, updates) => {
    // ...
  }, []);
  
  return {
    editorRef,
    layers,
    addShape,
    updateShape,
    // ... more methods
  };
};
```

3. **工具类重构**
```javascript
// 统一的图层工具类
class LayerUtils {
  static merge(layers) { /* ... */ }
  static split(layer) { /* ... */ }
  static duplicate(layer) { /* ... */ }
  static export(layer, format) { /* ... */ }
}

// 统一的图像处理工具
class ImageProcessor {
  static async resize(image, size) { /* ... */ }
  static async crop(image, bounds) { /* ... */ }
  static async filter(image, filter) { /* ... */ }
}
```

### 5.2 类型安全 (P2)

```typescript
// 引入 TypeScript 类型定义
interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  blendMode: BlendMode;
  effects: LayerEffect[];
  shapeIds: string[];
}

interface LayerEffect {
  type: EffectType;
  params: Record<string, any>;
  enabled: boolean;
}
```

### 5.3 测试覆盖 (P2)

```javascript
// 单元测试
describe('useEnhancedLayers', () => {
  it('should add layer correctly', () => {
    const { result } = renderHook(() => useEnhancedLayers());
    act(() => {
      result.current.addLayer({ name: 'Test Layer' });
    });
    expect(result.current.layers).toHaveLength(1);
    expect(result.current.layers[0].name).toBe('Test Layer');
  });
});

// E2E 测试
describe('Canvas workflow', () => {
  it('should generate and edit image', async () => {
    await page.goto('/ouzhi');
    await page.click('[data-testid="generate-button"]');
    await page.waitForSelector('[data-testid="generated-image"]');
    await page.click('[data-testid="generated-image"]');
    await page.click('[data-testid="edit-button"]');
    // ... more steps
  });
});
```

## 六、实施计划

### Phase 1: 核心性能优化 (2周)
- [ ] 增量渲染系统
- [ ] 内存优化
- [ ] 状态管理优化
- [ ] 虚拟化列表

### Phase 2: 用户体验提升 (2周)
- [ ] 交互流程优化
- [ ] 快捷键系统
- [ ] 加载状态优化
- [ ] 响应式设计

### Phase 3: 功能完善 (3周)
- [ ] 多选与批量操作
- [ ] AI 功能增强
- [ ] 模板系统
- [ ] 智能对齐

### Phase 4: 架构升级 (2周)
- [ ] 代码重构
- [ ] TypeScript 迁移
- [ ] 测试覆盖
- [ ] 文档完善

### Phase 5: 测试与发布 (1周)
- [ ] 性能测试
- [ ] 用户测试
- [ ] Bug 修复
- [ ] 版本发布

## 七、成功指标

### 性能指标
- 渲染帧率: ≥ 60 FPS
- 首屏加载: ≤ 2s
- 交互响应: ≤ 100ms
- 内存占用: ≤ 500MB (100图层场景)

### 用户体验指标
- 任务完成时间: 减少 30%
- 用户满意度: ≥ 4.5/5
- 功能发现率: ≥ 80%
- 错误率: ≤ 1%

### 代码质量指标
- 测试覆盖率: ≥ 80%
- 代码重复率: ≤ 5%
- 类型覆盖率: ≥ 90%
- 构建时间: ≤ 30s

## 八、风险与应对

### 风险1: 性能优化可能引入新bug
**应对**: 
- 充分的单元测试和集成测试
- 灰度发布策略
- 快速回滚机制

### 风险2: 大规模重构影响开发进度
**应对**:
- 分阶段进行，小步快跑
- 保持向后兼容
- 持续集成验证

### 风险3: 新功能学习成本
**应对**:
- 详细的用户文档
- 交互式教程
- 视频演示

## 九、总结

Canvas 2.0 是一次全面的升级，将在性能、用户体验、功能完善和代码质量等多个维度实现重大提升。通过系统化的规划和执行，我们将打造一个更快、更好用、更强大的AI画布工具。

