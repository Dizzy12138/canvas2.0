# 图层功能实现计划

## 一、总体架构设计

### 1.1 数据模型设计

#### 图层模型 (Layer)
```javascript
// 前端图层对象结构
interface Layer {
  id: string;                    // 图层唯一标识
  name: string;                  // 图层名称
  visible: boolean;              // 可见性
  locked: boolean;               // 锁定状态
  opacity: number;               // 不透明度 (0-1)
  blendMode: string;             // 混合模式 ('normal', 'multiply', 'overlay', 'screen'等)
  orderIndex: number;            // 图层顺序索引
  maskId?: string;               // 关联的蒙版ID
  effects?: LayerEffect[];       // 图层效果数组
  parentId?: string;             // 父图层组ID（用于图层文件夹）
  children?: string[];           // 子图层ID数组
  thumbnail?: string;            // 缩略图URL
  createdAt: Date;               // 创建时间
  updatedAt: Date;               // 更新时间
}

// 图层效果模型
interface LayerEffect {
  id: string;
  type: 'blur' | 'brightness' | 'contrast' | 'hue' | 'saturation' | 'shadow' | 'glow';
  parameters: any;               // 效果参数
  enabled: boolean;              // 是否启用
}

// 蒙版模型
interface LayerMask {
  id: string;
  layerId: string;
  type: 'clip' | 'alpha';        // 剪贴蒙版或Alpha蒙版
  data: string;                  // 蒙版数据（可以是图像URL或路径数据）
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  inverted: boolean;             // 是否反相
  density: number;               // 密度 (0-1)
  feather: number;               // 羽化半径
}
```

#### 后端数据模型扩展
```javascript
// 扩展Project模型中的canvas_data字段
const projectSchema = new mongoose.Schema({
  // ... 现有字段
  canvas_data: {
    width: { type: Number, default: 800 },
    height: { type: Number, default: 600 },
    background: { type: String, default: '#ffffff' },
    layers: [{
      id: String,
      name: String,
      visible: { type: Boolean, default: true },
      locked: { type: Boolean, default: false },
      opacity: { type: Number, default: 1 },
      blendMode: { type: String, default: 'normal' },
      orderIndex: Number,
      maskId: String,
      effects: [{
        id: String,
        type: String,
        parameters: mongoose.Schema.Types.Mixed,
        enabled: { type: Boolean, default: true }
      }],
      parentId: String,
      children: [String],
      thumbnail: String,
      createdAt: Date,
      updatedAt: Date
    }],
    masks: [{
      id: String,
      layerId: String,
      type: { type: String, enum: ['clip', 'alpha'] },
      data: String,
      bounds: {
        x: Number,
        y: Number,
        width: Number,
        height: Number
      },
      inverted: { type: Boolean, default: false },
      density: { type: Number, default: 1 },
      feather: { type: Number, default: 0 }
    }],
    transform: { type: mongoose.Schema.Types.Mixed, default: {} }
  }
});
```

### 1.2 API接口设计

#### 图层管理接口
```javascript
// 获取画布图层列表
GET /api/projects/:projectId/layers

// 创建新图层
POST /api/projects/:projectId/layers
{
  "name": "新图层",
  "opacity": 1.0,
  "blendMode": "normal",
  "visible": true
}

// 修改图层属性
PATCH /api/projects/:projectId/layers/:layerId
{
  "name": "更新后的图层名",
  "opacity": 0.8,
  "visible": false,
  "blendMode": "multiply"
}

// 删除图层
DELETE /api/projects/:projectId/layers/:layerId

// 重命名图层
PUT /api/projects/:projectId/layers/:layerId/rename
{
  "name": "新名称"
}

// 切换图层可见性
PUT /api/projects/:projectId/layers/:layerId/visibility
{
  "visible": true
}

// 切换图层锁定状态
PUT /api/projects/:projectId/layers/:layerId/lock
{
  "locked": true
}

// 调整图层顺序
PUT /api/projects/:projectId/layers/:layerId/order
{
  "orderIndex": 2
}

// 合并图层
POST /api/projects/:projectId/layers/merge
{
  "sourceLayerId": "layer_1",
  "targetLayerId": "layer_2",
  "mode": "flatten"  // 或 "retain_separate_masked_regions"
}

// 复制图层
POST /api/projects/:projectId/layers/:layerId/copy

// 创建图层组
POST /api/projects/:projectId/layer-groups
{
  "name": "图层组",
  "layers": ["layer_1", "layer_2"]
}
```

