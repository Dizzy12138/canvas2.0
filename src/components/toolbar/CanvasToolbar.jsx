import React from 'react';
import { 
  MousePointer2, 
  Hand, 
  Square, 
  Circle, 
  Pen, 
  Eraser,
  Undo,
  Redo,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ZoomIn,
  ZoomOut,
  Maximize
} from 'lucide-react';
import clsx from 'clsx';
import { TOOL_TYPES } from '../../utils/constants.js';

/**
 * 画布工具栏组件
 * @param {Object} props
 * @param {string} props.activeTool - 当前激活的工具
 * @param {Function} props.setActiveTool - 设置激活工具
 * @param {number} props.zoomLevel - 缩放级别
 * @param {Function} props.onZoomIn - 放大回调
 * @param {Function} props.onZoomOut - 缩小回调
 * @param {Function} props.onUndo - 撤销回调
 * @param {Function} props.onRedo - 重做回调
 * @param {boolean} props.canUndo - 是否可以撤销
 * @param {boolean} props.canRedo - 是否可以重做
 */
const CanvasToolbar = ({ 
  activeTool, 
  setActiveTool,
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onUndo,
  onRedo,
  canUndo,
  canRedo
}) => {
  // 只保留基本的画布工具
  const tools = [
    { id: TOOL_TYPES.SELECT, icon: <MousePointer2 className="w-4 h-4" />, label: '选择' },
    { id: TOOL_TYPES.HAND, icon: <Hand className="w-4 h-4" />, label: '抓手' },
    { id: TOOL_TYPES.RECTANGLE, icon: <Square className="w-4 h-4" />, label: '矩形' },
    { id: TOOL_TYPES.ELLIPSE, icon: <Circle className="w-4 h-4" />, label: '圆形' },
    { id: TOOL_TYPES.DRAW, icon: <Pen className="w-4 h-4" />, label: '画笔' },
    { id: TOOL_TYPES.ERASER, icon: <Eraser className="w-4 h-4" />, label: '橡皮擦' }
  ];
  
  return (
    <div className="flex items-center gap-2 p-2 border-b bg-white">
      {/* 工具选择 */}
      <div className="flex gap-1">
        {tools.map(tool => (
          <button
            key={tool.id}
            onClick={() => setActiveTool(tool.id)}
            className={clsx(
              'p-2 rounded-md transition-colors',
              activeTool === tool.id
                ? 'bg-blue-100 text-blue-600'
                : 'text-gray-600 hover:bg-gray-100'
            )}
            title={tool.label}
          >
            {tool.icon}
          </button>
        ))}
      </div>
      
      <div className="w-px h-6 bg-gray-200 mx-2"></div>
      
      {/* 编辑操作 */}
      <button
        onClick={onUndo}
        disabled={!canUndo}
        className={clsx(
          'p-2 rounded-md transition-colors',
          canUndo ? 'text-gray-600 hover:bg-gray-100' : 'text-gray-300 cursor-not-allowed'
        )}
        title="撤销"
      >
        <Undo className="w-4 h-4" />
      </button>
      <button
        onClick={onRedo}
        disabled={!canRedo}
        className={clsx(
          'p-2 rounded-md transition-colors',
          canRedo ? 'text-gray-600 hover:bg-gray-100' : 'text-gray-300 cursor-not-allowed'
        )}
        title="重做"
      >
        <Redo className="w-4 h-4" />
      </button>
      
      <div className="w-px h-6 bg-gray-200 mx-2"></div>
      
      {/* 对齐工具 */}
      <div className="flex gap-1">
        <button className="p-2 rounded-md text-gray-600 hover:bg-gray-100" title="左对齐">
          <AlignLeft className="w-4 h-4" />
        </button>
        <button className="p-2 rounded-md text-gray-600 hover:bg-gray-100" title="居中对齐">
          <AlignCenter className="w-4 h-4" />
        </button>
        <button className="p-2 rounded-md text-gray-600 hover:bg-gray-100" title="右对齐">
          <AlignRight className="w-4 h-4" />
        </button>
      </div>
      
      <div className="flex-1"></div>
      
      {/* 缩放控制 */}
      <div className="flex items-center gap-2">
        <button
          onClick={onZoomOut}
          className="p-1 rounded-md text-gray-600 hover:bg-gray-100"
          title="缩小"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="text-sm text-gray-600 min-w-12 text-center">{Math.round(zoomLevel * 100)}%</span>
        <button
          onClick={onZoomIn}
          className="p-1 rounded-md text-gray-600 hover:bg-gray-100"
          title="放大"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button className="p-1 rounded-md text-gray-600 hover:bg-gray-100" title="适应屏幕">
          <Maximize className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default CanvasToolbar;

