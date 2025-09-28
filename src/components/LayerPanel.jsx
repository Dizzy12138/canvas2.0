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
  Edit2
} from 'lucide-react';
import clsx from 'clsx';

const LayerPanel = ({ 
  layers = [], 
  activeLayerId, 
  onLayerSelect, 
  onLayerAdd, 
  onLayerDelete, 
  onLayerToggleVisibility, 
  onLayerToggleLock,
  onLayerRename,
  onLayerReorder,
  className 
}) => {
  const [editingLayerId, setEditingLayerId] = useState(null);
  const [editingName, setEditingName] = useState('');

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

  return (
    <div className={clsx('panel p-3', className)}>
      <div className="space-y-3">
        {/* 标题和添加按钮 */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900">图层</h3>
          <button
            onClick={onLayerAdd}
            className="p-1 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            title="添加图层"
          >
            <Plus size={16} />
          </button>
        </div>

        {/* 图层列表 */}
        <div className="space-y-1 max-h-64 overflow-y-auto scrollbar-hidden">
          {/* 反向显示图层，使最后创建的图层显示在最上方 */}
          {[...layers].reverse().map((layer, reverseIndex) => {
            const index = layers.length - 1 - reverseIndex; // 计算原始索引
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
                onClick={() => onLayerSelect?.(layer.id)}
              >
                {/* 图层内容 */}
                <div className="flex items-center space-x-2">
                  {/* 预览缩略图 */}
                  <div className="w-8 h-8 bg-gray-100 rounded border flex-shrink-0">
                    {layer.thumbnail ? (
                      <img 
                        src={layer.thumbnail} 
                        alt={layer.name}
                        className="w-full h-full object-cover rounded"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <span className="text-xs">图</span>
                      </div>
                    )}
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
                          onDoubleClick={() => handleNameEdit(layer)}
                        >
                          {layer.name}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNameEdit(layer);
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
                      disabled={index === 0}
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
                      disabled={index === layers.length - 1}
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

                {/* 不透明度滑块 */}
                <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500">不透明度</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={layer.opacity || 1}
                      onChange={(e) => {
                        const opacity = parseFloat(e.target.value);
                        // 这里需要添加更新图层不透明度的回调
                        // onLayerUpdateOpacity?.(layer.id, opacity);
                      }}
                      className="flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span className="text-xs text-gray-500 w-8">
                      {Math.round((layer.opacity || 1) * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 空状态 */}
        {layers.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">暂无图层</p>
            <button
              onClick={onLayerAdd}
              className="mt-2 btn btn-primary text-sm"
            >
              创建图层
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LayerPanel;