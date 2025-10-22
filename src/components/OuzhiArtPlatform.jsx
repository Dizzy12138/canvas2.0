import React, { useState, useRef, useEffect } from 'react';
import { 
  Rocket, 
  Plus, 
  Image, 
  Type, 
  Square, 
  Circle, 
  Pen, 
  Undo, 
  Redo, 
  Copy, 
  Clipboard, 
  AlignLeft, 
  AlignCenter, 
  AlignRight,
  ZoomIn,
  ZoomOut,
  Maximize,
  MessageSquare,
  User,
  Bell,
  CreditCard,
  FileText,
  Settings,
  Star,
  RefreshCw,
  Send,
  Heart,
  ThumbsUp,
  ThumbsDown,
  // 添加缺失的图标
  MousePointer2,
  Hand,
  Eraser,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  ChevronRight,
  ChevronDown,
  Trash2,
  Crown,
  Minus,
  X,
  Layers,
  Scissors
} from 'lucide-react';
import { Tldraw, useEditor, useValue } from 'tldraw';
import 'tldraw/tldraw.css';
import clsx from 'clsx';
import { useEnhancedLayers } from '../hooks/useEnhancedLayers';
import { useLayerHistory } from '../hooks/useLayerHistory';

// 自定义工具组件，用于与tldraw集成
const TldrawCustomTools = ({ 
  activeTool, 
  onToolChange,
  onObjectAdded,
  onObjectModified,
  layers,
  toggleLayerVisibility
}) => {
  const editor = useEditor();
  
  // 监听选中形状的变化
  const selectedShapes = useValue('selected shapes', () => editor.getSelectedShapes(), [editor]);
  
  // 当选中形状变化时触发回调
  useEffect(() => {
    if (selectedShapes.length > 0) {
      // 触发对象修改回调
      onObjectModified?.(selectedShapes);
    }
  }, [selectedShapes, onObjectModified]);
  
  // 监听图层可见性变化并同步到tldraw
  useEffect(() => {
    if (!editor) return;
    
    // 遍历所有图层和对象，同步可见性
    layers.forEach(layer => {
      if (layer.objects) {
        layer.objects.forEach(obj => {
          try {
            const shape = editor.getShape(obj.id);
            if (shape) {
              // 使用正确的方式设置形状的可见性
              // tldraw中通过opacity属性控制可见性，0表示隐藏，1表示显示
              const currentOpacity = shape.opacity !== undefined ? shape.opacity : 1;
              const targetOpacity = layer.visible ? currentOpacity : 0;
              
              // 只有当需要改变时才更新
              if (currentOpacity !== targetOpacity) {
                editor.updateShape({
                  id: obj.id,
                  type: shape.type,
                  opacity: targetOpacity
                });
              }
            }
          } catch (error) {
            console.warn('Failed to update shape visibility:', error);
          }
        });
      }
    });
  }, [layers, editor]);
  
  // 监听形状创建事件
  useEffect(() => {
    if (!editor) return;
    
    const unsubscribe = editor.store.listen((changes) => {
      // 检查是否有新添加的形状
      Object.values(changes.changes.added).forEach((record) => {
        if (record.typeName === 'shape') {
          // 触发对象添加回调
          onObjectAdded?.(record);
        }
      });
    });
    
    return () => unsubscribe();
  }, [editor, onObjectAdded]);
  
  return null;
};