#### 蒙版管理接口
```javascript
// 为图层创建蒙版
POST /api/projects/:projectId/layers/:layerId/mask
{
  "type": "alpha",
  "bounds": { "x": 0, "y": 0, "width": 800, "height": 600 }
}

// 更新蒙版
PATCH /api/projects/:projectId/masks/:maskId
{
  "inverted": true,
  "density": 0.8,
  "feather": 10
}

// 删除蒙版
DELETE /api/projects/:projectId/masks/:maskId

// 应用蒙版到图层
POST /api/projects/:projectId/layers/:layerId/apply-mask
{
  "maskId": "mask_1"
}
```

#### 图层效果接口
```javascript
// 添加图层效果
POST /api/projects/:projectId/layers/:layerId/effects
{
  "type": "blur",
  "parameters": { "radius": 5 }
}

// 更新图层效果
PATCH /api/projects/:projectId/layers/:layerId/effects/:effectId
{
  "parameters": { "radius": 10 },
  "enabled": true
}

// 删除图层效果
DELETE /api/projects/:projectId/layers/:layerId/effects/:effectId
```

## 二、分阶段实施计划

### 第一阶段：基础图层支持 (2-3周)

#### 2.1 前端实现
1. **图层数据结构扩展**
   - 扩展现有的useLayers hook，添加opacity、blendMode等属性
   - 更新LayerPanel组件，支持不透明度调节和混合模式选择
   - 添加图层缩略图生成功能

2. **图层操作功能**
   - 实现图层创建、删除、重命名
   - 实现图层顺序调整（上移/下移）
   - 实现图层可见性/锁定切换
   - 实现图层不透明度调节

3. **渲染引擎集成**
   - 修改FabricCanvasFixed组件，支持按图层渲染对象
   - 实现基础的图层合成（考虑不透明度）
   - 添加脏区重绘优化

#### 2.2 后端实现
1. **数据模型扩展**
   - 扩展Project模型中的layers字段，添加新属性
   - 添加图层版本管理支持

2. **API接口实现**
   - 实现基础的图层管理接口
   - 实现图层属性更新接口

3. **存储优化**
   - 实现图层级别的数据存储
   - 添加图层缩略图缓存机制

### 第二阶段：进阶混合/遮罩/组/特效 (3-4周)

#### 2.1 前端实现
1. **混合模式支持**
   - 实现多种混合模式（multiply, overlay, screen等）
   - 在渲染时应用混合模式

2. **图层蒙版功能**
   - 实现Alpha蒙版创建和编辑
   - 实现剪贴蒙版功能
   - 实现蒙版属性调节（反相、密度、羽化）

3. **图层组支持**
   - 实现图层文件夹/组功能
   - 支持组内图层的折叠/展开
   - 支持对组的整体操作

4. **基础滤镜/效果**
   - 实现模糊、亮度、对比度等基础效果
   - 在渲染时应用这些效果

#### 2.2 后端实现
1. **数据模型扩展**
   - 添加蒙版数据模型
   - 添加图层效果数据模型
   - 添加图层组数据结构

2. **API接口实现**
   - 实现蒙版管理接口
   - 实现图层效果接口
   - 实现图层组合并接口

### 第三阶段：AI集成/跨图层融合/高级版本管理 (4-5周)

#### 3.1 前端实现
1. **AI操作图层交互**
   - 在AI生成面板中添加目标图层选择
   - 实现跨图层融合预览
   - 添加生成区域与图层关系可视化

2. **高级图层操作**
   - 实现图层合并/拆分功能
   - 实现图层克隆功能
   - 实现图层历史版本对比

