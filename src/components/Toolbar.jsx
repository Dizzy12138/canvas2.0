import React from 'react';
import { 
  Brush, 
  Eraser, 
  Square, 
  Circle, 
  Type, 
  MousePointer2, 
  Hand, 
  RotateCcw, 
  RotateCw,
  Download,
  Upload,
  Save,
  FolderOpen,
  Scissors,
  Layers,
  Grid3X3,
  Ruler,
  AlignLeft,
  FlipHorizontal,
  Target,
  Crosshair
} from 'lucide-react';
import clsx from 'clsx';

const tools = [
  { id: 'select', name: '选择', icon: MousePointer2, group: 'selection' },
  { id: 'hand', name: '手形工具(移动画布)', icon: Hand, group: 'selection' },
  { id: 'brush', name: '画笔', icon: Brush, group: 'drawing' },
  { id: 'pencil', name: '铅笔', icon: Brush, group: 'drawing' },
  { id: 'eraser', name: '橡皮擦', icon: Eraser, group: 'drawing' },
  { id: 'rectangle', name: '矩形', icon: Square, group: 'shapes' },
  { id: 'circle', name: '圆形', icon: Circle, group: 'shapes' },
  { id: 'text', name: '文本', icon: Type, group: 'text' },
  { id: 'mask', name: '蒙版工具', icon: Scissors, group: 'mask' },
  { id: 'clip', name: '剪切蒙版', icon: Layers, group: 'mask' },
  { id: 'grid', name: '网格', icon: Grid3X3, group: 'assist' },
  { id: 'ruler', name: '标尺', icon: Ruler, group: 'assist' },
  { id: 'align', name: '对齐工具', icon: AlignLeft, group: 'assist' },
  { id: 'symmetry', name: '对称工具', icon: FlipHorizontal, group: 'assist' },
  { id: 'guideline', name: '辅助线', icon: Target, group: 'assist' },
  { id: 'snap', name: '捕捉对齐', icon: Crosshair, group: 'assist' },
];

const actions = [
  { id: 'undo', name: '撤销', icon: RotateCcw, group: 'history' },
  { id: 'redo', name: '重做', icon: RotateCw, group: 'history' },
  { id: 'save', name: '保存', icon: Save, group: 'file' },
  { id: 'open', name: '打开', icon: FolderOpen, group: 'file' },
  { id: 'import', name: '导入', icon: Upload, group: 'file' },
  { id: 'export', name: '导出', icon: Download, group: 'file' },
];

