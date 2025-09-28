import React, { useState, useEffect, useCallback } from 'react';
import { 
  Grid3X3, 
  AlignLeft, 
  AlignCenter, 
  AlignRight,
  AlignJustify,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  Move,
  MoveVertical,
  FlipHorizontal,
  FlipVertical,
  RotateCcw,
  Settings,
  Eye,
  EyeOff
} from 'lucide-react';
import clsx from 'clsx';
import CanvasDebugger from '../utils/CanvasDebugger';

const AlignAssistSystem = ({ 
  canvas,
  showGrid = false,
  showRuler = false,
  showGuidelines = false,
  snapToGrid = false,
  snapToObjects = false,
  onToggleGrid,
  onToggleRuler,
  onToggleGuidelines,
  onToggleSnapToGrid,
  onToggleSnapToObjects,
  onAlign,
  onDistribute,
  onSymmetry,
  className 
}) => {
  const [selectedObjects, setSelectedObjects] = useState([]);
  const [gridSize, setGridSize] = useState(20);
  const [snapTolerance, setSnapTolerance] = useState(10);

  // 监听画布选择事件 - 增强版canvas就绪检测
  useEffect(() => {
    // 调试canvas状态
    const debugResult = CanvasDebugger.debugCanvas(canvas, 'AlignAssistSystem useEffect');
    
    // 使用更准确的Fabric.js Canvas检测
    if (!debugResult.isValid || !debugResult.isFabricCanvas) {
      console.log('AlignAssistSystem: Canvas is not valid or not a Fabric Canvas, skipping event listeners setup');
      console.log('详细信息:', debugResult);
      return;
    }

    console.log('AlignAssistSystem: Canvas validation passed, setting up event listeners');

    const handleSelection = () => {
      try {
        if (CanvasDebugger.debugCanvas(canvas, 'handleSelection').isValid && CanvasDebugger.debugCanvas(canvas, 'handleSelection').isFabricCanvas) {
          const activeObjects = canvas.getActiveObjects();
          setSelectedObjects(activeObjects || []);
        }
      } catch (error) {
        console.error('Error in handleSelection:', error);
        setSelectedObjects([]);
      }
    };

    const handleSelectionCleared = () => {
      setSelectedObjects([]);
    };

    try {
      // 先清理旧的监听器以防重复绑定
      canvas.off('selection:created');
      canvas.off('selection:updated');
      canvas.off('selection:cleared');

      // 设置新的监听器
      canvas.on('selection:created', handleSelection);
      canvas.on('selection:updated', handleSelection);
      canvas.on('selection:cleared', handleSelectionCleared);

      console.log('AlignAssistSystem: Event listeners attached successfully');
      
      // 初始化时获取当前选中的对象
      handleSelection();
      
    } catch (error) {
      console.error('Error setting up canvas event listeners:', error);
    }

    return () => {
      const debugResult = CanvasDebugger.debugCanvas(canvas, 'AlignAssistSystem cleanup');
      if (debugResult.isValid && debugResult.isFabricCanvas) {
        try {
          canvas.off('selection:created', handleSelection);
          canvas.off('selection:updated', handleSelection);
          canvas.off('selection:cleared', handleSelectionCleared);
          console.log('AlignAssistSystem: Event listeners cleaned up');
        } catch (error) {
          console.error('Error cleaning up canvas event listeners:', error);
        }
      }
    };
  }, [canvas]);

  // 对齐操作
  const handleAlign = useCallback((alignType) => {
    if (selectedObjects.length < 2) return;
    if (!canvas || !canvas.renderAll) {
      console.error('Canvas not available for align operation');
      return;
    }

    const bounds = selectedObjects.map(obj => ({
      obj,
      left: obj.left,
      top: obj.top,
      width: obj.width * obj.scaleX,
      height: obj.height * obj.scaleY,
      centerX: obj.left + (obj.width * obj.scaleX) / 2,
      centerY: obj.top + (obj.height * obj.scaleY) / 2,
      right: obj.left + obj.width * obj.scaleX,
      bottom: obj.top + obj.height * obj.scaleY
    }));

    switch (alignType) {
      case 'left':
        const leftmost = Math.min(...bounds.map(b => b.left));
        bounds.forEach(({ obj }) => {
          obj.set({ left: leftmost });
        });
        break;
      case 'center':
        const centerX = bounds.reduce((sum, b) => sum + b.centerX, 0) / bounds.length;
        bounds.forEach(({ obj, width }) => {
          obj.set({ left: centerX - width / 2 });
        });
        break;
      case 'right':
        const rightmost = Math.max(...bounds.map(b => b.right));
        bounds.forEach(({ obj, width }) => {
          obj.set({ left: rightmost - width });
        });
        break;
      case 'top':
        const topmost = Math.min(...bounds.map(b => b.top));
        bounds.forEach(({ obj }) => {
          obj.set({ top: topmost });
        });
        break;
      case 'middle':
        const centerY = bounds.reduce((sum, b) => sum + b.centerY, 0) / bounds.length;
        bounds.forEach(({ obj, height }) => {
          obj.set({ top: centerY - height / 2 });
        });
        break;
      case 'bottom':
        const bottommost = Math.max(...bounds.map(b => b.bottom));
        bounds.forEach(({ obj, height }) => {
          obj.set({ top: bottommost - height });
        });
        break;
    }

    selectedObjects.forEach(obj => obj.setCoords());
    canvas.renderAll();
    onAlign?.(alignType, selectedObjects);
  }, [selectedObjects, canvas, onAlign]);

  // 分布操作
  const handleDistribute = useCallback((distributeType) => {
    if (selectedObjects.length < 3) return;
    if (!canvas || !canvas.renderAll) {
      console.error('Canvas not available for distribute operation');
      return;
    }

    const bounds = selectedObjects.map(obj => ({
      obj,
      left: obj.left,
      top: obj.top,
      width: obj.width * obj.scaleX,
      height: obj.height * obj.scaleY,
      centerX: obj.left + (obj.width * obj.scaleX) / 2,
      centerY: obj.top + (obj.height * obj.scaleY) / 2
    }));

    if (distributeType === 'horizontal') {
      bounds.sort((a, b) => a.centerX - b.centerX);
      const totalWidth = bounds[bounds.length - 1].centerX - bounds[0].centerX;
      const spacing = totalWidth / (bounds.length - 1);
      
      bounds.forEach((bound, index) => {
        if (index > 0 && index < bounds.length - 1) {
          const newCenterX = bounds[0].centerX + spacing * index;
          bound.obj.set({ left: newCenterX - bound.width / 2 });
        }
      });
    } else if (distributeType === 'vertical') {
      bounds.sort((a, b) => a.centerY - b.centerY);
      const totalHeight = bounds[bounds.length - 1].centerY - bounds[0].centerY;
      const spacing = totalHeight / (bounds.length - 1);
      
      bounds.forEach((bound, index) => {
        if (index > 0 && index < bounds.length - 1) {
          const newCenterY = bounds[0].centerY + spacing * index;
          bound.obj.set({ top: newCenterY - bound.height / 2 });
        }
      });
    }

    selectedObjects.forEach(obj => obj.setCoords());
    canvas.renderAll();
    onDistribute?.(distributeType, selectedObjects);
  }, [selectedObjects, canvas, onDistribute]);

  // 对称操作
  const handleSymmetry = useCallback((symmetryType) => {
    if (selectedObjects.length === 0) return;
    if (!canvas || !canvas.renderAll || !canvas.add) {
      console.error('Canvas not available for symmetry operation');
      return;
    }

    const canvasCenter = {
      x: canvas.width / 2,
      y: canvas.height / 2
    };

    selectedObjects.forEach(obj => {
      switch (symmetryType) {
        case 'horizontal':
          const distanceFromCenterY = obj.top + (obj.height * obj.scaleY) / 2 - canvasCenter.y;
          obj.set({ 
            top: canvasCenter.y - distanceFromCenterY - (obj.height * obj.scaleY) / 2,
            flipY: !obj.flipY 
          });
          break;
        case 'vertical':
          const distanceFromCenterX = obj.left + (obj.width * obj.scaleX) / 2 - canvasCenter.x;
          obj.set({ 
            left: canvasCenter.x - distanceFromCenterX - (obj.width * obj.scaleX) / 2,
            flipX: !obj.flipX 
          });
          break;
        case 'radial':
          // 径向对称 - 围绕中心点旋转复制
          const centerX = obj.left + (obj.width * obj.scaleX) / 2;
          const centerY = obj.top + (obj.height * obj.scaleY) / 2;
          const angle = Math.atan2(centerY - canvasCenter.y, centerX - canvasCenter.x);
          const distance = Math.sqrt(
            Math.pow(centerX - canvasCenter.x, 2) + Math.pow(centerY - canvasCenter.y, 2)
          );
          
          // 创建径向对称副本
          for (let i = 1; i < 4; i++) {
            const newAngle = angle + (Math.PI * 2 * i) / 4;
            const newX = canvasCenter.x + Math.cos(newAngle) * distance - (obj.width * obj.scaleX) / 2;
            const newY = canvasCenter.y + Math.sin(newAngle) * distance - (obj.height * obj.scaleY) / 2;
            
            obj.clone(clonedObj => {
              clonedObj.set({
                left: newX,
                top: newY,
                angle: obj.angle + (360 * i) / 4
              });
              canvas.add(clonedObj);
            });
          }
          break;
      }
      obj.setCoords();
    });

    canvas.renderAll();
    onSymmetry?.(symmetryType, selectedObjects);
  }, [selectedObjects, canvas, onSymmetry]);

  return (
    <div className={clsx('panel p-3', className)}>
      <div className="space-y-4">
        {/* 标题 */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900">对齐辅助</h3>
          <Settings size={14} className="text-gray-500" />
        </div>

        {/* 辅助显示开关 */}
        <div className="space-y-2">
          <div className="text-xs text-gray-500">辅助显示</div>
          <div className="space-y-1">
            <label className="flex items-center justify-between">
              <span className="text-xs">网格</span>
              <button
                onClick={onToggleGrid}
                className={clsx(
                  'p-1 rounded transition-colors',
                  showGrid ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-600'
                )}
              >
                {showGrid ? <Eye size={12} /> : <EyeOff size={12} />}
              </button>
            </label>
            <label className="flex items-center justify-between">
              <span className="text-xs">标尺</span>
              <button
                onClick={onToggleRuler}
                className={clsx(
                  'p-1 rounded transition-colors',
                  showRuler ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-600'
                )}
              >
                {showRuler ? <Eye size={12} /> : <EyeOff size={12} />}
              </button>
            </label>
            <label className="flex items-center justify-between">
              <span className="text-xs">辅助线</span>
              <button
                onClick={onToggleGuidelines}
                className={clsx(
                  'p-1 rounded transition-colors',
                  showGuidelines ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-600'
                )}
              >
                {showGuidelines ? <Eye size={12} /> : <EyeOff size={12} />}
              </button>
            </label>
          </div>
        </div>

        {/* 捕捉设置 */}
        <div className="space-y-2">
          <div className="text-xs text-gray-500">捕捉设置</div>
          <div className="space-y-1">
            <label className="flex items-center justify-between">
              <span className="text-xs">吸附网格</span>
              <button
                onClick={onToggleSnapToGrid}
                className={clsx(
                  'p-1 rounded transition-colors',
                  snapToGrid ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-600'
                )}
              >
                {snapToGrid ? <Eye size={12} /> : <EyeOff size={12} />}
              </button>
            </label>
            <label className="flex items-center justify-between">
              <span className="text-xs">吸附对象</span>
              <button
                onClick={onToggleSnapToObjects}
                className={clsx(
                  'p-1 rounded transition-colors',
                  snapToObjects ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-600'
                )}
              >
                {snapToObjects ? <Eye size={12} /> : <EyeOff size={12} />}
              </button>
            </label>
          </div>
        </div>

        {/* 网格设置 */}
        <div className="space-y-2">
          <div className="text-xs text-gray-500">网格设置</div>
          <div className="flex items-center space-x-2">
            <span className="text-xs">大小:</span>
            <input
              type="range"
              min="5"
              max="50"
              value={gridSize}
              onChange={(e) => setGridSize(Number(e.target.value))}
              className="flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-xs w-8">{gridSize}px</span>
          </div>
        </div>

        {/* 捕捉容差 */}
        <div className="space-y-2">
          <div className="text-xs text-gray-500">捕捉容差</div>
          <div className="flex items-center space-x-2">
            <input
              type="range"
              min="1"
              max="20"
              value={snapTolerance}
              onChange={(e) => setSnapTolerance(Number(e.target.value))}
              className="flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-xs w-8">{snapTolerance}px</span>
          </div>
        </div>

        {/* 对齐操作 */}
        <div className="space-y-2">
          <div className="text-xs text-gray-500">对齐 ({selectedObjects.length} 个对象)</div>
          <div className="grid grid-cols-3 gap-1">
            <button
              onClick={() => handleAlign('left')}
              disabled={selectedObjects.length < 2}
              className="p-2 rounded border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              title="左对齐"
            >
              <AlignLeft size={14} />
            </button>
            <button
              onClick={() => handleAlign('center')}
              disabled={selectedObjects.length < 2}
              className="p-2 rounded border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              title="水平居中"
            >
              <AlignCenter size={14} />
            </button>
            <button
              onClick={() => handleAlign('right')}
              disabled={selectedObjects.length < 2}
              className="p-2 rounded border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              title="右对齐"
            >
              <AlignRight size={14} />
            </button>
            <button
              onClick={() => handleAlign('top')}
              disabled={selectedObjects.length < 2}
              className="p-2 rounded border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              title="顶部对齐"
            >
              <AlignVerticalJustifyStart size={14} />
            </button>
            <button
              onClick={() => handleAlign('middle')}
              disabled={selectedObjects.length < 2}
              className="p-2 rounded border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              title="垂直居中"
            >
              <AlignVerticalJustifyCenter size={14} />
            </button>
            <button
              onClick={() => handleAlign('bottom')}
              disabled={selectedObjects.length < 2}
              className="p-2 rounded border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              title="底部对齐"
            >
              <AlignVerticalJustifyEnd size={14} />
            </button>
          </div>
        </div>

        {/* 分布操作 */}
        <div className="space-y-2">
          <div className="text-xs text-gray-500">分布</div>
          <div className="flex space-x-1">
            <button
              onClick={() => handleDistribute('horizontal')}
              disabled={selectedObjects.length < 3}
              className="flex-1 p-2 rounded border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              title="水平分布"
            >
              <Move size={14} className="mx-auto" />
            </button>
            <button
              onClick={() => handleDistribute('vertical')}
              disabled={selectedObjects.length < 3}
              className="flex-1 p-2 rounded border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              title="垂直分布"
            >
              <MoveVertical size={14} className="mx-auto" />
            </button>
          </div>
        </div>

        {/* 对称操作 */}
        <div className="space-y-2">
          <div className="text-xs text-gray-500">对称</div>
          <div className="grid grid-cols-3 gap-1">
            <button
              onClick={() => handleSymmetry('horizontal')}
              disabled={selectedObjects.length === 0}
              className="p-2 rounded border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              title="水平镜像"
            >
              <FlipHorizontal size={14} />
            </button>
            <button
              onClick={() => handleSymmetry('vertical')}
              disabled={selectedObjects.length === 0}
              className="p-2 rounded border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              title="垂直镜像"
            >
              <FlipVertical size={14} />
            </button>
            <button
              onClick={() => handleSymmetry('radial')}
              disabled={selectedObjects.length === 0}
              className="p-2 rounded border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              title="径向对称"
            >
              <RotateCcw size={14} />
            </button>
          </div>
        </div>

        {/* 使用提示 */}
        <div className="p-2 bg-green-50 rounded text-xs text-green-700">
          <div className="font-medium mb-1">使用提示:</div>
          <ul className="space-y-0.5 text-green-600">
            <li>• 选择多个对象进行对齐操作</li>
            <li>• 开启网格和吸附提高精度</li>
            <li>• 使用分布功能均匀排列对象</li>
            <li>• 对称工具支持镜像和径向复制</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AlignAssistSystem;