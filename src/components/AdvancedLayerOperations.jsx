import React, { useState } from 'react';
import { 
  Copy, 
  GitMerge, 
  Split, 
  RotateCcw, 
  Trash2,
  Eye,
  EyeOff,
  Lock,
  Unlock
} from 'lucide-react';
import clsx from 'clsx';

const AdvancedLayerOperations = ({ 
  layers = [], 
  onLayerMerge,
  onLayerSplit,
  onLayerClone,
  onLayerDelete,
  onLayerVisibilityToggle,
  onLayerLockToggle,
  className 
}) => {
  const [selectedLayerIds, setSelectedLayerIds] = useState([]);
  const [operationMode, setOperationMode] = useState('merge'); // 'merge', 'clone', 'delete'

  // 过滤掉锁定的图层
  const availableLayers = layers.filter(layer => !layer.locked);

  // 切换图层选择
  const toggleLayerSelection = (layerId) => {
    setSelectedLayerIds(prev => 
      prev.includes(layerId)
        ? prev.filter(id => id !== layerId)
        : [...prev, layerId]
    );
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedLayerIds.length === availableLayers.length) {
      setSelectedLayerIds([]);
    } else {
      setSelectedLayerIds(availableLayers.map(layer => layer.id));
    }
  };

  // 执行操作
  const executeOperation = () => {
    if (selectedLayerIds.length === 0) return;

    switch (operationMode) {
      case 'merge':
        if (selectedLayerIds.length >= 2) {
          // 合并图层 - 将所有选中的图层合并到第一个图层
          const targetLayerId = selectedLayerIds[0];
          const sourceLayerIds = selectedLayerIds.slice(1);
          
          onLayerMerge?.({
            targetLayerId,
            sourceLayerIds
          });
          
          // 清除选择
          setSelectedLayerIds([]);
        }
        break;
        
      case 'clone':
        // 克隆选中的图层
        selectedLayerIds.forEach(layerId => {
          onLayerClone?.(layerId);
        });
        
        // 清除选择
        setSelectedLayerIds([]);
        break;
        
      case 'delete':
        // 删除选中的图层
        selectedLayerIds.forEach(layerId => {
          onLayerDelete?.(layerId);
        });
        
        // 清除选择
        setSelectedLayerIds([]);
        break;
        
      default:
        break;
    }
  };

  // 切换图层可见性
  const toggleLayerVisibility = (layerId, e) => {
    e.stopPropagation();
    onLayerVisibilityToggle?.(layerId);
  };

  // 切换图层锁定状态
  const toggleLayerLock = (layerId, e) => {
    e.stopPropagation();
    onLayerLockToggle?.(layerId);
  };

  return (
    <div className={clsx('panel p-4', className)}>
      <div className="space-y-4">
        {/* 标题 */}
        <div className="flex items-center gap-2">
          <RotateCcw className="w-5 h-5 text-green-600" />
          <h3 className="text-lg font-semibold text-gray-900">高级操作</h3>
        </div>

        {/* 操作模式选择 */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">操作类型</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setOperationMode('merge')}
              className={clsx(
                'p-3 rounded-lg border text-sm font-medium transition-colors',
                operationMode === 'merge'
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-300 hover:bg-gray-50'
              )}
            >
              <GitMerge className="w-4 h-4 mx-auto mb-1" />
              合并
            </button>
            <button
              onClick={() => setOperationMode('clone')}
              className={clsx(
                'p-3 rounded-lg border text-sm font-medium transition-colors',
                operationMode === 'clone'
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-300 hover:bg-gray-50'
              )}
            >
              <Copy className="w-4 h-4 mx-auto mb-1" />
              克隆
            </button>
            <button
              onClick={() => setOperationMode('delete')}
              className={clsx(
                'p-3 rounded-lg border text-sm font-medium transition-colors',
                operationMode === 'delete'
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-300 hover:bg-gray-50'
              )}
            >
              <Trash2 className="w-4 h-4 mx-auto mb-1" />
              删除
            </button>
          </div>
        </div>

        {/* 图层列表 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">选择图层</label>
            <button
              onClick={toggleSelectAll}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              {selectedLayerIds.length === availableLayers.length ? '取消全选' : '全选'}
            </button>
          </div>
          
          <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg">
            {availableLayers.length > 0 ? (
              availableLayers.map(layer => (
                <div
                  key={layer.id}
                  onClick={() => toggleLayerSelection(layer.id)}
                  className={clsx(
                    'flex items-center justify-between p-2 cursor-pointer hover:bg-gray-50 transition-colors',
                    selectedLayerIds.includes(layer.id) ? 'bg-blue-50' : 'bg-white'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${
                      selectedLayerIds.includes(layer.id) ? 'bg-blue-500' : 'bg-gray-300'
                    }`}></div>
                    <span className="text-sm text-gray-900 truncate max-w-[120px]">
                      {layer.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => toggleLayerVisibility(layer.id, e)}
                      className="p-1 rounded text-gray-400 hover:text-gray-600"
                    >
                      {layer.visible ? (
                        <Eye className="w-3 h-3" />
                      ) : (
                        <EyeOff className="w-3 h-3" />
                      )}
                    </button>
                    <button
                      onClick={(e) => toggleLayerLock(layer.id, e)}
                      className="p-1 rounded text-gray-400 hover:text-gray-600"
                    >
                      {layer.locked ? (
                        <Lock className="w-3 h-3" />
                      ) : (
                        <Unlock className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-gray-500 text-sm">
                暂无可用图层
              </div>
            )}
          </div>
        </div>

        {/* 操作按钮 */}
        <button
          onClick={executeOperation}
          disabled={selectedLayerIds.length === 0 || 
            (operationMode === 'merge' && selectedLayerIds.length < 2)}
          className={clsx(
            'w-full flex items-center justify-center gap-2 p-3 rounded-lg font-medium transition-colors',
            selectedLayerIds.length > 0 && 
            (operationMode !== 'merge' || selectedLayerIds.length >= 2)
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          )}
        >
          {operationMode === 'merge' && <GitMerge className="w-4 h-4" />}
          {operationMode === 'clone' && <Copy className="w-4 h-4" />}
          {operationMode === 'delete' && <Trash2 className="w-4 h-4" />}
          <span>
            {operationMode === 'merge' && selectedLayerIds.length >= 2 
              ? `合并 ${selectedLayerIds.length} 个图层` 
              : operationMode === 'clone'
              ? `克隆 ${selectedLayerIds.length} 个图层`
              : operationMode === 'delete'
              ? `删除 ${selectedLayerIds.length} 个图层`
              : operationMode === 'merge'
              ? '至少选择2个图层进行合并'
              : `执行${operationMode === 'clone' ? '克隆' : '删除'}操作`}
          </span>
        </button>

        {/* 操作说明 */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-1">操作说明</h4>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• 合并: 将多个图层合并为一个图层</li>
            <li>• 克隆: 创建选中图层的副本</li>
            <li>• 删除: 永久删除选中的图层</li>
            <li>• 锁定的图层无法被选择和操作</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AdvancedLayerOperations;
