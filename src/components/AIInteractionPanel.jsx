import React, { useState, useMemo } from 'react';
import { 
  Brain, 
  Target, 
  Layers, 
  ArrowRight, 
  Settings,
  Eye,
  EyeOff,
  Lock,
  Unlock
} from 'lucide-react';
import clsx from 'clsx';

const AIInteractionPanel = ({ 
  layers = [], 
  activeLayerId,
  onLayerSelect,
  onGenerate,
  onLayerVisibilityToggle,
  onLayerLockToggle,
  className 
}) => {
  const [selectedLayerId, setSelectedLayerId] = useState(activeLayerId);
  const [showLayerList, setShowLayerList] = useState(false);
  const [generationSettings, setGenerationSettings] = useState({
    prompt: '',
    strength: 0.7,
    guidance: 7.5
  });

  // 过滤掉锁定的图层
  const availableLayers = useMemo(() => {
    return layers.filter(layer => !layer.locked);
  }, [layers]);

  // 当前选中的图层
  const selectedLayer = useMemo(() => {
    return layers.find(layer => layer.id === selectedLayerId) || null;
  }, [layers, selectedLayerId]);

  // 处理图层选择
  const handleLayerSelect = (layerId) => {
    setSelectedLayerId(layerId);
    onLayerSelect?.(layerId);
    setShowLayerList(false);
  };

  // 处理生成请求
  const handleGenerate = () => {
    if (!selectedLayer) return;
    
    onGenerate?.({
      targetLayerId: selectedLayerId,
      prompt: generationSettings.prompt,
      strength: generationSettings.strength,
      guidance: generationSettings.guidance,
      contextLayers: availableLayers.filter(layer => 
        layer.id !== selectedLayerId && layer.visible
      ).map(layer => layer.id)
    });
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
          <Brain className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">AI交互</h3>
        </div>

        {/* 目标图层选择 */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">目标图层</label>
          <div className="relative">
            <button
              onClick={() => setShowLayerList(!showLayerList)}
              className="w-full flex items-center justify-between p-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-900">
                  {selectedLayer ? selectedLayer.name : '选择目标图层'}
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400" />
            </button>

            {/* 图层列表下拉 */}
            {showLayerList && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                {availableLayers.length > 0 ? (
                  availableLayers.map(layer => (
                    <div
                      key={layer.id}
                      onClick={() => handleLayerSelect(layer.id)}
                      className={clsx(
                        'flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 transition-colors',
                        selectedLayerId === layer.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
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
                  <div className="p-3 text-center text-gray-500 text-sm">
                    暂无可用图层
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 生成参数设置 */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-700">生成参数</label>
          
          {/* Prompt输入 */}
          <div>
            <textarea
              value={generationSettings.prompt}
              onChange={(e) => setGenerationSettings(prev => ({
                ...prev,
                prompt: e.target.value
              }))}
              placeholder="输入生成提示词..."
              className="w-full p-3 text-sm border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
            />
          </div>

          {/* Strength滑块 */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs text-gray-600">强度</label>
              <span className="text-xs text-gray-900">{generationSettings.strength.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={generationSettings.strength}
              onChange={(e) => setGenerationSettings(prev => ({
                ...prev,
                strength: parseFloat(e.target.value)
              }))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Guidance滑块 */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs text-gray-600">引导系数</label>
              <span className="text-xs text-gray-900">{generationSettings.guidance.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="20"
              step="0.1"
              value={generationSettings.guidance}
              onChange={(e) => setGenerationSettings(prev => ({
                ...prev,
                guidance: parseFloat(e.target.value)
              }))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>

        {/* 生成按钮 */}
        <button
          onClick={handleGenerate}
          disabled={!selectedLayer || !generationSettings.prompt.trim()}
          className={clsx(
            'w-full flex items-center justify-center gap-2 p-3 rounded-lg font-medium transition-colors',
            selectedLayer && generationSettings.prompt.trim()
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          )}
        >
          <Brain className="w-4 h-4" />
          <span>开始生成</span>
        </button>

        {/* 上下文图层信息 */}
        {selectedLayer && (
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Settings className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">上下文信息</span>
            </div>
            <div className="text-xs text-gray-600">
              <p>目标图层: {selectedLayer.name}</p>
              <p>可见图层数: {
                availableLayers.filter(layer => 
                  layer.id !== selectedLayerId && layer.visible
                ).length
              }</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIInteractionPanel;