import React, { useState, useCallback } from 'react';
import { 
  Shuffle, 
  Layers, 
  GitMerge, 
  Zap,
  Eye,
  EyeOff,
  Lock,
  Unlock
} from 'lucide-react';
import clsx from 'clsx';

const CrossLayerFusion = ({ 
  layers = [], 
  onFusionStart,
  onLayerVisibilityToggle,
  onLayerLockToggle,
  className 
}) => {
  const [sourceLayerId, setSourceLayerId] = useState(null);
  const [targetLayerId, setTargetLayerId] = useState(null);
  const [fusionMode, setFusionMode] = useState('blend'); // 'blend', 'replace', 'add'
  const [fusionStrength, setFusionStrength] = useState(0.5);
  const [isFusing, setIsFusing] = useState(false);

  // 过滤掉锁定的图层
  const availableLayers = layers.filter(layer => !layer.locked);

  // 获取图层名称
  const getLayerName = (layerId) => {
    const layer = layers.find(l => l.id === layerId);
    return layer ? layer.name : '未知图层';
  };

  // 交换源和目标图层
  const swapLayers = () => {
    setSourceLayerId(targetLayerId);
    setTargetLayerId(sourceLayerId);
  };

  // 开始融合
  const startFusion = useCallback(() => {
    if (!sourceLayerId || !targetLayerId) return;
    
    setIsFusing(true);
    
    // 模拟融合过程
    setTimeout(() => {
      onFusionStart?.({
        sourceLayerId,
        targetLayerId,
        mode: fusionMode,
        strength: fusionStrength
      });
      setIsFusing(false);
    }, 1000);
  }, [sourceLayerId, targetLayerId, fusionMode, fusionStrength, onFusionStart]);

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
          <Shuffle className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900">跨图层融合</h3>
        </div>

        {/* 图层选择区域 */}
        <div className="space-y-3">
          {/* 源图层选择 */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">源图层</label>
            <select
              value={sourceLayerId || ''}
              onChange={(e) => setSourceLayerId(e.target.value || null)}
              className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="">选择源图层</option>
              {availableLayers.map(layer => (
                <option key={layer.id} value={layer.id}>
                  {layer.name}
                </option>
              ))}
            </select>
          </div>

          {/* 交换按钮 */}
          <div className="flex justify-center">
            <button
              onClick={swapLayers}
              disabled={!sourceLayerId && !targetLayerId}
              className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Shuffle className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          {/* 目标图层选择 */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">目标图层</label>
            <select
              value={targetLayerId || ''}
              onChange={(e) => setTargetLayerId(e.target.value || null)}
              className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="">选择目标图层</option>
              {availableLayers.map(layer => (
                <option key={layer.id} value={layer.id}>
                  {layer.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 融合模式选择 */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">融合模式</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setFusionMode('blend')}
              className={clsx(
                'p-3 rounded-lg border text-sm font-medium transition-colors',
                fusionMode === 'blend'
                  ? 'border-purple-500 bg-purple-50 text-purple-700'
                  : 'border-gray-300 hover:bg-gray-50'
              )}
            >
              <GitMerge className="w-4 h-4 mx-auto mb-1" />
              混合
            </button>
            <button
              onClick={() => setFusionMode('replace')}
              className={clsx(
                'p-3 rounded-lg border text-sm font-medium transition-colors',
                fusionMode === 'replace'
                  ? 'border-purple-500 bg-purple-50 text-purple-700'
                  : 'border-gray-300 hover:bg-gray-50'
              )}
            >
              <Zap className="w-4 h-4 mx-auto mb-1" />
              替换
            </button>
            <button
              onClick={() => setFusionMode('add')}
              className={clsx(
                'p-3 rounded-lg border text-sm font-medium transition-colors',
                fusionMode === 'add'
                  ? 'border-purple-500 bg-purple-50 text-purple-700'
                  : 'border-gray-300 hover:bg-gray-50'
              )}
            >
              <Layers className="w-4 h-4 mx-auto mb-1" />
              叠加
            </button>
          </div>
        </div>

        {/* 融合强度 */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-sm font-medium text-gray-700">融合强度</label>
            <span className="text-sm text-gray-900">{fusionStrength.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={fusionStrength}
            onChange={(e) => setFusionStrength(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* 融合按钮 */}
        <button
          onClick={startFusion}
          disabled={!sourceLayerId || !targetLayerId || isFusing}
          className={clsx(
            'w-full flex items-center justify-center gap-2 p-3 rounded-lg font-medium transition-colors',
            sourceLayerId && targetLayerId && !isFusing
              ? 'bg-purple-600 text-white hover:bg-purple-700'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          )}
        >
          {isFusing ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>融合中...</span>
            </>
          ) : (
            <>
              <Shuffle className="w-4 h-4" />
              <span>开始融合</span>
            </>
          )}
        </button>

        {/* 选中图层预览 */}
        {(sourceLayerId || targetLayerId) && (
          <div className="p-3 bg-gray-50 rounded-lg space-y-2">
            <h4 className="text-sm font-medium text-gray-700">选中图层</h4>
            <div className="space-y-1">
              {sourceLayerId && (
                <div className="flex items-center justify-between p-2 bg-white rounded border">
                  <span className="text-xs text-gray-600">源: {getLayerName(sourceLayerId)}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        const layer = layers.find(l => l.id === sourceLayerId);
                        if (layer) toggleLayerVisibility(sourceLayerId, e);
                      }}
                      className="p-1 rounded text-gray-400 hover:text-gray-600"
                    >
                      {layers.find(l => l.id === sourceLayerId)?.visible ? (
                        <Eye className="w-3 h-3" />
                      ) : (
                        <EyeOff className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>
              )}
              {targetLayerId && (
                <div className="flex items-center justify-between p-2 bg-white rounded border">
                  <span className="text-xs text-gray-600">目标: {getLayerName(targetLayerId)}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        const layer = layers.find(l => l.id === targetLayerId);
                        if (layer) toggleLayerVisibility(targetLayerId, e);
                      }}
                      className="p-1 rounded text-gray-400 hover:text-gray-600"
                    >
                      {layers.find(l => l.id === targetLayerId)?.visible ? (
                        <Eye className="w-3 h-3" />
                      ) : (
                        <EyeOff className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CrossLayerFusion;