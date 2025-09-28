import React, { useState, useEffect, useCallback } from 'react';
import { 
  Scissors, 
  Layers, 
  Eye, 
  EyeOff, 
  Trash2, 
  Plus,
  Square,
  Circle,
  Target
} from 'lucide-react';
import clsx from 'clsx';

const MaskManager = ({ 
  layers = [], 
  activeLayerId, 
  onMaskCreate,
  onMaskApply,
  onMaskRemove,
  onMaskToggle,
  className 
}) => {
  const [maskMode, setMaskMode] = useState('create'); // 'create', 'apply', 'edit'
  const [selectedMaskShape, setSelectedMaskShape] = useState('rectangle'); // 'rectangle', 'circle', 'freehand'
  const [activeMasks, setActiveMasks] = useState(new Map()); // layerId -> maskInfo

  const activeLayer = layers.find(layer => layer.id === activeLayerId);

  // 创建蒙版
  const handleCreateMask = useCallback((shape) => {
    if (!activeLayerId) return;
    
    setSelectedMaskShape(shape);
    setMaskMode('create');
    onMaskCreate?.(activeLayerId, shape);
  }, [activeLayerId, onMaskCreate]);

  // 应用蒙版到图层
  const handleApplyMask = useCallback((targetLayerId, maskData) => {
    onMaskApply?.(targetLayerId, maskData);
    setActiveMasks(prev => new Map(prev.set(targetLayerId, maskData)));
  }, [onMaskApply]);

  // 移除蒙版
  const handleRemoveMask = useCallback((layerId) => {
    onMaskRemove?.(layerId);
    setActiveMasks(prev => {
      const newMap = new Map(prev);
      newMap.delete(layerId);
      return newMap;
    });
  }, [onMaskRemove]);

  // 切换蒙版可见性
  const handleToggleMask = useCallback((layerId) => {
    const maskInfo = activeMasks.get(layerId);
    if (maskInfo) {
      const newMaskInfo = { ...maskInfo, visible: !maskInfo.visible };
      setActiveMasks(prev => new Map(prev.set(layerId, newMaskInfo)));
      onMaskToggle?.(layerId, newMaskInfo.visible);
    }
  }, [activeMasks, onMaskToggle]);

  return (
    <div className={clsx('panel p-3', className)}>
      <div className="space-y-4">
        {/* 标题 */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900">蒙版管理</h3>
          <div className="flex items-center space-x-1">
            <Scissors size={14} className="text-gray-500" />
          </div>
        </div>

        {/* 蒙版模式选择 */}
        <div className="space-y-2">
          <div className="text-xs text-gray-500">蒙版模式</div>
          <div className="flex space-x-1">
            <button
              onClick={() => setMaskMode('create')}
              className={clsx(
                'px-2 py-1 text-xs rounded transition-colors',
                maskMode === 'create' 
                  ? 'bg-primary-100 text-primary-700 border border-primary-200' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              创建
            </button>
            <button
              onClick={() => setMaskMode('apply')}
              className={clsx(
                'px-2 py-1 text-xs rounded transition-colors',
                maskMode === 'apply' 
                  ? 'bg-primary-100 text-primary-700 border border-primary-200' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              应用
            </button>
            <button
              onClick={() => setMaskMode('edit')}
              className={clsx(
                'px-2 py-1 text-xs rounded transition-colors',
                maskMode === 'edit' 
                  ? 'bg-primary-100 text-primary-700 border border-primary-200' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              编辑
            </button>
          </div>
        </div>

        {/* 创建蒙版工具 */}
        {maskMode === 'create' && (
          <div className="space-y-2">
            <div className="text-xs text-gray-500">蒙版形状</div>
            <div className="grid grid-cols-3 gap-1">
              <button
                onClick={() => handleCreateMask('rectangle')}
                className={clsx(
                  'p-2 rounded border-2 transition-all hover:bg-gray-50',
                  selectedMaskShape === 'rectangle'
                    ? 'border-primary-300 bg-primary-50'
                    : 'border-gray-200'
                )}
                title="矩形蒙版"
              >
                <Square size={16} className="mx-auto" />
              </button>
              <button
                onClick={() => handleCreateMask('circle')}
                className={clsx(
                  'p-2 rounded border-2 transition-all hover:bg-gray-50',
                  selectedMaskShape === 'circle'
                    ? 'border-primary-300 bg-primary-50'
                    : 'border-gray-200'
                )}
                title="圆形蒙版"
              >
                <Circle size={16} className="mx-auto" />
              </button>
              <button
                onClick={() => handleCreateMask('freehand')}
                className={clsx(
                  'p-2 rounded border-2 transition-all hover:bg-gray-50',
                  selectedMaskShape === 'freehand'
                    ? 'border-primary-300 bg-primary-50'
                    : 'border-gray-200'
                )}
                title="自由绘制蒙版"
              >
                <Target size={16} className="mx-auto" />
              </button>
            </div>
          </div>
        )}

        {/* 当前图层信息 */}
        {activeLayer && (
          <div className="space-y-2">
            <div className="text-xs text-gray-500">当前图层</div>
            <div className="p-2 bg-gray-50 rounded text-sm">
              <div className="font-medium">{activeLayer.name}</div>
              <div className="text-gray-500 text-xs">
                {activeMasks.has(activeLayerId) ? '已应用蒙版' : '未应用蒙版'}
              </div>
            </div>
          </div>
        )}

        {/* 图层蒙版列表 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">图层蒙版</div>
            <span className="text-xs text-gray-400">{activeMasks.size} 个</span>
          </div>
          
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {Array.from(activeMasks.entries()).map(([layerId, maskInfo]) => {
              const layer = layers.find(l => l.id === layerId);
              if (!layer) return null;
              
              return (
                <div
                  key={layerId}
                  className="flex items-center justify-between p-2 bg-white border rounded text-sm group hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-2 min-w-0 flex-1">
                    <Layers size={12} className="text-gray-400 flex-shrink-0" />
                    <span className="truncate">{layer.name}</span>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {maskInfo.shape}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleToggleMask(layerId)}
                      className="p-1 rounded text-gray-400 hover:text-gray-600"
                      title={maskInfo.visible ? '隐藏蒙版' : '显示蒙版'}
                    >
                      {maskInfo.visible ? <Eye size={10} /> : <EyeOff size={10} />}
                    </button>
                    <button
                      onClick={() => handleRemoveMask(layerId)}
                      className="p-1 rounded text-gray-400 hover:text-red-600"
                      title="移除蒙版"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          
          {activeMasks.size === 0 && (
            <div className="text-center py-4 text-gray-400">
              <p className="text-xs">暂无蒙版</p>
            </div>
          )}
        </div>

        {/* 蒙版预设 */}
        <div className="space-y-2">
          <div className="text-xs text-gray-500">快速蒙版</div>
          <div className="space-y-1">
            <button
              onClick={() => handleCreateMask('rectangle')}
              className="w-full p-2 text-xs text-left rounded border hover:bg-gray-50 transition-colors"
            >
              <div className="font-medium">矩形裁剪</div>
              <div className="text-gray-500">创建矩形蒙版并应用</div>
            </button>
            <button
              onClick={() => handleCreateMask('circle')}
              className="w-full p-2 text-xs text-left rounded border hover:bg-gray-50 transition-colors"
            >
              <div className="font-medium">圆形遮罩</div>
              <div className="text-gray-500">创建圆形蒙版并应用</div>
            </button>
          </div>
        </div>

        {/* 使用提示 */}
        <div className="p-2 bg-blue-50 rounded text-xs text-blue-700">
          <div className="font-medium mb-1">使用提示:</div>
          <ul className="space-y-0.5 text-blue-600">
            <li>• 选择蒙版形状后在画布上绘制</li>
            <li>• 蒙版将隐藏形状外的内容</li>
            <li>• 可以为每个图层单独设置蒙版</li>
            <li>• 蒙版最小尺寸：5x5像素</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default MaskManager;