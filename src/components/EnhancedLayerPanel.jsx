import React, { useState } from 'react';
import { 
  Eye, 
  EyeOff, 
  Lock, 
  Unlock, 
  Trash2, 
  Plus, 
  ChevronUp, 
  ChevronDown,
  Edit2,
  Copy,
  Layers,
  Folder,
  FolderOpen,
  Image,
  Type,
  Square,
  Circle,
  Pen,
  Brain,
  Shuffle,
  RotateCcw
} from 'lucide-react';
import clsx from 'clsx';

// 导入新创建的组件
import AIInteractionPanel from './AIInteractionPanel';
import CrossLayerFusion from './CrossLayerFusion';
import AdvancedLayerOperations from './AdvancedLayerOperations';
import LayerHistoryManager from './LayerHistoryManager';

const EnhancedLayerPanel = ({ 
  layers = [], 
  layerGroups = [],
  activeLayerId, 
  masks = [],
  history = [],
  historyIndex = -1,
  onLayerSelect, 
  onLayerAdd, 
  onLayerDelete, 
  onLayerToggleVisibility, 
  onLayerToggleLock,
  onLayerRename,
  onLayerReorder,
  onLayerDuplicate,
  onLayerSetOpacity,
  onLayerSetBlendMode,
  onLayerGroupCreate,
  onLayerGroupDelete,
  onLayerGroupRename,
  onLayerGroupToggle,
  onMaskCreate,
  // 新增的回调函数
  onLayerMerge,
  onLayerSplit,
  onLayerClone,
  onFusionStart,
  onHistoryGoTo,
  onHistoryUndo,
  onHistoryRedo,
  onHistoryCompare,
  className 
}) => {
  const [editingLayerId, setEditingLayerId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [activeTab, setActiveTab] = useState('layers'); // 'layers', 'ai', 'fusion', 'advanced', 'history'

  const blendModes = [
    { value: 'normal', label: '正常' },
    { value: 'multiply', label: '正片叠底' },
    { value: 'screen', label: '滤色' },
    { value: 'overlay', label: '叠加' },
    { value: 'darken', label: '变暗' },
    { value: 'lighten', label: '变亮' },
    { value: 'color-dodge', label: '颜色减淡' },
    { value: 'color-burn', label: '颜色加深' },
    { value: 'hard-light', label: '强光' },
    { value: 'soft-light', label: '柔光' },
    { value: 'difference', label: '差值' },
    { value: 'exclusion', label: '排除' },
    { value: 'hue', label: '色相' },
    { value: 'saturation', label: '饱和度' },
    { value: 'color', label: '颜色' },
    { value: 'luminosity', label: '明度' }
  ];

  const handleNameEdit = (item, type) => {
    if (type === 'layer') {
      setEditingLayerId(item.id);
      setEditingName(item.name);
    } else if (type === 'group') {
      // 对于组，我们可以使用类似的机制或者传递给onLayerGroupRename
      onLayerGroupRename?.(item.id, item.name);
    }
  };

  const handleNameSave = () => {
    if (editingLayerId && editingName.trim()) {
      onLayerRename?.(editingLayerId, editingName.trim());
    }
    setEditingLayerId(null);
    setEditingName('');
  };

  const handleNameCancel = () => {
    setEditingLayerId(null);
    setEditingName('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleNameSave();
    } else if (e.key === 'Escape') {
      handleNameCancel();
    }
  };

  const moveLayer = (layerId, direction) => {
    const currentIndex = layers.findIndex(layer => layer.id === layerId);
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    if (newIndex >= 0 && newIndex < layers.length) {
      onLayerReorder?.(layerId, newIndex);
    }
  };

  const toggleGroup = (groupId) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
    onLayerGroupToggle?.(groupId);
  };

  const getLayerIcon = (layer) => {
    // 根据图层内容类型返回不同的图标
    if (layer.objects && layer.objects.length > 0) {
      const firstObject = layer.objects[0];
      if (firstObject.type === 'image') return <Image size={16} />;
      if (firstObject.type === 'text') return <Type size={16} />;
      if (firstObject.type === 'rect') return <Square size={16} />;
      if (firstObject.type === 'circle') return <Circle size={16} />;
      if (firstObject.type === 'path') return <Pen size={16} />;
    }
    return <Layers size={16} />;
  };

  const renderLayer = (layer, depth = 0) => {
    const hasMask = masks.some(mask => mask.layerId === layer.id);
    
    return (
      <div
        key={layer.id}
        className={clsx(
          'group relative p-2 rounded-lg border transition-all duration-200',
          {
            'bg-primary-50 border-primary-200': activeLayerId === layer.id,
            'bg-white border-gray-200 hover:bg-gray-50': activeLayerId !== layer.id,
          }
        )}
        style={{ marginLeft: `${depth * 16}px` }}
        onClick={() => onLayerSelect?.(layer.id)}
      >
        {/* 图层内容 */}
        <div className="flex items-center space-x-2">
          {/* 图层类型图标 */}
          <div className="text-gray-500">
            {getLayerIcon(layer)}
          </div>

          {/* 图层名称 */}
          <div className="flex-1 min-w-0">
            {editingLayerId === layer.id ? (
              <input
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={handleNameSave}
                onKeyDown={handleKeyPress}
                className="w-full px-1 py-0.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                autoFocus
              />
            ) : (
              <div className="flex items-center space-x-1">
                <span 
                  className="text-sm font-medium text-gray-900 truncate cursor-text"
                  onDoubleClick={() => handleNameEdit(layer, 'layer')}
                >
                  {layer.name}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNameEdit(layer, 'layer');
                  }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-gray-400 hover:text-gray-600 transition-all"
                  title="重命名"
                >
                  <Edit2 size={12} />
                </button>
              </div>
            )}
          </div>

          {/* 控制按钮 */}
          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* 上移/下移 */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                moveLayer(layer.id, 'up');
              }}
              disabled={layer.orderIndex === 0}
              className="p-1 rounded text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
              title="上移"
            >
              <ChevronUp size={12} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                moveLayer(layer.id, 'down');
              }}
              disabled={layer.orderIndex === layers.length - 1}
              className="p-1 rounded text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
              title="下移"
            >
              <ChevronDown size={12} />
            </button>

            {/* 可见性切换 */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onLayerToggleVisibility?.(layer.id);
              }}
              className="p-1 rounded text-gray-400 hover:text-gray-600"
              title={layer.visible ? '隐藏图层' : '显示图层'}
            >
              {layer.visible ? <Eye size={12} /> : <EyeOff size={12} />}
            </button>

            {/* 锁定切换 */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onLayerToggleLock?.(layer.id);
              }}
              className="p-1 rounded text-gray-400 hover:text-gray-600"
              title={layer.locked ? '解锁图层' : '锁定图层'}
            >
              {layer.locked ? <Lock size={12} /> : <Unlock size={12} />}
            </button>

            {/* 复制 */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onLayerDuplicate?.(layer.id);
              }}
              className="p-1 rounded text-gray-400 hover:text-gray-600"
              title="复制图层"
            >
              <Copy size={12} />
            </button>

            {/* 删除 */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (layers.length > 1) {
                  onLayerDelete?.(layer.id);
                }
              }}
              disabled={layers.length <= 1}
              className="p-1 rounded text-gray-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
              title="删除图层"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        {/* 不透明度和混合模式 */}
        <div className="mt-2 space-y-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* 不透明度滑块 */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500 w-12">不透明度</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={layer.opacity || 1}
              onChange={(e) => {
                const opacity = parseFloat(e.target.value);
                onLayerSetOpacity?.(layer.id, opacity);
              }}
              className="flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              onClick={(e) => e.stopPropagation()}
            />
            <span className="text-xs text-gray-500 w-8">
              {Math.round((layer.opacity || 1) * 100)}%
            </span>
          </div>

          {/* 混合模式选择 */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500 w-12">混合</span>
            <select
              value={layer.blendMode || 'normal'}
              onChange={(e) => {
                onLayerSetBlendMode?.(layer.id, e.target.value);
              }}
              className="flex-1 text-xs border border-gray-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary-500"
              onClick={(e) => e.stopPropagation()}
            >
              {blendModes.map(mode => (
                <option key={mode.value} value={mode.value}>
                  {mode.label}
                </option>
              ))}
            </select>
          </div>

          {/* 蒙版指示器 */}
          {hasMask && (
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <span>蒙版</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // TODO: 打开蒙版编辑面板
                }}
                className="text-blue-500 hover:text-blue-700"
              >
                编辑
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderLayerGroup = (group) => {
    const isExpanded = expandedGroups.has(group.id);
    const groupLayers = layers.filter(layer => layer.parentId === group.id);
    
    return (
      <div key={group.id} className="mb-1">
        <div
          className="group flex items-center p-2 rounded-lg border bg-gray-100 border-gray-200 cursor-pointer hover:bg-gray-200 transition-colors"
          onClick={() => toggleGroup(group.id)}
        >
          <button className="text-gray-500 mr-2">
            {isExpanded ? <FolderOpen size={16} /> : <Folder size={16} />}
          </button>
          <span className="text-sm font-medium text-gray-900 flex-1 truncate">
            {group.name}
          </span>
          <div className="opacity-0 group-hover:opacity-100 flex space-x-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                // TODO: 添加图层到组
              }}
              className="p-1 rounded text-gray-400 hover:text-gray-600"
              title="添加图层"
            >
              <Plus size={12} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onLayerGroupDelete?.(group.id);
              }}
              className="p-1 rounded text-gray-400 hover:text-red-600"
              title="删除组"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
        
        {isExpanded && (
          <div className="ml-4 mt-1 space-y-1">
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

  // 渲染标签页内容
  const renderTabContent = () => {
    switch (activeTab) {
      case 'ai':
        return (
          <AIInteractionPanel
            layers={layers}
            activeLayerId={activeLayerId}
            onLayerSelect={onLayerSelect}
            onGenerate={(params) => {
              // TODO: 实现AI生成逻辑
              console.log('AI生成请求:', params);
            }}
            onLayerVisibilityToggle={onLayerToggleVisibility}
            onLayerLockToggle={onLayerToggleLock}
          />
        );
      case 'fusion':
        return (
          <CrossLayerFusion
            layers={layers}
            onFusionStart={onFusionStart}
            onLayerVisibilityToggle={onLayerToggleVisibility}
            onLayerLockToggle={onLayerToggleLock}
          />
        );
      case 'advanced':
        return (
          <AdvancedLayerOperations
            layers={layers}
            onLayerMerge={onLayerMerge}
            onLayerSplit={onLayerSplit}
            onLayerClone={onLayerClone}
            onLayerDelete={onLayerDelete}
            onLayerVisibilityToggle={onLayerToggleVisibility}
            onLayerLockToggle={onLayerToggleLock}
          />
        );
      case 'history':
        return (
          <LayerHistoryManager
            history={history}
            currentIndex={historyIndex}
            onHistoryGoTo={onHistoryGoTo}
            onHistoryUndo={onHistoryUndo}
            onHistoryRedo={onHistoryRedo}
            onHistoryCompare={onHistoryCompare}
          />
        );
      default: // 'layers'
        return (
          <div className="space-y-3">
            {/* 标题和添加按钮 */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-900">图层</h3>
              <div className="flex space-x-1">
                <button
                  onClick={() => onLayerGroupCreate?.()}
                  className="p-1 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                  title="添加图层组"
                >
                  <Folder size={16} />
                </button>
                <button
                  onClick={onLayerAdd}
                  className="p-1 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                  title="添加图层"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* 图层组和图层列表 */}
            <div className="space-y-1 max-h-96 overflow-y-auto scrollbar-hidden">
              {/* 图层组 */}
              {layerGroups.map(group => renderLayerGroup(group))}
              
              {/* 根图层 */}
              {[...rootLayers].reverse().map((layer) => renderLayer(layer))}
            </div>

            {/* 空状态 */}
            {layers.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">暂无图层</p>
                <div className="mt-2 space-x-2">
                  <button
                    onClick={onLayerAdd}
                    className="btn btn-primary text-sm"
                  >
                    创建图层
                  </button>
                  <button
                    onClick={() => onLayerGroupCreate?.()}
                    className="btn btn-secondary text-sm"
                  >
                    创建图层组
                  </button>
                </div>
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className={clsx('panel p-3', className)}>
      {/* 标签页导航 */}
      <div className="flex border-b border-gray-200 mb-3">
        <button
          onClick={() => setActiveTab('layers')}
          className={clsx(
            'px-3 py-2 text-sm font-medium border-b-2 transition-colors',
            activeTab === 'layers'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          )}
        >
          图层
        </button>
        <button
          onClick={() => setActiveTab('ai')}
          className={clsx(
            'px-3 py-2 text-sm font-medium border-b-2 transition-colors',
            activeTab === 'ai'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          )}
        >
          <Brain size={14} className="inline mr-1" />
          AI交互
        </button>
        <button
          onClick={() => setActiveTab('fusion')}
          className={clsx(
            'px-3 py-2 text-sm font-medium border-b-2 transition-colors',
            activeTab === 'fusion'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          )}
        >
          <Shuffle size={14} className="inline mr-1" />
          融合
        </button>
        <button
          onClick={() => setActiveTab('advanced')}
          className={clsx(
            'px-3 py-2 text-sm font-medium border-b-2 transition-colors',
            activeTab === 'advanced'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          )}
        >
          <RotateCcw size={14} className="inline mr-1" />
          高级
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={clsx(
            'px-3 py-2 text-sm font-medium border-b-2 transition-colors',
            activeTab === 'history'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          )}
        >
          历史
        </button>
      </div>

      {/* 标签页内容 */}
      {renderTabContent()}
    </div>
  );
};

export default EnhancedLayerPanel;