#### 3.2 后端实现
1. **AI集成**
   - 扩展生成接口，支持目标图层参数
   - 实现跨图层融合算法
   - 添加生成结果的图层分配逻辑

2. **版本管理**
   - 实现图层级别的版本快照
   - 实现图层历史回滚功能
   - 添加图层变更差异存储

### 第四阶段：性能优化/大规模/协作/扩展 (3-4周)

#### 4.1 性能优化
1. **渲染优化**
   - 实现瓦片化渲染
   - 添加多线程/Web Worker支持
   - 实现GPU加速渲染

2. **缓存策略**
   - 实现预合成缓存
   - 添加图层合并策略
   - 实现后台质量提升

#### 4.2 协作功能
1. **多人编辑**
   - 实现图层冲突解决机制
   - 添加实时协作同步
   - 实现操作权限控制

#### 4.3 扩展机制
1. **插件系统**
   - 实现滤镜/效果插件机制
   - 添加自定义工具扩展支持

## 三、关键技术挑战与解决方案

### 3.1 图层与AI操作的层交互
**挑战**：AI生成操作需要考虑邻近图层的上下文信息
**解决方案**：
1. 在生成请求中包含上下文图层信息
2. 实现跨图层内容分析算法
3. 添加生成区域与多图层关系处理

### 3.2 性能与渲染开销
**挑战**：多图层合成可能带来性能瓶颈
**解决方案**：
1. 实现部分重绘/脏区优化
2. 添加图层缓存/预合成缓存
3. 实现瓦片化渲染
4. 对复杂效果使用后台高质量渲染

### 3.3 版本/历史管理复杂度
**挑战**：图层级别的历史变动管理复杂
**解决方案**：
1. 实现图层级别的差分快照
2. 添加图层合并/拆分的历史处理
3. 实现可视化的历史差异对比

### 3.4 存储/数据规模
**挑战**：大规模图层数据存储成本高
**解决方案**：
1. 实现压缩/差异存储
2. 添加冷热分层存储策略
3. 优化蒙版/效果数据存储

## 四、用户界面设计

### 4.1 图层面板
- 图层列表显示（支持拖拽排序）
- 图层属性编辑（名称、可见性、锁定、不透明度、混合模式）
- 图层操作按钮（新建、删除、复制、合并）
- 图层组支持（折叠/展开）

### 4.2 蒙版面板
- 蒙版创建工具（矩形、圆形、自由绘制）
- 蒙版属性调节（反相、密度、羽化）
- 蒙版应用预览

### 4.3 效果面板
- 效果列表显示
- 效果参数调节
- 效果开关控制

## 五、测试策略

### 5.1 单元测试
- 图层数据结构验证
- 图层操作功能测试
- 渲染合成逻辑测试

### 5.2 集成测试
- 图层与画布交互测试
- 图层与AI生成集成测试
- 多图层性能测试

### 5.3 用户验收测试
- 图层基本操作用户体验测试
- 复杂图层场景测试
- 性能基准测试

## 六、风险评估与应对

### 6.1 技术风险
1. **渲染性能问题**
   - 应对：提前进行性能基准测试，准备优化方案

2. **复杂效果实现难度**
   - 应对：分阶段实现，优先核心功能

### 6.2 时间风险
1. **开发周期超出预期**
   - 应对：设置里程碑检查点，及时调整计划

### 6.3 用户接受度风险
1. **用户对新功能不适应**
   - 应对：提供详细的使用文档和教程

## 七、交付物清单

### 7.1 第一阶段交付物
- 基础图层管理功能
- 图层面板UI
- 基础图层API接口
- 图层数据存储方案

### 7.2 第二阶段交付物
- 混合模式支持
- 蒙版功能
- 图层组支持
- 基础滤镜效果

### 7.3 第三阶段交付物
- AI集成图层操作
- 高级图层管理
- 版本历史功能

### 7.4 第四阶段交付物
- 性能优化版本
- 协作功能
- 插件扩展机制