const Toolbar = ({ 
  activeTool, 
  onToolChange, 
  onAction,
  className 
}) => {
  const handleToolClick = (toolId) => {
    onToolChange?.(toolId);
  };

  const handleActionClick = (actionId) => {
    onAction?.(actionId);
  };

  return (
    <div className={clsx('panel p-2', className)}>
      {/* 工具组 */}
      <div className="space-y-4">
        {/* 选择工具 */}
        <div className="space-y-1">
          <div className="text-xs text-gray-500 px-1">选择</div>
          <div className="flex flex-col gap-1">
            {tools.filter(tool => tool.group === 'selection').map((tool) => (
              <button
                key={tool.id}
                onClick={() => handleToolClick(tool.id)}
                className={clsx(
                  'p-2 rounded-lg transition-colors duration-200',
                  'hover:bg-gray-100 active:scale-95',
                  {
                    'bg-primary-500 text-white': activeTool === tool.id,
                    'text-gray-700': activeTool !== tool.id,
                  }
                )}
                title={tool.name}
              >
                <tool.icon size={18} />
              </button>
            ))}
          </div>
        </div>

        {/* 绘图工具 */}
        <div className="space-y-1">
          <div className="text-xs text-gray-500 px-1">绘图</div>
          <div className="flex flex-col gap-1">
            {tools.filter(tool => tool.group === 'drawing').map((tool) => (
              <button
                key={tool.id}
                onClick={() => handleToolClick(tool.id)}
                className={clsx(
                  'p-2 rounded-lg transition-colors duration-200',
                  'hover:bg-gray-100 active:scale-95',
                  {
                    'bg-primary-500 text-white': activeTool === tool.id,
                    'text-gray-700': activeTool !== tool.id,
                  }
                )}
                title={tool.name}
              >
                <tool.icon size={18} />
              </button>
            ))}
          </div>
        </div>

        {/* 形状工具 */}
        <div className="space-y-1">
          <div className="text-xs text-gray-500 px-1">形状</div>
          <div className="flex flex-col gap-1">
            {tools.filter(tool => tool.group === 'shapes').map((tool) => (
              <button
                key={tool.id}
                onClick={() => handleToolClick(tool.id)}
                className={clsx(
                  'p-2 rounded-lg transition-colors duration-200',
                  'hover:bg-gray-100 active:scale-95',
                  {
                    'bg-primary-500 text-white': activeTool === tool.id,
                    'text-gray-700': activeTool !== tool.id,
                  }
                )}
                title={tool.name}
              >
                <tool.icon size={18} />
              </button>
            ))}
          </div>
        </div>

        {/* 文本工具 */}
        <div className="space-y-1">
          <div className="text-xs text-gray-500 px-1">文本</div>
          <div className="flex flex-col gap-1">
            {tools.filter(tool => tool.group === 'text').map((tool) => (
              <button
                key={tool.id}
                onClick={() => handleToolClick(tool.id)}
                className={clsx(
                  'p-2 rounded-lg transition-colors duration-200',
                  'hover:bg-gray-100 active:scale-95',
                  {
                    'bg-primary-500 text-white': activeTool === tool.id,
                    'text-gray-700': activeTool !== tool.id,
                  }
                )}
                title={tool.name}
              >
                <tool.icon size={18} />
              </button>
            ))}
          </div>
        </div>

        {/* 蒙版工具 */}
        <div className="space-y-1">
          <div className="text-xs text-gray-500 px-1">蒙版</div>
          <div className="flex flex-col gap-1">
            {tools.filter(tool => tool.group === 'mask').map((tool) => (
              <button
                key={tool.id}
                onClick={() => handleToolClick(tool.id)}
                className={clsx(
                  'p-2 rounded-lg transition-colors duration-200',
                  'hover:bg-gray-100 active:scale-95',
                  {
                    'bg-primary-500 text-white': activeTool === tool.id,
                    'text-gray-700': activeTool !== tool.id,
                  }
                )}
                title={tool.name}
              >
                <tool.icon size={18} />
              </button>
            ))}
          </div>
        </div>

        {/* 辅助工具 */}
        <div className="space-y-1">
          <div className="text-xs text-gray-500 px-1">辅助</div>
          <div className="flex flex-col gap-1">
            {tools.filter(tool => tool.group === 'assist').map((tool) => (
              <button
                key={tool.id}
                onClick={() => handleToolClick(tool.id)}
                className={clsx(
                  'p-2 rounded-lg transition-colors duration-200',
                  'hover:bg-gray-100 active:scale-95',
                  {
                    'bg-primary-500 text-white': activeTool === tool.id,
                    'text-gray-700': activeTool !== tool.id,
                  }
                )}
                title={tool.name}
              >
                <tool.icon size={18} />
              </button>
            ))}
          </div>
        </div>

        {/* 分隔线 */}
        <div className="border-t border-gray-200"></div>

        {/* 操作按钮 */}
        <div className="space-y-1">
          <div className="text-xs text-gray-500 px-1">操作</div>
          <div className="flex flex-col gap-1">
            {actions.map((action) => (
              <button
                key={action.id}
                onClick={() => handleActionClick(action.id)}
                className="p-2 rounded-lg text-gray-700 hover:bg-gray-100 active:scale-95 transition-all duration-200"
                title={action.name}
              >
                <action.icon size={18} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Toolbar;