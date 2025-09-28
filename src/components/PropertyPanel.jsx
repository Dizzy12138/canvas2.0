import React from 'react';
import { Palette, Circle, Square } from 'lucide-react';
import clsx from 'clsx';

const colorPresets = [
  '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF',
  '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080',
  '#FFC0CB', '#A52A2A', '#808080', '#000080', '#008000'
];

const PropertyPanel = ({ 
  strokeColor = '#000000',
  fillColor = 'transparent',
  strokeWidth = 3,
  opacity = 1,
  onStrokeColorChange,
  onFillColorChange,
  onStrokeWidthChange,
  onOpacityChange,
  activeTool,
  className 
}) => {
  const showFillOptions = ['rectangle', 'circle', 'text'].includes(activeTool);

  return (
    <div className={clsx('panel p-4 space-y-4', className)}>
      <h3 className="text-sm font-medium text-gray-900">属性</h3>

      {/* 描边颜色 */}
      <div className="space-y-2">
        <label className="text-xs text-gray-500">描边颜色</label>
        <div className="space-y-2">
          {/* 当前颜色显示 */}
          <div className="flex items-center space-x-2">
            <div
              className="w-8 h-8 rounded border-2 border-gray-300 cursor-pointer"
              style={{ backgroundColor: strokeColor }}
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'color';
                input.value = strokeColor;
                input.onchange = (e) => onStrokeColorChange?.(e.target.value);
                input.click();
              }}
            />
            <input
              type="text"
              value={strokeColor}
              onChange={(e) => onStrokeColorChange?.(e.target.value)}
              className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="#000000"
            />
          </div>

          {/* 预设颜色 */}
          <div className="grid grid-cols-5 gap-1">
            {colorPresets.map((color) => (
              <button
                key={color}
                onClick={() => onStrokeColorChange?.(color)}
                className={clsx(
                  'w-6 h-6 rounded border-2 hover:scale-110 transition-transform',
                  {
                    'border-primary-500': strokeColor === color,
                    'border-gray-300': strokeColor !== color,
                  }
                )}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 填充颜色 */}
      {showFillOptions && (
        <div className="space-y-2">
          <label className="text-xs text-gray-500">填充颜色</label>
          <div className="space-y-2">
            {/* 透明选项 */}
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="fillType"
                checked={fillColor === 'transparent'}
                onChange={() => onFillColorChange?.('transparent')}
                className="text-primary-500"
              />
              <span className="text-xs">透明</span>
            </label>

            {/* 颜色选择 */}
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="fillType"
                checked={fillColor !== 'transparent'}
                onChange={() => {
                  if (fillColor === 'transparent') {
                    onFillColorChange?.('#FFFFFF');
                  }
                }}
                className="text-primary-500"
              />
              <span className="text-xs">颜色填充</span>
            </label>

            {fillColor !== 'transparent' && (
              <>
                {/* 当前颜色显示 */}
                <div className="flex items-center space-x-2 ml-6">
                  <div
                    className="w-8 h-8 rounded border-2 border-gray-300 cursor-pointer"
                    style={{ backgroundColor: fillColor }}
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'color';
                      input.value = fillColor;
                      input.onchange = (e) => onFillColorChange?.(e.target.value);
                      input.click();
                    }}
                  />
                  <input
                    type="text"
                    value={fillColor}
                    onChange={(e) => onFillColorChange?.(e.target.value)}
                    className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                    placeholder="#FFFFFF"
                  />
                </div>

                {/* 预设颜色 */}
                <div className="grid grid-cols-5 gap-1 ml-6">
                  {colorPresets.map((color) => (
                    <button
                      key={color}
                      onClick={() => onFillColorChange?.(color)}
                      className={clsx(
                        'w-6 h-6 rounded border-2 hover:scale-110 transition-transform',
                        {
                          'border-primary-500': fillColor === color,
                          'border-gray-300': fillColor !== color,
                        }
                      )}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 线条粗细 */}
      <div className="space-y-2">
        <label className="text-xs text-gray-500">线条粗细</label>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <input
              type="range"
              min="1"
              max="50"
              value={strokeWidth}
              onChange={(e) => onStrokeWidthChange?.(Number(e.target.value))}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-xs text-gray-600 w-8">{strokeWidth}px</span>
          </div>

          {/* 线条粗细预设 */}
          <div className="flex items-center space-x-2">
            {[1, 3, 5, 10, 20].map((width) => (
              <button
                key={width}
                onClick={() => onStrokeWidthChange?.(width)}
                className={clsx(
                  'flex items-center justify-center w-8 h-8 rounded border-2 hover:bg-gray-50 transition-colors',
                  {
                    'border-primary-500': strokeWidth === width,
                    'border-gray-300': strokeWidth !== width,
                  }
                )}
                title={`${width}px`}
              >
                <div
                  className="bg-gray-800 rounded-full"
                  style={{ 
                    width: Math.min(width, 16), 
                    height: Math.min(width, 16) 
                  }}
                />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 不透明度 */}
      <div className="space-y-2">
        <label className="text-xs text-gray-500">不透明度</label>
        <div className="flex items-center space-x-2">
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={opacity}
            onChange={(e) => onOpacityChange?.(Number(e.target.value))}
            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-xs text-gray-600 w-8">
            {Math.round(opacity * 100)}%
          </span>
        </div>
      </div>

      {/* 蒙版工具特定选项 */}
      {(activeTool === 'mask' || activeTool === 'clip') && (
        <div className="space-y-2">
          <label className="text-xs text-gray-500">蒙版设置</label>
          <div className="space-y-2">
            <div className="p-2 bg-blue-50 rounded text-xs text-blue-700">
              <div className="font-medium mb-1">
                {activeTool === 'mask' ? '矩形蒙版' : '圆形蒙版'}
              </div>
              <div className="text-blue-600">
                在画布上拖拽绘制蒙版区域，松开鼠标应用到当前图层
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="text-xs text-gray-600">蒙版预览颜色</div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-black bg-opacity-30 border rounded"></div>
                <span className="text-xs text-gray-500">半透明黑色</span>
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="text-xs text-gray-600">操作提示</div>
              <ul className="text-xs text-gray-500 space-y-0.5">
                <li>• 拖拽创建蒙版区域</li>
                <li>• 蒙版外的内容将被隐藏</li>
                <li>• 每个图层可单独设置蒙版</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* 工具特定选项 */}
      {activeTool === 'text' && (
        <div className="space-y-2">
          <label className="text-xs text-gray-500">字体设置</label>
          <div className="space-y-2">
            <select className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500">
              <option value="Arial">Arial</option>
              <option value="Helvetica">Helvetica</option>
              <option value="Georgia">Georgia</option>
              <option value="SimSun">宋体</option>
              <option value="SimHei">黑体</option>
            </select>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min="8"
                max="72"
                defaultValue="16"
                className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <span className="text-xs text-gray-500">px</span>
            </div>
          </div>
        </div>
      )}

      {/* 当前工具提示 */}
      <div className="pt-2 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          当前工具: <span className="font-medium">{getToolName(activeTool)}</span>
        </div>
      </div>
    </div>
  );
};

function getToolName(toolId) {
  const toolNames = {
    select: '选择',
    hand: '手形工具',
    brush: '画笔',
    pencil: '铅笔',
    eraser: '橡皮擦',
    rectangle: '矩形',
    circle: '圆形',
    text: '文本',
    mask: '矩形蒙版',
    clip: '圆形蒙版',
  };
  return toolNames[toolId] || toolId;
}

export default PropertyPanel;