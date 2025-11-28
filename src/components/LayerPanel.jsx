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
  ChevronRight,
  ChevronLeft,
  Edit2
} from 'lucide-react';
import clsx from 'clsx';
import logger from '../utils/logger.js';

const LayerPanel = ({ 
  layers = [], 
  activeLayerId, 
  selectedLayerIds = new Set(),
  layerGroups = [],
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
  onLayerGroupRename,
  onGroupSelectedLayers,
  onMergeSelectedLayers,
  onClearSelection,
  isCollapsed = false,
  onToggleCollapse,
  editorRef,
  className 
}) => {
  const [editingLayerId, setEditingLayerId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [draggedLayerId, setDraggedLayerId] = useState(null);
  const [dragOverLayerId, setDragOverLayerId] = useState(null);

  const handleNameEdit = (layer) => {
    setEditingLayerId(layer.id);
    setEditingName(layer.name);
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
  };

  const renderLayer = (layer, depth = 0, index = 0) => {
    // 检查图层是否包含图片
    const shapeIds = layer.shapeIds || layer.objects?.map(obj => obj.id) || [];
    const hasImage = shapeIds.length > 0;
    const isDragged = draggedLayerId === layer.id;
    const isDragOver = dragOverLayerId === layer.id;
    
    // 处理拖拽开始（用于排序）
    const handleDragStartForReorder = (e) => {
      setDraggedLayerId(layer.id);
      e.dataTransfer.effectAllowed = 'move';
      e.currentTarget.style.opacity = '0.5';
    };
    
    // 处理拖拽开始（用于上传组件）
    const handleDragStartForUpload = (e) => {
      if (hasImage) {
        logger.debug(`[图层拖拽] 开始拖拽图层 ${layer.id} 到上传组件`);
        e.dataTransfer.setData('application/x-layer-id', layer.id);
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.dropEffect = 'copy';
        e.currentTarget.style.opacity = '0.5';
        logger.debug(`[图层拖拽] 已设置 dataTransfer 数据: application/x-layer-id = ${layer.id}`);
      } else {
        e.preventDefault();
      }
    };
    
    // 处理拖拽结束
    const handleDragEnd = (e) => {
      e.currentTarget.style.opacity = '1';
      setDraggedLayerId(null);
      setDragOverLayerId(null);
    };
    
    // 处理拖拽进入（用于排序）
    const handleDragOver = (e) => {
      if (draggedLayerId && draggedLayerId !== layer.id) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverLayerId(layer.id);
      }
    };
    
    // 处理拖拽离开
    const handleDragLeave = (e) => {
      if (dragOverLayerId === layer.id) {
        setDragOverLayerId(null);
      }
    };
    
    // 处理放置（用于排序）
    const handleDrop = (e) => {
      e.preventDefault();
      if (draggedLayerId && draggedLayerId !== layer.id) {
        const sortedLayers = [...layers].sort((a, b) => a.orderIndex - b.orderIndex);
        const rootLayers = sortedLayers.filter(l => !l.parentId);
        const targetIndex = rootLayers.findIndex(l => l.id === layer.id);
        
        if (targetIndex !== -1 && onLayerReorder) {
          onLayerReorder(draggedLayerId, targetIndex);
        }
      }
      setDraggedLayerId(null);
      setDragOverLayerId(null);
    };

    // 处理图层选择（支持多选）
    const handleLayerClick = (e) => {
      if (e.ctrlKey || e.metaKey) {
        // Ctrl/Cmd + 点击：切换选择
        const newSelected = new Set(selectedLayerIds);
        if (newSelected.has(layer.id)) {
          newSelected.delete(layer.id);
        } else {
          newSelected.add(layer.id);
        }
        onLayerSelect?.(layer.id, e);
      } else if (e.shiftKey) {
        // Shift + 点击：范围选择
        const sortedLayers = [...layers].sort((a, b) => a.orderIndex - b.orderIndex);
        const rootLayers = sortedLayers.filter(l => !l.parentId);
        const currentIndex = rootLayers.findIndex(l => l.id === layer.id);
        const lastSelectedIndex = rootLayers.findIndex(l => selectedLayerIds.has(l.id));
        
        if (lastSelectedIndex !== -1) {
          const start = Math.min(currentIndex, lastSelectedIndex);
          const end = Math.max(currentIndex, lastSelectedIndex);
          const newSelected = new Set(selectedLayerIds);
          for (let i = start; i <= end; i++) {
            newSelected.add(rootLayers[i].id);
          }
        }
        onLayerSelect?.(layer.id, e);
      } else {
        // 普通点击：单选
        onLayerSelect?.(layer.id, e);
      }
    };
    
    return (
      <div
        key={layer.id}
        className={clsx(
          'group flex items-center p-2 rounded cursor-pointer transition-colors',
          activeLayerId === layer.id ? 'bg-blue-100' : 'hover:bg-gray-100',
          selectedLayerIds.has(layer.id) && 'bg-blue-50 border-l-4 border-blue-500',
          isDragged && 'opacity-50',
          isDragOver && 'border-t-2 border-blue-500',
          hasImage ? 'cursor-move' : 'cursor-default'
        )}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={handleLayerClick}
        draggable={hasImage}
        onDragStart={(e) => {
          // 总是设置图层ID，这样无论拖到哪里都能获取
          e.dataTransfer.setData('application/x-layer-id', layer.id);
          e.dataTransfer.effectAllowed = 'all'; // 允许所有操作
          
          if (e.ctrlKey || e.metaKey) {
            // Ctrl/Cmd + 拖拽：用于上传组件
            handleDragStartForUpload(e);
          } else {
            // 普通拖拽：用于排序
            handleDragStartForReorder(e);
          }
        }}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        title={hasImage ? '拖拽排序（按住Ctrl/Cmd拖拽到上传组件）' : '拖拽排序'}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onLayerToggleVisibility?.(layer.id);
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
              {layer.objects && layer.objects.length > 0 && (
                <span className="text-xs text-gray-500 ml-2">({layer.objects.length})</span>
              )}
            </div>
          )}
        </div>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            onLayerToggleLock?.(layer.id);
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
              onLayerGroupDelete?.(group.id);
            }}
            className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        
        {isExpanded && (
          <div className="ml-4">
            {groupLayers.map((layer, index) => renderLayer(layer, 1, index))}
          </div>
        )}
      </div>
    );
  };

  // 按orderIndex排序图层
  const sortedLayers = [...layers].sort((a, b) => a.orderIndex - b.orderIndex);
  const rootLayers = sortedLayers.filter(layer => !layer.parentId);

  return (
    <div 
      className={clsx(
        "h-full bg-white flex flex-col transition-all duration-300 layer-panel-container",
        isCollapsed ? "w-12" : "w-full"
      )}
      style={{ position: 'relative', zIndex: 10000, height: '100%' }}
    >
      <div 
        className="p-3 border-b bg-white flex-shrink-0 layer-panel-header sticky top-0"
        style={{ 
          position: 'sticky', 
          top: 0, 
          zIndex: 10001, 
          backgroundColor: 'white', 
          display: 'block', 
          visibility: 'visible', 
          opacity: 1 
        }}
      >
        <div className="flex items-center justify-between">
          {isCollapsed ? (
            <button
              onClick={onToggleCollapse}
              className="p-1 rounded-md hover:bg-gray-100 transition-colors mx-auto"
              title="展开"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
          ) : (
            <>
              <h3 className="text-sm font-medium text-gray-900" style={{ position: 'relative', zIndex: 1002 }}>图层</h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={onLayerAdd}
                  className="p-1 text-gray-400 hover:text-gray-600"
                  title="添加图层"
                >
                  <Plus className="w-4 h-4" />
                </button>
                {onToggleCollapse && (
                  <button
                    onClick={onToggleCollapse}
                    className="p-1 rounded-md hover:bg-gray-100 transition-colors"
                    title="收起"
                  >
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      
      {!isCollapsed && (
        <>
          {/* 多选操作栏 */}
          {selectedLayerIds.size > 1 && (
            <div className="border-b p-2 bg-blue-50 relative z-10 flex-shrink-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-600 font-medium">已选择 {selectedLayerIds.size} 个图层</span>
                <button
                  onClick={onClearSelection}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  取消选择
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={onGroupSelectedLayers}
                  className="flex-1 px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                  title="将选中的图层组合成组"
                >
                  组合
                </button>
                <button
                  onClick={onMergeSelectedLayers}
                  className="flex-1 px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                  title="合并选中的图层"
                >
                  合并
                </button>
              </div>
            </div>
          )}
          
          <div className="flex-1 overflow-y-auto p-2">
            {layerGroups.map(group => renderLayerGroup(group))}
            {[...rootLayers].reverse().map((layer, index) => renderLayer(layer, 0, index))}
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
                  onChange={(e) => onLayerSetOpacity?.(activeLayerId, parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-xs text-gray-500 mb-1">混合模式</label>
                <select
                  value={layers.find(l => l.id === activeLayerId)?.blendMode || 'normal'}
                  onChange={(e) => onLayerSetBlendMode?.(activeLayerId, e.target.value)}
                  className="w-full text-sm p-1 border border-gray-300 rounded"
                >
                  <option value="normal">正常</option>
                  <option value="multiply">正片叠底</option>
                  <option value="screen">滤色</option>
                  <option value="overlay">叠加</option>
                  <option value="darken">变暗</option>
                  <option value="lighten">变亮</option>
                </select>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default LayerPanel;