// 生成器面板组件
const GeneratorPanel = ({ 
  baseModel, 
  setBaseModel,
  loraModels,
  setLoraModels,
  prompt,
  setPrompt,
  recommendedThemes,
  imageSize,
  setImageSize,
  generationCount,
  setGenerationCount,
  onGenerate,
  isGenerating
}) => {
  const [showLoraSelector, setShowLoraSelector] = useState(false);
  const [showImageReference, setShowImageReference] = useState(false);
  const [showColorReference, setShowColorReference] = useState(false);
  const [advancedMode, setAdvancedMode] = useState(false);
  
  // 基础模型选项
  const baseModelOptions = [
    { id: 'star-3', name: '星流 Star-3', description: '默认基础模型' },
    { id: 'realistic', name: '写实模型', description: '高质量写实风格' },
    { id: 'anime', name: '动漫模型', description: '二次元动漫风格' },
    { id: 'artistic', name: '艺术模型', description: '艺术创作风格' }
  ];
  
  // LoRA模型选项
  const loraModelOptions = [
    { id: 'style-1', name: '风格滤镜1', description: '印象派风格' },
    { id: 'style-2', name: '风格滤镜2', description: '油画风格' },
    { id: 'element-1', name: '元素增强1', description: '建筑元素' },
    { id: 'element-2', name: '元素增强2', description: '自然元素' }
  ];
  
  // 图片尺寸选项
  const sizeOptions = [
    { label: '3:4', width: 768, height: 1024 },
    { label: '4:3', width: 1024, height: 768 },
    { label: '1:1', width: 1024, height: 1024 },
    { label: '16:9', width: 1024, height: 576 },
    { label: '9:16', width: 576, height: 1024 }
  ];
  
  // 添加LoRA模型
  const addLoraModel = (model) => {
    setLoraModels(prev => [...prev, model]);
    setShowLoraSelector(false);
  };
  
  // 移除LoRA模型
  const removeLoraModel = (id) => {
    setLoraModels(prev => prev.filter(model => model.id !== id));
  };
  
  return (
    <div className="w-80 h-full border-r bg-white flex flex-col">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold text-gray-900">生成器</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* 基础模型选择 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">基础模型</label>
          <select
            value={baseModel.id}
            onChange={(e) => {
              const model = baseModelOptions.find(m => m.id === e.target.value);
              setBaseModel(model);
            }}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {baseModelOptions.map(model => (
              <option key={model.id} value={model.id}>{model.name}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">{baseModel.description}</p>
        </div>
        
        {/* LoRA模型 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">增强模型（LoRA）</label>
            <button
              onClick={() => setShowLoraSelector(true)}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              添加 +
            </button>
          </div>
          
          {loraModels.length > 0 ? (
            <div className="space-y-2">
              {loraModels.map(model => (
                <div key={model.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{model.name}</div>
                    <div className="text-xs text-gray-500">{model.description}</div>
                  </div>
                  <button
                    onClick={() => removeLoraModel(model.id)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <Plus className="w-4 h-4 rotate-45" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500 text-sm">
              未添加增强模型
            </div>
          )}
        </div>
        
        {/* 描述输入框 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">描述</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="描述你想要的画面"
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            rows={4}
          />
          
          {/* 推荐主题 */}
          {recommendedThemes.length > 0 && (
            <div className="mt-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500">推荐主题</span>
                <button className="text-xs text-blue-600 hover:text-blue-800 flex items-center">
                  <RefreshCw className="w-3 h-3 mr-1" />
                  换一换
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recommendedThemes.map((theme, index) => (
                  <button
                    key={index}
                    onClick={() => setPrompt(theme)}
                    className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200"
                  >
                    {theme}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* 图生图 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">图生图</label>
            <button className="text-xs text-blue-600 hover:text-blue-800">+ 添加参考图</button>
          </div>
          <div className="border-2 border-dashed border-gray-300 rounded-md p-4 text-center">
            <Image className="w-6 h-6 text-gray-400 mx-auto mb-1" />
            <p className="text-xs text-gray-500">点击添加参考图</p>
          </div>
        </div>
        
        {/* 图片参考/颜色参考 */}
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">图片参考</label>
              <span className="text-xs text-orange-600">会员限定</span>
            </div>
            <button
              onClick={() => setShowImageReference(!showImageReference)}
              className="w-full p-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
            >
              {showImageReference ? '隐藏参考图' : '上传参考图'}
            </button>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">颜色参考</label>
            <div className="flex gap-2">
              {['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'].map(color => (
                <div
                  key={color}
                  className="w-8 h-8 rounded-md cursor-pointer border-2 border-white hover:border-gray-300"
                  style={{ backgroundColor: color }}
                />
              ))}
              <button className="w-8 h-8 rounded-md border border-gray-300 flex items-center justify-center text-gray-400 hover:text-gray-600">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        
        {/* 生成尺寸 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">生成尺寸</label>
          <div className="grid grid-cols-3 gap-2 mb-2">
            {sizeOptions.map(option => (
              <button
                key={option.label}
                onClick={() => setImageSize({ width: option.width, height: option.height })}
                className={clsx(
                  'p-2 text-xs rounded-md border',
                  imageSize.width === option.width && imageSize.height === option.height
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={imageSize.width}
              onChange={(e) => setImageSize(prev => ({ ...prev, width: parseInt(e.target.value) || 512 }))}
              className="w-full p-2 border border-gray-300 rounded-md text-sm"
              placeholder="宽度"
            />
            <span className="text-gray-500">×</span>
            <input
              type="number"
              value={imageSize.height}
              onChange={(e) => setImageSize(prev => ({ ...prev, height: parseInt(e.target.value) || 512 }))}
              className="w-full p-2 border border-gray-300 rounded-md text-sm"
              placeholder="高度"
            />
          </div>
        </div>
        
        {/* 高级模式 */}
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">高级模式</label>
          <button
            onClick={() => setAdvancedMode(!advancedMode)}
            className={clsx(
              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
              advancedMode ? 'bg-blue-600' : 'bg-gray-200'
            )}
          >
            <span
              className={clsx(
                'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                advancedMode ? 'translate-x-6' : 'translate-x-1'
              )}
            />
          </button>
        </div>
        
        {/* 生成数量与按钮 */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">生成数量</label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setGenerationCount(Math.max(1, generationCount - 1))}
                className="p-1 rounded-md border border-gray-300"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="flex-1 text-center">{generationCount} 张</span>
              <button
                onClick={() => setGenerationCount(Math.min(10, generationCount + 1))}
                className="p-1 rounded-md border border-gray-300"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <button
            onClick={onGenerate}
            disabled={isGenerating}
            className={clsx(
              'w-full flex items-center justify-center gap-2 p-3 rounded-md font-medium transition-colors',
              isGenerating
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700'
            )}
          >
            <Rocket className="w-4 h-4" />
            {isGenerating ? '生成中...' : '开始生成'}
          </button>
        </div>
      </div>
      
      {/* LoRA模型选择器 */}
      {showLoraSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 w-96 max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">选择增强模型</h3>
              <button
                onClick={() => setShowLoraSelector(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <Plus className="w-5 h-5 rotate-45" />
              </button>
            </div>
            <div className="space-y-2">
              {loraModelOptions.map(model => (
                <div
                  key={model.id}
                  onClick={() => addLoraModel(model)}
                  className="p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer"
                >
                  <div className="font-medium text-gray-900">{model.name}</div>
                  <div className="text-sm text-gray-500">{model.description}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// 工具栏组件
const CanvasToolbar = ({ 
  activeTool, 
  setActiveTool,
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onUndo,
  onRedo,
  canUndo,
  canRedo
}) => {
  // 只保留基本的画布工具
  const tools = [
    { id: 'select', icon: <MousePointer2 className="w-4 h-4" />, label: '选择' },
    { id: 'hand', icon: <Hand className="w-4 h-4" />, label: '抓手' },
    { id: 'rectangle', icon: <Square className="w-4 h-4" />, label: '矩形' },
    { id: 'ellipse', icon: <Circle className="w-4 h-4" />, label: '圆形' },
    { id: 'draw', icon: <Pen className="w-4 h-4" />, label: '画笔' },
    { id: 'eraser', icon: <Eraser className="w-4 h-4" />, label: '橡皮擦' }
  ];
  
  return (
    <div className="flex items-center gap-2 p-2 border-b bg-white">
      {/* 工具选择 */}
      <div className="flex gap-1">
        {tools.map(tool => (
          <button
            key={tool.id}
            onClick={() => setActiveTool(tool.id)}
            className={clsx(
              'p-2 rounded-md transition-colors',
              activeTool === tool.id
                ? 'bg-blue-100 text-blue-600'
                : 'text-gray-600 hover:bg-gray-100'
            )}
            title={tool.label}
          >
            {tool.icon}
          </button>
        ))}
      </div>
      
      <div className="w-px h-6 bg-gray-200 mx-2"></div>
      
      {/* 编辑操作 */}
      <button
        onClick={onUndo}
        disabled={!canUndo}
        className={clsx(
          'p-2 rounded-md transition-colors',
          canUndo ? 'text-gray-600 hover:bg-gray-100' : 'text-gray-300 cursor-not-allowed'
        )}
        title="撤销"
      >
        <Undo className="w-4 h-4" />
      </button>
      <button
        onClick={onRedo}
        disabled={!canRedo}
        className={clsx(
          'p-2 rounded-md transition-colors',
          canRedo ? 'text-gray-600 hover:bg-gray-100' : 'text-gray-300 cursor-not-allowed'
        )}
        title="重做"
      >
        <Redo className="w-4 h-4" />
      </button>
      
      <div className="w-px h-6 bg-gray-200 mx-2"></div>
      
      {/* 对齐工具 */}
      <div className="flex gap-1">
        <button className="p-2 rounded-md text-gray-600 hover:bg-gray-100" title="左对齐">
          <AlignLeft className="w-4 h-4" />
        </button>
        <button className="p-2 rounded-md text-gray-600 hover:bg-gray-100" title="居中对齐">
          <AlignCenter className="w-4 h-4" />
        </button>
        <button className="p-2 rounded-md text-gray-600 hover:bg-gray-100" title="右对齐">
          <AlignRight className="w-4 h-4" />
        </button>
      </div>
      
      <div className="flex-1"></div>
      
      {/* 缩放控制 */}
      <div className="flex items-center gap-2">
        <button
          onClick={onZoomOut}
          className="p-1 rounded-md text-gray-600 hover:bg-gray-100"
          title="缩小"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="text-sm text-gray-600 min-w-12 text-center">{Math.round(zoomLevel * 100)}%</span>
        <button
          onClick={onZoomIn}
          className="p-1 rounded-md text-gray-600 hover:bg-gray-100"
          title="放大"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button className="p-1 rounded-md text-gray-600 hover:bg-gray-100" title="适应屏幕">
          <Maximize className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// 图层管理面板组件
const LayerPanel = ({ 
  layers, 
  activeLayerId, 
  layerGroups,
  onLayerSelect,
  onLayerAdd,
  onLayerDelete,
  onLayerToggleVisibility,
  onLayerToggleLock,
  onLayerRename,
  onLayerReorder,
  onLayerSetOpacity,
  onLayerSetBlendMode,
  onLayerGroupCreate,
  onLayerGroupDelete,
  onLayerGroupRename
}) => {
  const [editingLayerId, setEditingLayerId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  
  const blendModes = [
    { value: 'normal', label: '正常' },
    { value: 'multiply', label: '正片叠底' },
    { value: 'screen', label: '滤色' },
    { value: 'overlay', label: '叠加' },
    { value: 'darken', label: '变暗' },
    { value: 'lighten', label: '变亮' }
  ];
  
  const handleNameEdit = (layer) => {
    setEditingLayerId(layer.id);
    setEditingName(layer.name);
  };
  
  const handleNameSave = () => {
    if (editingLayerId && editingName.trim()) {
      onLayerRename(editingLayerId, editingName.trim());
    }
    setEditingLayerId(null);
    setEditingName('');
  };
  
  const toggleGroup = (groupId) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };
  
  const renderLayer = (layer, depth = 0) => {
    return (
      <div
        key={layer.id}
        className={clsx(
          'group flex items-center p-2 rounded cursor-pointer transition-colors',
          activeLayerId === layer.id ? 'bg-blue-100' : 'hover:bg-gray-100'
        )}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={() => onLayerSelect(layer.id)}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onLayerToggleVisibility(layer.id);
          }}
          className="p-1 text-gray-400 hover:text-gray-600"
        >
          {layer.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>
        
        <div className="flex-1 min-w-0 ml-2">
          {editingLayerId === layer.id ? (
            <input
              type="text"
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onBlur={handleNameSave}
              onKeyDown={(e) => e.key === 'Enter' && handleNameSave()}
              className="w-full px-1 py-0.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
          ) : (
            <div
              className="text-sm text-gray-900 truncate"
              onDoubleClick={() => handleNameEdit(layer)}
            >
              {layer.name}
              {/* 显示图层中的对象数量 */}
              {layer.objects && layer.objects.length > 0 && (
                <span className="text-xs text-gray-500 ml-2">({layer.objects.length})</span>
              )}
            </div>
          )}
        </div>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            onLayerToggleLock(layer.id);
          }}
          className="p-1 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100"
        >
          {layer.locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
        </button>
      </div>
    );
  };
  
  const renderLayerGroup = (group) => {
    const isExpanded = expandedGroups.has(group.id);
    const groupLayers = layers.filter(layer => layer.parentId === group.id);
    
    return (
      <div key={group.id} className="mb-1">
        <div
          className="group flex items-center p-2 rounded cursor-pointer hover:bg-gray-100"
          onClick={() => toggleGroup(group.id)}
        >
          <button className="p-1 text-gray-400">
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          <div className="flex-1 min-w-0 ml-2">
            <div className="text-sm font-medium text-gray-900 truncate">{group.name}</div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onLayerGroupDelete(group.id);
            }}
            className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        
        {isExpanded && (
          <div className="ml-4">
            {groupLayers.map(layer => renderLayer(layer, 1))}
          </div>
        )}
      </div>
    );
  };
  
  // 按orderIndex排序图层
  const sortedLayers = [...layers].sort((a, b) => a.orderIndex - b.orderIndex);
  // 分离根图层（没有parentId的图层）
  const rootLayers = sortedLayers.filter(layer => !layer.parentId);
  
  return (
    <div className="w-64 h-full border-l bg-white flex flex-col">
      <div className="p-3 border-b">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900">图层</h3>
          <button
            onClick={onLayerAdd}
            className="p-1 text-gray-400 hover:text-gray-600"
            title="添加图层"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2">
        {layerGroups.map(group => renderLayerGroup(group))}
        {[...rootLayers].reverse().map(layer => renderLayer(layer))}
      </div>
      
      {/* 图层属性 */}
      {activeLayerId && (
        <div className="border-t p-3 space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">不透明度</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={layers.find(l => l.id === activeLayerId)?.opacity || 1}
              onChange={(e) => onLayerSetOpacity(activeLayerId, parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
          
          <div>
            <label className="block text-xs text-gray-500 mb-1">混合模式</label>
            <select
              value={layers.find(l => l.id === activeLayerId)?.blendMode || 'normal'}
              onChange={(e) => onLayerSetBlendMode(activeLayerId, e.target.value)}
              className="w-full text-sm p-1 border border-gray-300 rounded"
            >
              {blendModes.map(mode => (
                <option key={mode.value} value={mode.value}>{mode.label}</option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

// AI设计师对话面板组件
const AIDesignerPanel = ({ 
  messages, 
  inputMessage, 
  setInputMessage, 
  onSendMessage,
  quickQuestions,
  onRefreshQuestions,
  isSending
}) => {
  const messagesEndRef = useRef(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  return (
    <div className="w-80 h-full border-l bg-white flex flex-col">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold text-gray-900">AI 设计师</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 欢迎语 */}
        <div className="bg-blue-50 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="font-medium text-gray-900">AI 设计师</div>
              <p className="text-sm text-gray-600 mt-1">我是你的 AI 设计师，让我们开始今天的创作吧！</p>
            </div>
          </div>
        </div>
        
        {/* 快捷问题 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">快捷提问</span>
            <button
              onClick={onRefreshQuestions}
              className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              换一换
            </button>
          </div>
          <div className="space-y-2">
            {quickQuestions.map((question, index) => (
              <button
                key={index}
                onClick={() => {
                  setInputMessage(question);
                  onSendMessage(question);
                }}
                className="w-full text-left p-2 text-sm bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
        
        {/* 消息对话 */}
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={clsx(
                'flex gap-2',
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {message.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-4 h-4 text-white" />
                </div>
              )}
              <div
                className={clsx(
                  'max-w-[80%] rounded-lg p-3',
                  message.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-900'
                )}
              >
                <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                {message.role === 'assistant' && (
                  <div className="flex items-center gap-2 mt-2">
                    <button className="text-xs text-gray-500 hover:text-gray-700 flex items-center">
                      <ThumbsUp className="w-3 h-3 mr-1" />
                      有用
                    </button>
                    <button className="text-xs text-gray-500 hover:text-gray-700 flex items-center">
                      <ThumbsDown className="w-3 h-3 mr-1" />
                      没用
                    </button>
                  </div>
                )}
              </div>
              {message.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-gray-600" />
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      {/* 消息输入 */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSendMessage()}
            placeholder="向 AI 设计师提问..."
            className="flex-1 p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            onClick={() => onSendMessage()}
            disabled={isSending || !inputMessage.trim()}
            className={clsx(
              'p-2 rounded-md transition-colors',
              isSending || !inputMessage.trim()
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            )}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// 顶部导航栏组件
const TopNavbar = ({ 
  projectName, 
  setProjectName,
  isEditingName,
  setIsEditingName,
  points,
  memberStatus,
  onOpenMember,
  onNotificationClick,
  onProfileClick
}) => {
  return (
    <div className="flex items-center justify-between p-3 border-b bg-white">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-bold text-gray-900">欧智艺术平台</h1>
        <div className="flex items-center gap-2">
          {isEditingName ? (
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              onBlur={() => setIsEditingName(false)}
              onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
              className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          ) : (
            <div
              className="text-sm font-medium text-gray-900 cursor-text hover:bg-gray-100 px-2 py-1 rounded"
              onDoubleClick={() => setIsEditingName(true)}
            >
              {projectName}
            </div>
          )}
          <button className="text-xs text-blue-600 hover:text-blue-800">+ 新页面</button>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        {/* 积分与会员 */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-sm">
            <Star className="w-4 h-4 text-yellow-500" />
            <span className="font-medium">{points}</span>
          </div>
          <div className="flex items-center gap-1 text-sm">
            <Crown className="w-4 h-4 text-orange-500" />
            <span className="font-medium">{memberStatus}</span>
          </div>
          <button
            onClick={onOpenMember}
            className="px-3 py-1 text-sm bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-md hover:from-orange-600 hover:to-red-600"
          >
            开通会员
          </button>
        </div>
        
        {/* 通知与个人中心 */}
        <div className="flex items-center gap-2">
          <button
            onClick={onNotificationClick}
            className="p-2 text-gray-600 hover:text-gray-900 relative"
          >
            <Bell className="w-5 h-5" />
            <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></div>
          </button>
          <button
            onClick={onProfileClick}
            className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center"
          >
            <User className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>
    </div>
  );
};

// 主组件
const OuzhiArtPlatform = () => {
  // 项目状态
  const [projectName, setProjectName] = useState('未命名项目');
  const [isEditingName, setIsEditingName] = useState(false);
  
  // 生成器状态
  const [baseModel, setBaseModel] = useState({ id: 'star-3', name: '星流 Star-3', description: '默认基础模型' });
  const [loraModels, setLoraModels] = useState([]);
  const [prompt, setPrompt] = useState('');
  const [recommendedThemes, setRecommendedThemes] = useState([
    '梦幻森林',
    '未来城市',
    '古典建筑',
    '抽象艺术'
  ]);
  const [imageSize, setImageSize] = useState({ width: 1024, height: 1024 });
  const [generationCount, setGenerationCount] = useState(4);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // 画布状态
  const [activeTool, setActiveTool] = useState('select');
  const [zoomLevel, setZoomLevel] = useState(1);
  
  // AI对话状态
  const [messages, setMessages] = useState([
    { role: 'assistant', content: '你好！我是你的 AI 设计师，有什么我可以帮助你的吗？' }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [quickQuestions, setQuickQuestions] = useState([
    '你能为我做什么？',
    '科技公司品牌 Logo',
    '游戏图标设计',
    '海报设计建议'
  ]);
  const [isSending, setIsSending] = useState(false);
  
  // 系统状态
  const [points, setPoints] = useState(1280);
  const [memberStatus, setMemberStatus] = useState('高级会员');
  
  // 使用增强的图层hook
  const { 
    layers, 
    activeLayerId, 
    layerGroups,
    setLayers, 
    addLayer,
    deleteLayer,
    setActiveLayerId,
    toggleLayerVisibility,
    toggleLayerLock,
    renameLayer,
    setLayerOpacity,
    setLayerBlendMode,
    reorderLayer,
    createLayerGroup,
    deleteLayerGroup,
    renameLayerGroup
  } = useEnhancedLayers([
    { id: 'layer-1', name: '图层 1', visible: true, locked: false, opacity: 1, blendMode: 'normal', objects: [], orderIndex: 0 }
  ]);
  
  // 使用图层历史hook
  const { 
    history, 
    currentIndex: historyIndex,
    undo: undoHistory,
    redo: redoHistory,
    canUndo,
    canRedo
  } = useLayerHistory(50);
  
  // 对象添加处理
  const handleObjectAdded = (obj) => {
    console.log('Object added:', obj);
    
    // 确保有激活的图层
    if (!activeLayerId) {
      console.warn('没有激活的图层，无法添加对象');
      return;
    }
    
    const objectData = {
      id: obj.id,
      type: obj.type,
      data: obj,
      timestamp: Date.now()
    };
    
    console.log('Adding object to layer:', activeLayerId, 'object:', objectData);
    
    // 添加到当前激活的图层
    setLayers(prev => {
      const updatedLayers = prev.map(layer => {
        if (layer.id === activeLayerId) {
          const updatedObjects = [...(layer.objects || []), objectData];
          console.log('Updated layer objects:', updatedObjects);
          return { ...layer, objects: updatedObjects };
        }
        return layer;
      });
      return updatedLayers;
    });
  };
  
  // 对象修改处理
  const handleObjectModified = (objs) => {
    console.log('Objects modified:', objs);
  };
  
  // 生成器功能
  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    try {
      // 模拟生成过程
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // 添加生成结果到图层
      const newLayer = addLayer({
        name: `生成结果 ${layers.length + 1}`,
        objects: [{ type: 'image', data: 'generated_image_data' }]
      });
      
      console.log('生成完成，结果已添加到图层:', newLayer);
    } catch (error) {
      console.error('生成失败:', error);
    } finally {
      setIsGenerating(false);
    }
  };
  
  // AI对话功能
  const handleSendMessage = async (message = inputMessage) => {
    if (!message.trim()) return;
    
    // 添加用户消息
    const userMessage = { role: 'user', content: message };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsSending(true);
    
    try {
      // 模拟AI回复
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 添加AI回复
      const aiResponses = [
        '这是一个很好的想法！我可以为你生成一些相关的视觉元素。',
        '根据你的描述，我建议使用对比鲜明的色彩搭配来突出主题。',
        '让我为你创建一个符合要求的设计方案。',
        '这个设计方向很棒！我会为你提供几个不同的版本供选择。'
      ];
      const randomResponse = aiResponses[Math.floor(Math.random() * aiResponses.length)];
      const aiMessage = { role: 'assistant', content: randomResponse };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('发送消息失败:', error);
    } finally {
      setIsSending(false);
    }
  };
  
  const handleRefreshQuestions = () => {
    const newQuestions = [
      '如何设计吸引人的海报？',
      'Logo设计有哪些原则？',
      '配色方案推荐',
      '字体选择建议'
    ];
    setQuickQuestions(newQuestions);
  };
  
  // 图层操作功能
  const handleLayerAdd = () => {
    const newLayer = addLayer();
    console.log('添加新图层:', newLayer);
    // 设置新添加的图层为激活状态
    setActiveLayerId(newLayer.id);
    
    // 调试信息
    console.log('New layer added, setting active layer to:', newLayer.id);
  };
  
  const handleLayerDelete = (layerId) => {
    deleteLayer(layerId);
  };
  
  const handleLayerRename = (layerId, newName) => {
    renameLayer(layerId, newName);
  };
  
  const handleLayerToggleVisibility = (layerId) => {
    console.log('Toggling visibility for layer:', layerId);
    
    // 更新图层可见性状态
    toggleLayerVisibility(layerId);
  };
  
  const handleLayerToggleLock = (layerId) => {
    toggleLayerLock(layerId);
  };
  
  const handleLayerReorder = (layerId, newIndex) => {
    reorderLayer(layerId, newIndex);
  };
  
  const handleLayerSetOpacity = (layerId, opacity) => {
    setLayerOpacity(layerId, opacity);
  };
  
  const handleLayerSetBlendMode = (layerId, blendMode) => {
    setLayerBlendMode(layerId, blendMode);
  };
  
  const handleLayerGroupCreate = () => {
    createLayerGroup(`图层组 ${layerGroups.length + 1}`);
  };
  
  const handleLayerGroupDelete = (groupId) => {
    deleteLayerGroup(groupId);
  };
  
  const handleLayerGroupRename = (groupId, newName) => {
    renameLayerGroup(groupId, newName);
  };
  
  // 系统功能
  const handleOpenMember = () => {
    console.log('打开会员页面');
  };
  
  const handleNotificationClick = () => {
    console.log('查看通知');
  };
  
  const handleProfileClick = () => {
    console.log('打开个人中心');
  };
  
  return (
    <div className="w-full h-screen bg-gray-100 flex flex-col">
      {/* 顶部导航栏 */}
      <TopNavbar
        projectName={projectName}
        setProjectName={setProjectName}
        isEditingName={isEditingName}
        setIsEditingName={setIsEditingName}
        points={points}
        memberStatus={memberStatus}
        onOpenMember={handleOpenMember}
        onNotificationClick={handleNotificationClick}
        onProfileClick={handleProfileClick}
      />
      
      <div className="flex-1 flex overflow-hidden">
        {/* 生成器面板 */}
        <GeneratorPanel
          baseModel={baseModel}
          setBaseModel={setBaseModel}
          loraModels={loraModels}
          setLoraModels={setLoraModels}
          prompt={prompt}
          setPrompt={setPrompt}
          recommendedThemes={recommendedThemes}
          imageSize={imageSize}
          setImageSize={setImageSize}
          generationCount={generationCount}
          setGenerationCount={setGenerationCount}
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
        />
        
        {/* 画布区域 */}
        <div className="flex-1 flex flex-col">
          {/* tldraw画布 */}
          <div className="flex-1 relative bg-gray-200 overflow-hidden">
            <Tldraw>
              <TldrawCustomTools 
                activeTool={activeTool}
                onToolChange={setActiveTool}
                onObjectAdded={handleObjectAdded}
                onObjectModified={handleObjectModified}
                layers={layers}
                toggleLayerVisibility={toggleLayerVisibility}
              />
            </Tldraw>
          </div>
        </div>
        
        {/* 图层管理面板 */}
        <LayerPanel
          layers={layers}
          activeLayerId={activeLayerId}
          layerGroups={layerGroups}
          onLayerSelect={setActiveLayerId}
          onLayerAdd={handleLayerAdd}
          onLayerDelete={handleLayerDelete}
          onLayerToggleVisibility={toggleLayerVisibility}
          onLayerToggleLock={handleLayerToggleLock}
          onLayerRename={handleLayerRename}
          onLayerReorder={handleLayerReorder}
          onLayerSetOpacity={handleLayerSetOpacity}
          onLayerSetBlendMode={handleLayerSetBlendMode}
          onLayerGroupCreate={handleLayerGroupCreate}
          onLayerGroupDelete={handleLayerGroupDelete}
          onLayerGroupRename={handleLayerGroupRename}
        />
        
        {/* AI设计师对话面板 */}
        <AIDesignerPanel
          messages={messages}
          inputMessage={inputMessage}
          setInputMessage={setInputMessage}
          onSendMessage={handleSendMessage}
          quickQuestions={quickQuestions}
          onRefreshQuestions={handleRefreshQuestions}
          isSending={isSending}
        />
      </div>
    </div>
  );
};

export default OuzhiArtPlatform;