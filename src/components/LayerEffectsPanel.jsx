import React, { useState } from 'react';
import { 
  Sliders, 
  Plus, 
  Trash2, 
  Eye, 
  EyeOff,
  Sun,
  Contrast,
  Droplets,
  Palette,
  Zap,
  Circle,
  Square
} from 'lucide-react';
import clsx from 'clsx';

const LayerEffectsPanel = ({ 
  layer, 
  onEffectAdd, 
  onEffectUpdate, 
  onEffectDelete,
  className 
}) => {
  const [expandedEffectId, setExpandedEffectId] = useState(null);

  const effectTypes = [
    { 
      type: 'blur', 
      name: '模糊', 
      icon: <Circle size={16} />,
      parameters: { radius: { name: '半径', min: 0, max: 100, step: 1, default: 5 } }
    },
    { 
      type: 'brightness', 
      name: '亮度', 
      icon: <Sun size={16} />,
      parameters: { value: { name: '亮度', min: -100, max: 100, step: 1, default: 0 } }
    },
    { 
      type: 'contrast', 
      name: '对比度', 
      icon: <Contrast size={16} />,
      parameters: { value: { name: '对比度', min: -100, max: 100, step: 1, default: 0 } }
    },
    { 
      type: 'hue', 
      name: '色相', 
      icon: <Palette size={16} />,
      parameters: { value: { name: '色相', min: -180, max: 180, step: 1, default: 0 } }
    },
    { 
      type: 'saturation', 
      name: '饱和度', 
      icon: <Droplets size={16} />,
      parameters: { value: { name: '饱和度', min: -100, max: 100, step: 1, default: 0 } }
    },
    { 
      type: 'shadow', 
      name: '阴影', 
      icon: <Square size={16} />,
      parameters: { 
        x: { name: 'X偏移', min: -100, max: 100, step: 1, default: 5 },
        y: { name: 'Y偏移', min: -100, max: 100, step: 1, default: 5 },
        blur: { name: '模糊', min: 0, max: 100, step: 1, default: 5 },
        color: { name: '颜色', type: 'color', default: '#000000' },
        opacity: { name: '不透明度', min: 0, max: 1, step: 0.1, default: 0.5 }
      }
    },
    { 
      type: 'glow', 
      name: '发光', 
      icon: <Zap size={16} />,
      parameters: { 
        radius: { name: '半径', min: 0, max: 100, step: 1, default: 10 },
        color: { name: '颜色', type: 'color', default: '#ffffff' },
        opacity: { name: '不透明度', min: 0, max: 1, step: 0.1, default: 0.8 }
      }
    }
  ];

  const toggleEffectExpansion = (effectId) => {
    setExpandedEffectId(expandedEffectId === effectId ? null : effectId);
  };

  const handleAddEffect = (effectType) => {
    const typeConfig = effectTypes.find(t => t.type === effectType);
    if (!typeConfig) return;

    const parameters = {};
    Object.keys(typeConfig.parameters).forEach(paramKey => {
      parameters[paramKey] = typeConfig.parameters[paramKey].default;
    });

    onEffectAdd?.({
      type: effectType,
      parameters
    });
  };

  const handleParameterChange = (effectId, paramName, value) => {
    onEffectUpdate?.(effectId, { 
      parameters: { [paramName]: value } 
    });
  };

  const renderEffectParameter = (effect, paramName, paramConfig) => {
    const value = effect.parameters[paramName];
    
    if (paramConfig.type === 'color') {
      return (
        <div className="flex items-center space-x-2">
          <label className="text-xs text-gray-600 w-16">{paramConfig.name}</label>
          <input
            type="color"
            value={value}
            onChange={(e) => handleParameterChange(effect.id, paramName, e.target.value)}
            className="w-8 h-8 p-1 border border-gray-300 rounded cursor-pointer"
          />
        </div>
      );
    }
    
    return (
      <div className="space-y-1">
        <div className="flex justify-between">
          <label className="text-xs text-gray-600">{paramConfig.name}</label>
          <span className="text-xs text-gray-500">{value}</span>
        </div>
        <input
          type="range"
          min={paramConfig.min}
          max={paramConfig.max}
          step={paramConfig.step}
          value={value}
          onChange={(e) => handleParameterChange(effect.id, paramName, parseFloat(e.target.value))}
          className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
      </div>
    );
  };

  const renderEffect = (effect) => {
    const effectType = effectTypes.find(t => t.type === effect.type);
    const isExpanded = expandedEffectId === effect.id;
    
    return (
      <div key={effect.id} className="border border-gray-200 rounded-lg overflow-hidden">
        <div 
          className="flex items-center justify-between p-2 bg-gray-50 cursor-pointer hover:bg-gray-100"
          onClick={() => toggleEffectExpansion(effect.id)}
        >
          <div className="flex items-center space-x-2">
            <div className="text-gray-500">
              {effectType?.icon || <Sliders size={16} />}
            </div>
            <span className="text-sm font-medium text-gray-900">
              {effectType?.name || effect.type}
            </span>
          </div>
          
          <div className="flex items-center space-x-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEffectUpdate?.(effect.id, { enabled: !effect.enabled });
              }}
              className="p-1 rounded text-gray-400 hover:text-gray-600"
              title={effect.enabled ? '禁用效果' : '启用效果'}
            >
              {effect.enabled ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEffectDelete?.(effect.id);
              }}
              className="p-1 rounded text-gray-400 hover:text-red-600"
              title="删除效果"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
        
        {isExpanded && (
          <div className="p-3 bg-white space-y-3">
            {effectType && Object.keys(effectType.parameters).map(paramName => (
              <div key={paramName}>
                {renderEffectParameter(effect, paramName, effectType.parameters[paramName])}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={clsx('panel p-3', className)}>
      <div className="space-y-4">
        {/* 标题和添加按钮 */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900">图层效果</h3>
          <div className="relative group">
            <button className="p-1 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors">
              <Plus size={16} />
            </button>
            
            {/* 效果类型选择下拉菜单 */}
            <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10 hidden group-hover:block">
              <div className="py-1">
                {effectTypes.map(effectType => (
                  <button
                    key={effectType.type}
                    onClick={() => handleAddEffect(effectType.type)}
                    className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <div className="mr-2 text-gray-500">
                      {effectType.icon}
                    </div>
                    {effectType.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 效果列表 */}
        <div className="space-y-2">
          {layer?.effects && layer.effects.length > 0 ? (
            layer.effects.map(effect => renderEffect(effect))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Sliders className="mx-auto h-8 w-8 text-gray-300" />
              <p className="mt-2 text-sm">暂无效果</p>
              <p className="text-xs mt-1">点击上方 + 添加效果</p>
            </div>
          )}
        </div>

        {/* 效果预览 */}
        {layer?.effects && layer.effects.some(e => e.enabled) && (
          <div className="pt-4 border-t border-gray-200">
            <h4 className="text-xs font-medium text-gray-700 mb-2">效果预览</h4>
            <div className="h-16 bg-gradient-to-r from-blue-400 to-purple-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-medium">效果预览区域</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LayerEffectsPanel;