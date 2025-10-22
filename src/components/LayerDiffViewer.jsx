import React from 'react';
import { 
  GitCompare, 
  Plus, 
  Trash2, 
  Edit3,
  Layers,
  Eye,
  EyeOff,
  Lock,
  Unlock
} from 'lucide-react';
import clsx from 'clsx';

const LayerDiffViewer = ({ 
  diff, 
  beforeState, 
  afterState,
  onRevertChange,
  className 
}) => {
  if (!diff) {
    return (
      <div className={clsx('panel p-4 text-center text-gray-500', className)}>
        无差异数据
      </div>
    );
  }

  // 渲染图层差异
  const renderLayerDiffs = () => {
    if (!diff.layers) return null;

    return (
      <div className="space-y-3">
        <h4 className="font-medium text-gray-900 flex items-center gap-2">
          <Layers className="w-4 h-4" />
          图层变更
        </h4>
        
        {/* 新增的图层 */}
        {diff.layers.added && diff.layers.added.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="text-sm font-medium text-green-800 mb-2 flex items-center gap-1">
              <Plus className="w-4 h-4" />
              新增 ({diff.layers.added.length})
            </div>
            <div className="space-y-2">
              {diff.layers.added.map(layer => (
                <div key={layer.id} className="flex items-center justify-between p-2 bg-white rounded border">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-sm text-gray-900">{layer.name}</span>
                  </div>
                  <button
                    onClick={() => onRevertChange?.('layer', 'remove', layer.id)}
                    className="text-xs text-red-600 hover:text-red-800"
                  >
                    撤销
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 删除的图层 */}
        {diff.layers.removed && diff.layers.removed.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="text-sm font-medium text-red-800 mb-2 flex items-center gap-1">
              <Trash2 className="w-4 h-4" />
              删除 ({diff.layers.removed.length})
            </div>
            <div className="space-y-2">
              {diff.layers.removed.map(layer => (
                <div key={layer.id} className="flex items-center justify-between p-2 bg-white rounded border">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span className="text-sm text-gray-900">{layer.name}</span>
                  </div>
                  <button
                    onClick={() => onRevertChange?.('layer', 'add', layer)}
                    className="text-xs text-green-600 hover:text-green-800"
                  >
                    恢复
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 修改的图层 */}
        {diff.layers.modified && diff.layers.modified.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="text-sm font-medium text-blue-800 mb-2 flex items-center gap-1">
              <Edit3 className="w-4 h-4" />
              修改 ({diff.layers.modified.length})
            </div>
            <div className="space-y-3">
              {diff.layers.modified.map(modifiedLayer => (
                <div key={modifiedLayer.id} className="bg-white rounded-lg border">
                  <div className="p-2 border-b">
                    <span className="text-sm font-medium text-gray-900">
                      {modifiedLayer.name || `图层 ${modifiedLayer.id}`}
                    </span>
                  </div>
                  <div className="p-2 space-y-2">
                    {Object.keys(modifiedLayer)
                      .filter(key => key !== 'id' && key !== 'name')
                      .map(key => (
                        <div key={key} className="flex items-center justify-between text-xs">
                          <span className="text-gray-600">{getKeyLabel(key)}:</span>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 line-through">
                              {formatValue(modifiedLayer[key].before, key)}
                            </span>
                            <span className="text-gray-900">→</span>
                            <span className="text-gray-900 font-medium">
                              {formatValue(modifiedLayer[key].after, key)}
                            </span>
                            <button
                              onClick={() => onRevertChange?.('layer', 'modify', {
                                id: modifiedLayer.id,
                                key,
                                value: modifiedLayer[key].before
                              })}
                              className="text-xs text-blue-600 hover:text-blue-800"
                            >
                              撤销
                            </button>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // 渲染蒙版差异
  const renderMaskDiffs = () => {
    if (!diff.masks) return null;

    return (
      <div className="space-y-3">
        <h4 className="font-medium text-gray-900 flex items-center gap-2">
          <Eye className="w-4 h-4" />
          蒙版变更
        </h4>
        
        {/* 新增的蒙版 */}
        {diff.masks.added && diff.masks.added.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="text-sm font-medium text-green-800 mb-2 flex items-center gap-1">
              <Plus className="w-4 h-4" />
              新增 ({diff.masks.added.length})
            </div>
            <div className="space-y-2">
              {diff.masks.added.map(mask => (
                <div key={mask.id} className="flex items-center justify-between p-2 bg-white rounded border">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-sm text-gray-900">蒙版 {mask.id.substring(0, 8)}</span>
                  </div>
                  <button
                    onClick={() => onRevertChange?.('mask', 'remove', mask.id)}
                    className="text-xs text-red-600 hover:text-red-800"
                  >
                    撤销
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 删除的蒙版 */}
        {diff.masks.removed && diff.masks.removed.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="text-sm font-medium text-red-800 mb-2 flex items-center gap-1">
              <Trash2 className="w-4 h-4" />
              删除 ({diff.masks.removed.length})
            </div>
            <div className="space-y-2">
              {diff.masks.removed.map(mask => (
                <div key={mask.id} className="flex items-center justify-between p-2 bg-white rounded border">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span className="text-sm text-gray-900">蒙版 {mask.id.substring(0, 8)}</span>
                  </div>
                  <button
                    onClick={() => onRevertChange?.('mask', 'add', mask)}
                    className="text-xs text-green-600 hover:text-green-800"
                  >
                    恢复
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 修改的蒙版 */}
        {diff.masks.modified && diff.masks.modified.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="text-sm font-medium text-blue-800 mb-2 flex items-center gap-1">
              <Edit3 className="w-4 h-4" />
              修改 ({diff.masks.modified.length})
            </div>
            <div className="space-y-3">
              {diff.masks.modified.map(modifiedMask => (
                <div key={modifiedMask.id} className="bg-white rounded-lg border">
                  <div className="p-2 border-b">
                    <span className="text-sm font-medium text-gray-900">
                      蒙版 {modifiedMask.id.substring(0, 8)}
                    </span>
                  </div>
                  <div className="p-2 space-y-2">
                    {Object.keys(modifiedMask)
                      .filter(key => key !== 'id')
                      .map(key => (
                        <div key={key} className="flex items-center justify-between text-xs">
                          <span className="text-gray-600">{getKeyLabel(key)}:</span>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 line-through">
                              {formatValue(modifiedMask[key].before, key)}
                            </span>
                            <span className="text-gray-900">→</span>
                            <span className="text-gray-900 font-medium">
                              {formatValue(modifiedMask[key].after, key)}
                            </span>
                            <button
                              onClick={() => onRevertChange?.('mask', 'modify', {
                                id: modifiedMask.id,
                                key,
                                value: modifiedMask[key].before
                              })}
                              className="text-xs text-blue-600 hover:text-blue-800"
                            >
                              撤销
                            </button>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // 获取属性标签
  const getKeyLabel = (key) => {
    const labels = {
      'name': '名称',
      'visible': '可见性',
      'locked': '锁定',
      'opacity': '不透明度',
      'blendMode': '混合模式',
      'parentId': '父图层',
      'effects': '效果',
      'objects': '对象',
      'type': '类型',
      'inverted': '反相',
      'density': '密度',
      'feather': '羽化',
      'bounds': '边界'
    };
    return labels[key] || key;
  };

  // 格式化值显示
  const formatValue = (value, key) => {
    if (value === null || value === undefined) return '无';
    if (typeof value === 'boolean') {
      if (key === 'visible') return value ? '显示' : '隐藏';
      if (key === 'locked') return value ? '锁定' : '解锁';
      if (key === 'inverted') return value ? '是' : '否';
      return value ? '是' : '否';
    }
    if (typeof value === 'number') {
      if (key === 'opacity' || key === 'density') return `${Math.round(value * 100)}%`;
      return value.toString();
    }
    if (Array.isArray(value)) {
      if (key === 'effects') return `${value.length} 个效果`;
      if (key === 'objects') return `${value.length} 个对象`;
      return `[${value.length} 项]`;
    }
    if (typeof value === 'object') {
      if (key === 'bounds') return `${value.width}×${value.height}`;
      return JSON.stringify(value);
    }
    return value.toString();
  };

  return (
    <div className={clsx('panel p-4', className)}>
      <div className="space-y-4">
        {/* 标题 */}
        <div className="flex items-center gap-2">
          <GitCompare className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900">差异对比</h3>
        </div>

        {/* 差异内容 */}
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {renderLayerDiffs()}
          {renderMaskDiffs()}
          
          {/* 图层组差异 */}
          {diff.layerGroups && (
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">图层组变更</h4>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="text-sm text-blue-800">
                  图层组结构已变更
                </div>
                <button
                  onClick={() => onRevertChange?.('layerGroups', 'revert')}
                  className="mt-2 text-xs text-blue-600 hover:text-blue-800"
                >
                  撤销变更
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 无差异提示 */}
        {!diff.layers && !diff.masks && !diff.layerGroups && (
          <div className="text-center py-8 text-gray-500">
            <GitCompare className="mx-auto h-8 w-8 text-gray-300" />
            <p className="mt-2 text-sm">两个版本之间无差异</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LayerDiffViewer;