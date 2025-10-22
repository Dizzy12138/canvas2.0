import React, { useState } from 'react';
import { 
  Square, 
  Circle, 
  Pen, 
  Eye, 
  EyeOff, 
  RotateCcw,
  Palette,
  Contrast,
  Droplets
} from 'lucide-react';
import clsx from 'clsx';

const MaskPanel = ({ 
  layer, 
  mask, 
  onMaskCreate, 
  onMaskUpdate, 
  onMaskDelete,
  onMaskToggleVisibility,
  className 
}) => {
  const [activeTool, setActiveTool] = useState('rectangle'); // 'rectangle', 'circle', 'freehand'
  const [showPreview, setShowPreview] = useState(true);

  const maskTypes = [
    { id: 'alpha', name: 'Alpha蒙版', icon: <Square size={16} /> },
    { id: 'clip', name: '剪贴蒙版', icon: <Square size={16} /> }
  ];

  const tools = [
    { id: 'rectangle', name: '矩形', icon: <Square size={16} /> },
    { id: 'circle', name: '圆形', icon: <Circle size={16} /> },
    { id: 'freehand', name: '自由绘制', icon: <Pen size={16} /> }
  ];

  const handleCreateMask = (type = 'alpha') => {
    onMaskCreate?.(layer.id, {
      type,
      bounds: { x: 0, y: 0, width: 100, height: 100 }
    });
  };

  const handleParameterChange = (paramName, value) => {
    if (!mask) return;
    onMaskUpdate?.(mask.id, { [paramName]: value });
  };

  const handleInvertMask = () => {
    if (!mask) return;
    onMaskUpdate?.(mask.id, { inverted: !mask.inverted });
  };

  const handleResetMask = () => {
    if (!mask) return;
    onMaskUpdate?.(mask.id, { 
      inverted: false, 
      density: 1, 
      feather: 0 
    });
  };

  return (
    <div className={clsx('panel p-3', className)}>
      <div className="space-y-4">
        {/* 标题和蒙版创建 */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900">蒙版</h3>
          {!mask ? (
            <div className="flex space-x-1">
              {maskTypes.map(type => (
                <button
                  key={type.id}
                  onClick={() => handleCreateMask(type.id)}
                  className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors flex items-center"
                  title={type.name}
                >
                  <span className="mr-1">{type.icon}</span>
                  {type.name}
                </button>
              ))}
            </div>
          ) : (
            <button
              onClick={() => onMaskDelete?.(mask.id)}
              className="px-2 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors"
            >
              删除蒙版
            </button>
          )}
        </div>

        {!mask ? (
          /* 无蒙版状态 */
          <div className="text-center py-8 text-gray-500">
            <Square className="mx-auto h-8 w-8 text-gray-300" />
            <p className="mt-2 text-sm">暂无蒙版</p>
            <p className="text-xs mt-1">选择上方类型创建蒙版</p>
          </div>
        ) : (
          /* 蒙版编辑状态 */
          <div className="space-y-4">
            {/* 蒙版类型和可见性 */}
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-900">
                  {mask.type === 'alpha' ? 'Alpha蒙版' : '剪贴蒙版'}
                </span>
              </div>
              <button
                onClick={() => onMaskToggleVisibility?.(mask.id, !mask.visible)}
                className="p-1 rounded text-gray-400 hover:text-gray-600"
                title={mask.visible ? '隐藏蒙版' : '显示蒙版'}
              >
                {mask.visible !== false ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
            </div>

            {/* 绘制工具 */}
            <div>
              <h4 className="text-xs font-medium text-gray-700 mb-2">绘制工具</h4>
              <div className="grid grid-cols-3 gap-1">
                {tools.map(tool => (
                  <button
                    key={tool.id}
                    onClick={() => setActiveTool(tool.id)}
                    className={clsx(
                      'p-2 rounded border text-xs flex flex-col items-center',
                      activeTool === tool.id 
                        ? 'border-blue-500 bg-blue-50 text-blue-700' 
                        : 'border-gray-200 hover:bg-gray-50'
                    )}
                  >
                    <div className="mb-1">{tool.icon}</div>
                    {tool.name}
                  </button>
                ))}
              </div>
            </div>

            {/* 蒙版参数 */}
            <div className="space-y-3">
              {/* 密度 */}
              <div className="space-y-1">
                <div className="flex justify-between">
                  <label className="text-xs text-gray-600">密度</label>
                  <span className="text-xs text-gray-500">
                    {Math.round((mask.density || 1) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={mask.density || 1}
                  onChange={(e) => handleParameterChange('density', parseFloat(e.target.value))}
                  className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* 羽化 */}
              <div className="space-y-1">
                <div className="flex justify-between">
                  <label className="text-xs text-gray-600">羽化</label>
                  <span className="text-xs text-gray-500">{mask.feather || 0}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={mask.feather || 0}
                  onChange={(e) => handleParameterChange('feather', parseInt(e.target.value))}
                  className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* 反相 */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">反相</span>
                <button
                  onClick={handleInvertMask}
                  className={clsx(
                    'relative inline-flex h-4 w-7 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
                    mask.inverted ? 'bg-blue-600' : 'bg-gray-200'
                  )}
                >
                  <span
                    className={clsx(
                      'pointer-events-none relative inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                      mask.inverted ? 'translate-x-3' : 'translate-x-0'
                    )}
                  />
                </button>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex space-x-2">
              <button
                onClick={handleResetMask}
                className="flex-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors flex items-center justify-center"
              >
                <RotateCcw size={12} className="mr-1" />
                重置
              </button>
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="flex-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
              >
                {showPreview ? '隐藏预览' : '显示预览'}
              </button>
            </div>

            {/* 蒙版预览 */}
            {showPreview && (
              <div className="pt-4 border-t border-gray-200">
                <h4 className="text-xs font-medium text-gray-700 mb-2">蒙版预览</h4>
                <div className="h-24 bg-gradient-to-r from-black to-white rounded-lg relative overflow-hidden">
                  {/* 模拟蒙版效果 */}
                  <div className="absolute inset-0 bg-black opacity-50"></div>
                  <div 
                    className="absolute inset-0 opacity-30"
                    style={{
                      background: `radial-gradient(circle at center, white 0%, black 70%)`
                    }}
                  ></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white text-xs font-medium">蒙版预览</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MaskPanel;