import React, { useState } from 'react';
import { 
  Folder, 
  FolderOpen, 
  Plus, 
  Trash2, 
  Edit2,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import clsx from 'clsx';

const LayerGroupManager = ({ 
  layerGroups = [], 
  layers = [],
  expandedGroups = new Set(),
  onGroupCreate,
  onGroupDelete,
  onGroupRename,
  onGroupToggle,
  onLayerMoveToGroup,
  className 
}) => {
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [editingName, setEditingName] = useState('');

  const handleNameEdit = (group) => {
    setEditingGroupId(group.id);
    setEditingName(group.name);
  };

  const handleNameSave = () => {
    if (editingGroupId && editingName.trim()) {
      onGroupRename?.(editingGroupId, editingName.trim());
    }
    setEditingGroupId(null);
    setEditingName('');
  };

  const handleNameCancel = () => {
    setEditingGroupId(null);
    setEditingName('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleNameSave();
    } else if (e.key === 'Escape') {
      handleNameCancel();
    }
  };

  const getGroupLayers = (groupId) => {
    return layers.filter(layer => layer.parentId === groupId);
  };

  const renderGroup = (group, depth = 0) => {
    const isExpanded = expandedGroups.has(group.id);
    const groupLayers = getGroupLayers(group.id);
    const hasLayers = groupLayers.length > 0;
    
    return (
      <div key={group.id} className="mb-1">
        {/* 组标题 */}
        <div
          className={clsx(
            'group flex items-center p-2 rounded-lg border cursor-pointer transition-colors',
            isExpanded ? 'bg-blue-50 border-blue-200' : 'bg-gray-100 border-gray-200 hover:bg-gray-200'
          )}
          style={{ marginLeft: `${depth * 16}px` }}
          onClick={() => onGroupToggle?.(group.id)}
        >
          <button className="text-gray-500 mr-2">
            {isExpanded ? <FolderOpen size={16} /> : <Folder size={16} />}
          </button>
          
          {editingGroupId === group.id ? (
            <input
              type="text"
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onBlur={handleNameSave}
              onKeyDown={handleKeyPress}
              className="flex-1 px-1 py-0.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
          ) : (
            <div className="flex items-center flex-1 min-w-0">
              <span 
                className="text-sm font-medium text-gray-900 truncate cursor-text"
                onDoubleClick={() => handleNameEdit(group)}
              >
                {group.name}
              </span>
              <span className="text-xs text-gray-500 ml-2">
                ({groupLayers.length})
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleNameEdit(group);
                }}
                className="opacity-0 group-hover:opacity-100 ml-1 p-0.5 rounded text-gray-400 hover:text-gray-600 transition-all"
                title="重命名组"
              >
                <Edit2 size={12} />
              </button>
            </div>
          )}
          
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
                onGroupDelete?.(group.id);
              }}
              className="p-1 rounded text-gray-400 hover:text-red-600"
              title="删除组"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
        
        {/* 展开的组内容 */}
        {isExpanded && hasLayers && (
          <div className="ml-4 mt-1 space-y-1">
            {groupLayers.map(layer => (
              <div 
                key={layer.id}
                className="flex items-center p-2 bg-white rounded border border-gray-200 text-sm"
                style={{ marginLeft: `${depth * 16}px` }}
              >
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                <span className="truncate flex-1">{layer.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // 移出组
                    onLayerMoveToGroup?.(layer.id, null);
                  }}
                  className="p-1 rounded text-gray-400 hover:text-red-600"
                  title="从组中移出"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={clsx('panel p-3', className)}>
      <div className="space-y-3">
        {/* 标题和添加按钮 */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900">图层组</h3>
          <button
            onClick={() => onGroupCreate?.()}
            className="p-1 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            title="创建新组"
          >
            <Plus size={16} />
          </button>
        </div>

        {/* 组列表 */}
        <div className="space-y-1 max-h-64 overflow-y-auto scrollbar-hidden">
          {layerGroups.length > 0 ? (
            layerGroups.map(group => renderGroup(group))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Folder className="mx-auto h-8 w-8 text-gray-300" />
              <p className="mt-2 text-sm">暂无图层组</p>
              <button
                onClick={() => onGroupCreate?.()}
                className="mt-2 btn btn-primary text-sm"
              >
                创建图层组
              </button>
            </div>
          )}
        </div>

        {/* 拖拽区域 */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
          <p className="text-xs text-gray-500">
            拖拽图层到此处创建新组
          </p>
        </div>
      </div>
    </div>
  );
};

export default LayerGroupManager;