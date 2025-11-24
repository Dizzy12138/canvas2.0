import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
// 使用经典的fabric导入方式
import { fabric } from 'fabric';
// import SmartSnapSystem from '../utils/SmartSnapSystem';
import GridRulerOverlay from './GridRulerOverlay';
import GuidelineManager from './GuidelineManager';
import CanvasDebugger from '../utils/CanvasDebugger';

// 调试fabric对象的全局检查
console.log('🔍 全局Fabric对象检查:', {
  fabricExists: typeof fabric !== 'undefined',
  fabricCanvas: typeof fabric?.Canvas !== 'undefined',
  fabricType: typeof fabric,
  fabricKeys: Object.keys(fabric || {}),
  fabricObject: fabric
});

const FabricCanvas = forwardRef(({
  width = 800, 
  height = 600, 
  activeTool = 'brush',
  strokeColor = '#000000',
  fillColor = 'transparent',
  strokeWidth = 3,
  opacity = 1,
  layers = [],
  activeLayerId = null,
  onObjectAdded,
  onObjectModified,
  onMaskCreated,
  onMaskApplied,
  onCanvasReady, // 新增回调
  onLayerReorder, // 图层顺序调整回调
  maskExpandPixels = 0, // 蒙版外扩像素数
  // 辅助系统属性
  showGrid = false,
  showRuler = false,
  showGuidelines = false,
  snapToGrid = false,
  snapToObjects = false,
  gridSize = 20,
  onAssistToggle
}, ref) => {
  const canvasRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const activeLayerIdRef = useRef(activeLayerId); // 使用ref存储最新的activeLayerId
  const maskDataRef = useRef(new Map()); // 存储蒙版数据
  const currentMaskShape = useRef(null); // 当前正在创建的蒙版形状
  const snapSystemRef = useRef(null); // 智能捕捉系统
  const [guidelines, setGuidelines] = useState([]); // 辅助线
  const [canvasScale, setCanvasScale] = useState(1); // 画布缩放
  const [canvasPan, setCanvasPan] = useState({ x: 0, y: 0 }); // 画布平移

  // 同步activeLayerId到ref
  useEffect(() => {
    activeLayerIdRef.current = activeLayerId;
    console.log('Active layer changed to:', activeLayerId);
  }, [activeLayerId]);

  // 通过useImperativeHandle暴露canvas实例 - 直接传递，由父组件检查
  useImperativeHandle(ref, () => fabricCanvasRef.current, [fabricCanvasRef.current]);

  // 初始化Fabric.js画布
  useEffect(() => {
    if (!canvasRef.current) return;

    // 调试fabric对象
    console.log('🔍 Fabric对象检查:', {
      fabricExists: !!fabric,
      fabricCanvas: !!fabric.Canvas,
      fabricType: typeof fabric,
      canvasConstructor: fabric.Canvas
    });

    const canvas = new fabric.Canvas(canvasRef.current, {
      width,
      height,
      backgroundColor: 'white',
      selection: activeTool === 'select',
    });

    console.log('🎨 创建的Canvas实例:', {
      canvas,
      constructor: canvas.constructor.name,
      hasOnMethod: typeof canvas.on === 'function',
      hasRenderAll: typeof canvas.renderAll === 'function'
    });

    fabricCanvasRef.current = canvas;
    
    // 调试canvas初始化
    CanvasDebugger.debugCanvas(canvas, 'Initial canvas creation');

    // 等待canvas完全初始化
    const initializationTimeouts = [
      setTimeout(() => {
        CanvasDebugger.debugCanvas(fabricCanvasRef.current, 'After 50ms');
      }, 50),
      setTimeout(() => {
        CanvasDebugger.debugCanvas(fabricCanvasRef.current, 'After 100ms');
        console.log('🎉 Canvas initialization complete');
        // 通知父组件Canvas已就绪
        onCanvasReady?.(canvas);
      }, 100)
    ];

    const panState = {
      x: canvas.viewportTransform?.[4] || 0,
      y: canvas.viewportTransform?.[5] || 0
    };

    const updatePanState = () => {
      const viewportTransform = canvas.viewportTransform;
      if (!viewportTransform) return;

      const nextX = viewportTransform[4] || 0;
      const nextY = viewportTransform[5] || 0;

      if (nextX !== panState.x || nextY !== panState.y) {
        panState.x = nextX;
        panState.y = nextY;
        setCanvasPan({ x: nextX, y: nextY });
      }
    };

    // 清理超时器
    const cleanup = () => {
      initializationTimeouts.forEach(timer => clearTimeout(timer));
    };

    const handleBeforeRender = () => {
      updatePanState();
    };

    const handleCanvasPanned = () => {
      updatePanState();
    };

    canvas.on('before:render', handleBeforeRender);
    canvas.on('canvas:panned', handleCanvasPanned);

    updatePanState();

    // 事件监听
    canvas.on('path:created', (e) => {
      console.log('Path created, current active layer:', activeLayerIdRef.current);
      // 使用ref获取最新的activeLayerId
      const currentActiveLayerId = activeLayerIdRef.current;
      if (currentActiveLayerId && e.path) {
        e.path.layerId = currentActiveLayerId;
        console.log('Path assigned to layer:', currentActiveLayerId);
        onObjectAdded?.(e.path, currentActiveLayerId);
      }
    });

    canvas.on('object:added', (e) => {
      // 跳过已经处理过的对象
      if (e.target.layerId) {
        return;
      }
      
      // 使用ref获取最新的activeLayerId
      const currentActiveLayerId = activeLayerIdRef.current;
      console.log('Object added, type:', e.target.type, 'current activeLayerId:', currentActiveLayerId);
      if (currentActiveLayerId) {
        e.target.layerId = currentActiveLayerId;
        console.log('Object assigned to layer:', currentActiveLayerId);
        onObjectAdded?.(e.target, currentActiveLayerId);
      }
    });

    canvas.on('object:modified', (e) => {
      onObjectModified?.(e.target);
    });

    // 监听对象z-index变化（通过bringToFront/sendToBack），同步更新图层顺序
    const handleObjectZIndexChange = (obj) => {
      if (!obj.layerId || !onLayerReorder) return;
      
      const allObjects = canvas.getObjects();
      const objIndex = allObjects.indexOf(obj);
      
      // 找到与当前对象相邻的其他图层对象
      const prevObj = allObjects[objIndex - 1];
      const nextObj = allObjects[objIndex + 1];
      
      const currentLayerIndex = layers.findIndex(l => l.id === obj.layerId);
      if (currentLayerIndex === -1) return;
      
      // 检查是否需要调整图层顺序
      if (prevObj && prevObj.layerId && prevObj.layerId !== obj.layerId) {
        const prevLayerIndex = layers.findIndex(l => l.id === prevObj.layerId);
        if (prevLayerIndex !== -1 && prevLayerIndex > currentLayerIndex) {
          // 对象被移到更上层，需要调整图层顺序
          onLayerReorder(obj.layerId, prevLayerIndex);
        }
      }
      
      if (nextObj && nextObj.layerId && nextObj.layerId !== obj.layerId) {
        const nextLayerIndex = layers.findIndex(l => l.id === nextObj.layerId);
        if (nextLayerIndex !== -1 && nextLayerIndex < currentLayerIndex) {
          // 对象被移到更下层，需要调整图层顺序
          onLayerReorder(obj.layerId, nextLayerIndex);
        }
      }
    };

    // 监听对象被带到前面或后面（通过右键菜单或快捷键）
    canvas.on('object:added', (e) => {
      // 延迟检查，确保对象已完全添加
      setTimeout(() => {
        if (e.target && e.target.layerId) {
          handleObjectZIndexChange(e.target);
        }
      }, 0);
    });

    // 监听对象修改完成（包括z-index变化）
    canvas.on('object:modified', (e) => {
      // 检查对象z-index是否变化
      if (e.target && e.target.layerId) {
        setTimeout(() => {
          handleObjectZIndexChange(e.target);
        }, 0);
      }
    });

    // 添加鼠标滚轮缩放功能
    canvas.on('mouse:wheel', (opt) => {
      const delta = opt.e.deltaY;
      let zoom = canvas.getZoom();
      zoom *= 0.999 ** delta;

      // 限制缩放范围
      if (zoom > 20) zoom = 20;
      if (zoom < 0.01) zoom = 0.01;

      // 以鼠标位置为中心缩放
      canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);

      canvas.requestRenderAll();
      canvas.fire('canvas:panned');

      // 更新缩放状态
      setCanvasScale(zoom);

      opt.e.preventDefault();
      opt.e.stopPropagation();
    });

    // 初始化智能捕捉系统（临时注释）
    // snapSystemRef.current = new SmartSnapSystem(canvas, {
    //   snapToGrid,
    //   snapToObjects,
    //   snapToGuidelines: showGuidelines,
    //   gridSize,
    //   snapTolerance: 10,
    //   showSnapLines: true
    // });

    return () => {
      cleanup();
      if (snapSystemRef.current) {
        snapSystemRef.current.destroy();
      }
      canvas.off('before:render', handleBeforeRender);
      canvas.off('canvas:panned', handleCanvasPanned);
      canvas.dispose();
    };
  }, [width, height]);

  // 更新对象的图层属性（可见性和透明度）
  const updateObjectLayerProperties = useCallback((obj, layerId) => {
    if (!layerId || !fabricCanvasRef.current) return;
    
    const layer = layers.find(l => l.id === layerId);
    if (layer) {
      // 修复：Fabric.js 中通过 opacity 控制可见性，0 表示完全隐藏
      const targetOpacity = layer.visible ? (layer.opacity || 1) : 0;
      obj.set({
        opacity: targetOpacity,
        excludeFromExport: !layer.visible, // 不可见图层不导出
        selectable: !layer.locked, // 锁定图层不可选择
        evented: !layer.locked // 锁定图层不响应事件
      });
      fabricCanvasRef.current.renderAll();
    }
  }, [layers]);

  // 更新图层顺序（当图层数组变化时调整Fabric.js对象的Z-index）
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || layers.length === 0) return;
    
    console.log('Updating layer order, layers:', layers.map(l => l.name));
    
    // 重新排列所有对象按照图层顺序
    const allObjects = canvas.getObjects();
    const orderedObjects = [];
    
    // 按照图层顺序重新组织对象（反向排列，使最后的图层在最上方）
    // 在图层面板中，下面的图层应该在画布的上层（更高的Z-index）
    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      const layerObjects = allObjects.filter(obj => obj.layerId === layer.id);
      console.log(`Layer ${layer.name} has ${layerObjects.length} objects`);
      orderedObjects.push(...layerObjects);
    }
    
    // 添加没有图层标识的对象（保持在最上层）
    const unassignedObjects = allObjects.filter(obj => !obj.layerId);
    orderedObjects.push(...unassignedObjects);
    
    console.log('Final object order:', orderedObjects.map(obj => `${obj.type}(${obj.layerId})`));
    
    // 清空画布并重新添加所有对象
    canvas._objects = [];
    orderedObjects.forEach(obj => {
      canvas._objects.push(obj);
    });
    
    canvas.renderAll();
  }, [layers]);

  // 更新图层可见性和透明度
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    
    // 遍历画布上的所有对象，根据图层设置更新它们的可见性
    canvas.getObjects().forEach(obj => {
      if (obj.layerId) {
        updateObjectLayerProperties(obj, obj.layerId);
      }
    });
  }, [layers, updateObjectLayerProperties]);

  // 更新辅助系统设置
  useEffect(() => {
    if (snapSystemRef.current) {
      snapSystemRef.current.updateOptions({
        snapToGrid,
        snapToObjects,
        snapToGuidelines: showGuidelines,
        gridSize,
        snapTolerance: 10
      });
      snapSystemRef.current.setGuidelines(guidelines);
    }
  }, [snapToGrid, snapToObjects, showGuidelines, gridSize, guidelines]);

  // 工具切换
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    // 清除所有模式
    canvas.isDrawingMode = false;
    canvas.selection = true; // 默认允许选择，只在绘图模式下禁用
    canvas.defaultCursor = 'default';

    // 清除之前的事件监听器
    canvas.off('mouse:down');
    canvas.off('mouse:move');
    canvas.off('mouse:up');

    switch (activeTool) {
      case 'select':
        canvas.selection = true;
        canvas.defaultCursor = 'default';
        break;

      case 'hand': // 添加手形工具用于画布平移
        canvas.selection = false;
        canvas.defaultCursor = 'grab';
        setupCanvasPanning(canvas);
        break;

      case 'brush':
        canvas.isDrawingMode = true;
        canvas.selection = false; // 绘图模式下禁用选择
        canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
        canvas.freeDrawingBrush.color = strokeColor;
        canvas.freeDrawingBrush.width = strokeWidth;
        break;

      case 'pencil':
        canvas.isDrawingMode = true;
        canvas.selection = false; // 绘图模式下禁用选择
        canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
        canvas.freeDrawingBrush.color = strokeColor;
        canvas.freeDrawingBrush.width = Math.max(1, strokeWidth / 2);
        break;

      case 'eraser':
        canvas.isDrawingMode = true;
        canvas.selection = false; // 绘图模式下禁用选择
        if (fabric.EraserBrush) {
          canvas.freeDrawingBrush = new fabric.EraserBrush(canvas);
          canvas.freeDrawingBrush.width = strokeWidth;
        }
        break;

      case 'mask':
      case 'clip':
      case 'freehand':
      case 'brush-mask':
        canvas.defaultCursor = activeTool === 'freehand' || activeTool === 'brush-mask' ? 'crosshair' : 'crosshair';
        canvas.selection = false;
        setupMaskTool(canvas, activeTool);
        break;

      case 'rectangle':
      case 'circle':
        canvas.defaultCursor = 'crosshair';
        canvas.selection = false; // 形状绘制模式下临时禁用选择
        setupShapeDrawing(canvas, activeTool);
        break;

      case 'text':
        canvas.defaultCursor = 'text';
        canvas.selection = false; // 文本创建模式下临时禁用选择
        setupTextTool(canvas);
        break;

      // 辅助工具
      case 'grid':
      case 'ruler':
      case 'guideline':
      case 'snap':
      case 'align':
      case 'symmetry':
        // 辅助工具不改变画布模式，只切换UI显示
        canvas.selection = true;
        canvas.defaultCursor = 'default';
        onAssistToggle?.(activeTool);
        break;

      default:
        break;
    }
  }, [activeTool, strokeColor, strokeWidth]);

  // 设置蒙版工具
  const setupMaskTool = useCallback((canvas, maskType) => {
    let isDown = false;
    let origX, origY;
    let maskShape;
    let maskPath = [];
    let isFreehand = maskType === 'freehand' || maskType === 'brush-mask';

    const onMouseDown = (o) => {
      if (activeTool !== maskType && activeTool !== 'freehand' && activeTool !== 'brush-mask') return;
      
      isDown = true;
      const pointer = canvas.getPointer(o.e);
      origX = pointer.x;
      origY = pointer.y;

      if (maskType === 'mask' || (maskType === 'clip' && !isFreehand)) {
        // 创建矩形蒙版
        maskShape = new fabric.Rect({
          left: origX,
          top: origY,
          width: 0,
          height: 0,
          fill: 'rgba(0, 0, 0, 0.3)', // 半透明黑色显示蒙版区域
          stroke: '#ff0000',
          strokeWidth: 2,
          strokeDashArray: [5, 5],
          selectable: true,
          isMask: true,
          maskType: 'rectangle'
        });
        canvas.add(maskShape);
        currentMaskShape.current = maskShape;
      } else if (maskType === 'clip' && !isFreehand) {
        // 创建圆形蒙版
        maskShape = new fabric.Circle({
          left: origX,
          top: origY,
          radius: 0,
          fill: 'rgba(0, 0, 0, 0.3)',
          stroke: '#ff0000',
          strokeWidth: 2,
          strokeDashArray: [5, 5],
          selectable: true,
          isMask: true,
          maskType: 'circle'
        });
        canvas.add(maskShape);
        currentMaskShape.current = maskShape;
      } else if (isFreehand || maskType === 'freehand' || maskType === 'brush-mask') {
        // 创建自由绘制路径（涂抹裁剪）
        maskPath = [{ x: origX, y: origY }];
        maskShape = new fabric.Path(`M ${origX} ${origY}`, {
          fill: 'rgba(0, 0, 0, 0.3)',
          stroke: '#ff0000',
          strokeWidth: 2,
          strokeLineCap: 'round',
          strokeLineJoin: 'round',
          selectable: false,
          isMask: true,
          maskType: 'freehand'
        });
        canvas.add(maskShape);
        currentMaskShape.current = maskShape;
      }
    };

    const onMouseMove = (o) => {
      if (!isDown || !maskShape) return;

      const pointer = canvas.getPointer(o.e);

      if (isFreehand || maskType === 'freehand' || maskType === 'brush-mask') {
        // 自由绘制路径
        maskPath.push({ x: pointer.x, y: pointer.y });
        const pathString = maskPath.length > 1 
          ? `M ${maskPath[0].x} ${maskPath[0].y} L ${maskPath.slice(1).map(p => `${p.x} ${p.y}`).join(' L ')}`
          : `M ${pointer.x} ${pointer.y}`;
        
        // 更新路径
        maskShape.set({ path: pathString });
      } else if (maskType === 'mask') {
        const width = Math.abs(pointer.x - origX);
        const height = Math.abs(pointer.y - origY);
        
        // 设置最小尺寸限制，避免创建过小的蒙版
        const minSize = 1;
        
        maskShape.set({
          left: Math.min(origX, pointer.x),
          top: Math.min(origY, pointer.y),
          width: Math.max(minSize, width),
          height: Math.max(minSize, height)
        });
      } else if (maskType === 'clip') {
        const radius = Math.sqrt(Math.pow(pointer.x - origX, 2) + Math.pow(pointer.y - origY, 2)) / 2;
        const minRadius = 0.5;
        
        maskShape.set({
          radius: Math.max(minRadius, radius)
        });
      }

      canvas.renderAll();
    };

    const onMouseUp = () => {
      if (maskShape && isDown) {
        const currentActiveLayerId = activeLayerIdRef.current;
        console.log('Mask created for layer:', currentActiveLayerId);
        
        // 验证蒙版尺寸的有效性
        let isValidMask = false;
        let bounds = {};
        
        if (isFreehand || maskType === 'freehand' || maskType === 'brush-mask') {
          // 自由绘制路径验证
          if (maskPath && maskPath.length > 2) { // 至少需要3个点形成有效路径
            isValidMask = true;
            // 计算路径边界
            const xs = maskPath.map(p => p.x);
            const ys = maskPath.map(p => p.y);
            bounds = {
              left: Math.min(...xs),
              top: Math.min(...ys),
              width: Math.max(...xs) - Math.min(...xs),
              height: Math.max(...ys) - Math.min(...ys)
            };
          }
        } else if (maskType === 'mask') {
          // 矩形蒙版验证
          const width = maskShape.width || 0;
          const height = maskShape.height || 0;
          if (width > 5 && height > 5) { // 最小5px防止意外点击
            isValidMask = true;
            bounds = {
              left: maskShape.left,
              top: maskShape.top,
              width: width,
              height: height
            };
          }
        } else if (maskType === 'clip') {
          // 圆形蒙版验证
          const radius = maskShape.radius || 0;
          if (radius > 2.5) { // 最小半径
            isValidMask = true;
            bounds = {
              left: maskShape.left,
              top: maskShape.top,
              width: radius * 2,
              height: radius * 2
            };
          }
        }
        
        if (currentActiveLayerId && isValidMask) {
          // 保存蒙版信息
          const maskData = {
            id: maskShape.maskType + '_' + Date.now(),
            type: maskShape.maskType,
            layerId: currentActiveLayerId,
            bounds: bounds,
            path: isFreehand ? maskPath : null, // 保存自由绘制路径
            visible: true,
            inverted: false, // 默认不反向
            expandPixels: maskExpandPixels || 0 // 内缩/外扩像素数（负值为内缩，正值为外扩）
          };
          
          console.log('[蒙版创建] 蒙版数据:', {
            type: maskData.type,
            layerId: maskData.layerId,
            bounds: maskData.bounds,
            expandPixels: maskData.expandPixels,
            maskExpandPixels: maskExpandPixels
          });
          
          maskDataRef.current.set(currentActiveLayerId, maskData);
          
          // 应用蒙版到当前图层的所有对象
          applyMaskToLayer(canvas, currentActiveLayerId, maskData);
          
          // 通知父组件
          onMaskCreated?.(maskData);
          
          console.log('[蒙版创建] 蒙版已应用到图层:', currentActiveLayerId, '外扩像素:', maskData.expandPixels);
        } else {
          console.log('Mask too small or invalid, skipping application');
        }
        
        // 移除蒙版预览形状
        canvas.remove(maskShape);
        currentMaskShape.current = null;
        
        // 蒙版创建完成后，重新启用选择功能
        canvas.selection = true;
      }
      isDown = false;
      maskShape = null;
    };

    canvas.on('mouse:down', onMouseDown);
    canvas.on('mouse:move', onMouseMove);
    canvas.on('mouse:up', onMouseUp);
    
    // 返回清理函数
    return () => {
      canvas.off('mouse:down', onMouseDown);
      canvas.off('mouse:move', onMouseMove);
      canvas.off('mouse:up', onMouseUp);
    };
  }, [activeTool, onMaskCreated, maskExpandPixels]);

  // 应用蒙版到图层
  const applyMaskToLayer = useCallback((canvas, layerId, maskData) => {
    const layerObjects = canvas.getObjects().filter(obj => obj.layerId === layerId && !obj.isMask);
    
    // 验证蒙版边界的有效性
    const bounds = maskData.bounds;
    if (!bounds || (bounds.width <= 0 && bounds.height <= 0) && !maskData.path) {
      console.warn('Invalid mask bounds, skipping mask application:', bounds);
      return;
    }
    
    // 内缩/外扩像素数（从maskData中获取，默认为0，负值为内缩，正值为外扩）
    const expandPixels = maskData.expandPixels || 0;
    
    console.log('[蒙版应用] 应用蒙版到图层:', layerId, {
      type: maskData.type,
      expandPixels: expandPixels,
      bounds: bounds,
      objectsCount: layerObjects.length
    });
    
    layerObjects.forEach(obj => {
      try {
        if (maskData.type === 'freehand' && maskData.path) {
          // 自由绘制路径蒙版（涂抹裁剪）
          let pathString = maskData.path.length > 1
            ? `M ${maskData.path[0].x} ${maskData.path[0].y} L ${maskData.path.slice(1).map(p => `${p.x} ${p.y}`).join(' L ')} Z`
            : `M ${maskData.path[0].x} ${maskData.path[0].y} Z`;
          
          // 如果外扩或内缩，需要调整路径
          if (expandPixels !== 0) {
            // 使用Canvas API扩展/收缩路径（简化实现：通过偏移点实现）
            // 实际应该使用更复杂的算法，这里简化处理
            const adjustedPath = maskData.path.map((point, index) => {
              // 计算每个点的外扩/内缩方向（简化：向外法线方向）
              const prevPoint = index > 0 ? maskData.path[index - 1] : maskData.path[maskData.path.length - 1];
              const nextPoint = index < maskData.path.length - 1 ? maskData.path[index + 1] : maskData.path[0];
              
              // 计算法线方向
              const dx1 = point.x - prevPoint.x;
              const dy1 = point.y - prevPoint.y;
              const dx2 = nextPoint.x - point.x;
              const dy2 = nextPoint.y - point.y;
              
              const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
              const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
              
              // 防止除以零错误（当相邻点重合时）
              if (len1 < 0.001 && len2 < 0.001) {
                // 如果前后点都重合，保持原位置
                return { x: point.x, y: point.y };
              }
              
              // 平均法线方向（expandPixels为负值时向内，正值时向外）
              let nx, ny;
              if (len1 < 0.001) {
                // 只使用下一个点的方向
                nx = dy2 / len2;
                ny = -dx2 / len2;
              } else if (len2 < 0.001) {
                // 只使用上一个点的方向
                nx = dy1 / len1;
                ny = -dx1 / len1;
              } else {
                // 使用两个方向的平均值
                nx = (dy1 / len1 + dy2 / len2) / 2;
                ny = (-dx1 / len1 - dx2 / len2) / 2;
              }
              
              const nlen = Math.sqrt(nx * nx + ny * ny);
              
              // 防止除以零
              if (nlen < 0.001) {
                return { x: point.x, y: point.y };
              }
              
              // 根据expandPixels的正负值决定方向
              return {
                x: point.x + (nx / nlen) * expandPixels,
                y: point.y + (ny / nlen) * expandPixels
              };
            });
            
            pathString = adjustedPath.length > 1
              ? `M ${adjustedPath[0].x} ${adjustedPath[0].y} L ${adjustedPath.slice(1).map(p => `${p.x} ${p.y}`).join(' L ')} Z`
              : `M ${adjustedPath[0].x} ${adjustedPath[0].y} Z`;
          }
          
          // 创建路径作为裁剪路径
          const clipPath = new fabric.Path(pathString, {
            absolutePositioned: true
          });
          
          // 如果反向，标记对象（反向裁剪通过自定义渲染实现）
          obj.clipPath = clipPath;
          obj.set('inverted', maskData.inverted || false);
          
          // 为反向裁剪添加自定义渲染方法
          if (maskData.inverted) {
            const originalRender = obj.render;
            obj.render = function(ctx) {
              // 保存上下文
              ctx.save();
              
              // 创建临时 canvas 用于反向裁剪
              const tempCanvas = document.createElement('canvas');
              tempCanvas.width = this.width || canvas.width;
              tempCanvas.height = this.height || canvas.height;
              const tempCtx = tempCanvas.getContext('2d');
              
              // 先绘制完整对象
              if (originalRender) {
                originalRender.call(this, tempCtx);
              }
              
              // 使用 destination-out 模式擦除裁剪区域
              tempCtx.globalCompositeOperation = 'destination-out';
              tempCtx.fillStyle = 'black';
              
              // 绘制裁剪路径（需要转换为相对于对象的坐标）
              if (this.clipPath && this.clipPath.path) {
                const path = new Path2D(this.clipPath.path);
                tempCtx.fill(path);
              }
              
              // 将结果绘制到主 canvas
              ctx.drawImage(tempCanvas, 0, 0);
              
              ctx.restore();
            };
          }
        } else if (maskData.type === 'rectangle') {
          // 矩形蒙版裁切（支持内缩/外扩）
          const adjustedWidth = Math.max(1, bounds.width + expandPixels * 2); // 外扩时增加，内缩时减少
          const adjustedHeight = Math.max(1, bounds.height + expandPixels * 2);
          const adjustedLeft = (bounds.left - obj.left) - expandPixels; // 外扩时向左上移动，内缩时向右下移动
          const adjustedTop = (bounds.top - obj.top) - expandPixels;
          
          const clipPath = new fabric.Rect({
            left: adjustedLeft,
            top: adjustedTop,
            width: adjustedWidth,
            height: adjustedHeight,
            absolutePositioned: true
          });
          
          // 如果反向，标记对象
          if (maskData.inverted) {
            obj.set('inverted', true);
            // 注意：Fabric.js 的 clipPath 不支持反向，需要通过其他方式实现
            // 这里标记为反向，实际效果需要在渲染时处理
          } else {
            obj.set('inverted', false);
          }
          
          obj.clipPath = clipPath;
          obj.set('expandPixels', expandPixels); // 保存内缩/外扩像素数
        } else if (maskData.type === 'circle') {
          // 圆形蒙版裁切（支持内缩/外扩）
          const baseRadius = bounds.width / 2;
          const radius = Math.max(0.5, baseRadius + expandPixels); // 外扩时增加半径，内缩时减少半径
          const adjustedLeft = (bounds.left - obj.left) - expandPixels; // 外扩时向左上移动，内缩时向右下移动
          const adjustedTop = (bounds.top - obj.top) - expandPixels;
          
          console.log('[圆形裁剪] 应用外扩/内缩:', {
            baseRadius: baseRadius,
            expandPixels: expandPixels,
            finalRadius: radius,
            adjustedLeft: adjustedLeft,
            adjustedTop: adjustedTop
          });
          
          const clipPath = new fabric.Circle({
            left: adjustedLeft,
            top: adjustedTop,
            radius: radius,
            absolutePositioned: true
          });
          
          // 如果反向，标记对象（反向裁剪通过自定义渲染实现）
          obj.clipPath = clipPath;
          obj.set('inverted', maskData.inverted || false);
          obj.set('expandPixels', expandPixels); // 保存内缩/外扩像素数，用于渲染时透明填充
          
          // 为反向裁剪添加自定义渲染方法
          if (maskData.inverted) {
            const originalRender = obj.render;
            obj.render = function(ctx) {
              // 保存上下文
              ctx.save();
              
              // 创建临时 canvas 用于反向裁剪
              const tempCanvas = document.createElement('canvas');
              tempCanvas.width = this.width || canvas.width;
              tempCanvas.height = this.height || canvas.height;
              const tempCtx = tempCanvas.getContext('2d');
              
              // 先绘制完整对象
              if (originalRender) {
                originalRender.call(this, tempCtx);
              }
              
              // 使用 destination-out 模式擦除裁剪区域
              tempCtx.globalCompositeOperation = 'destination-out';
              tempCtx.fillStyle = 'black';
              
              // 绘制裁剪路径（需要转换为相对于对象的坐标）
              if (this.clipPath && this.clipPath.path) {
                const path = new Path2D(this.clipPath.path);
                tempCtx.fill(path);
              }
              
              // 将结果绘制到主 canvas
              ctx.drawImage(tempCanvas, 0, 0);
              
              ctx.restore();
            };
          }
        }
        
        obj.maskId = maskData.id;
        obj.maskInverted = maskData.inverted || false;
      } catch (error) {
        console.error('Error applying mask to object:', error, obj, maskData);
      }
    });
    
    canvas.renderAll();
  }, []);

  // 移除蒙版
  const removeMaskFromLayer = useCallback((canvas, layerId) => {
    const layerObjects = canvas.getObjects().filter(obj => obj.layerId === layerId);
    
    layerObjects.forEach(obj => {
      try {
        if (obj.clipPath) {
          obj.clipPath = null;
          obj.maskId = null;
        }
      } catch (error) {
        console.error('Error removing mask from object:', error);
        // 强制移除clipPath
        obj.clipPath = null;
        obj.maskId = null;
      }
    });
    
    maskDataRef.current.delete(layerId);
    
    try {
      canvas.renderAll();
    } catch (error) {
      console.error('Error rendering after mask removal:', error);
      // 如果渲染失败，尝试清理所有有问题的clipPath
      canvas.getObjects().forEach(obj => {
        if (obj.clipPath) {
          try {
            // 测试clipPath是否有效
            if (obj.clipPath.width <= 0 || obj.clipPath.height <= 0 || obj.clipPath.radius <= 0) {
              obj.clipPath = null;
            }
          } catch (e) {
            obj.clipPath = null;
          }
        }
      });
      canvas.renderAll();
    }
  }, []);

  // 设置画布平移功能
  const setupCanvasPanning = useCallback((canvas) => {
    let isDragging = false;
    let lastPosX, lastPosY;
    const previousSelectableState = new Map();

    const onMouseDown = (o) => {
      if (activeTool !== 'hand') return;

      const pointer = canvas.getPointer(o.e);
      if (!pointer) {
        return;
      }

      isDragging = true;
      canvas.defaultCursor = 'grabbing';

      lastPosX = pointer.x;
      lastPosY = pointer.y;
      
      // 禁用对象选择
      canvas.selection = false;
      previousSelectableState.clear();
      canvas.getObjects().forEach(obj => {
        previousSelectableState.set(obj, obj.selectable);
        obj.selectable = false;
      });
    };

    const onMouseMove = (o) => {
      if (!isDragging) return;

      const pointer = canvas.getPointer(o.e);
      if (!pointer) {
        return;
      }
      const deltaX = pointer.x - lastPosX;
      const deltaY = pointer.y - lastPosY;

      if (deltaX !== 0 || deltaY !== 0) {
        canvas.relativePan(new fabric.Point(deltaX, deltaY));
        canvas.requestRenderAll();
        canvas.fire('canvas:panned');
      }

      lastPosX = pointer.x;
      lastPosY = pointer.y;
    };

    const onMouseUp = () => {
      if (!isDragging) return;
      
      isDragging = false;
      canvas.defaultCursor = 'grab';
      
      // 恢复对象可选择性
      canvas.getObjects().forEach(obj => {
        const previous = previousSelectableState.get(obj);
        obj.selectable = typeof previous === 'boolean' ? previous : true;
      });
      previousSelectableState.clear();
    };

    canvas.on('mouse:down', onMouseDown);
    canvas.on('mouse:move', onMouseMove);
    canvas.on('mouse:up', onMouseUp);
  }, [activeTool]);

  // 设置形状绘制
  const setupShapeDrawing = useCallback((canvas, shapeType) => {
    let isDown = false;
    let origX, origY;
    let shape;

    const onMouseDown = (o) => {
      if (activeTool !== shapeType) return;
      
      isDown = true;
      const pointer = canvas.getPointer(o.e);
      origX = pointer.x;
      origY = pointer.y;

      if (shapeType === 'rectangle') {
        shape = new fabric.Rect({
          left: origX,
          top: origY,
          width: 0,
          height: 0,
          fill: fillColor === 'transparent' ? '' : fillColor,
          stroke: strokeColor,
          strokeWidth: strokeWidth,
          opacity: opacity,
          selectable: true, // 确保形状可选择
          moveable: true,   // 确保形状可移动
          hasControls: true // 显示控制点
        });
      } else if (shapeType === 'circle') {
        shape = new fabric.Circle({
          left: origX,
          top: origY,
          radius: 0,
          fill: fillColor === 'transparent' ? '' : fillColor,
          stroke: strokeColor,
          strokeWidth: strokeWidth,
          opacity: opacity,
          selectable: true, // 确保形状可选择
          moveable: true,   // 确保形状可移动
          hasControls: true // 显示控制点
        });
      }

      if (shape) {
        canvas.add(shape);
      }
    };

    const onMouseMove = (o) => {
      if (!isDown || !shape) return;

      const pointer = canvas.getPointer(o.e);

      if (shapeType === 'rectangle') {
        const width = Math.abs(pointer.x - origX);
        const height = Math.abs(pointer.y - origY);
        
        shape.set({
          left: Math.min(origX, pointer.x),
          top: Math.min(origY, pointer.y),
          width: width,
          height: height
        });
      } else if (shapeType === 'circle') {
        const radius = Math.sqrt(Math.pow(pointer.x - origX, 2) + Math.pow(pointer.y - origY, 2)) / 2;
        shape.set({
          radius: radius
        });
      }

      canvas.renderAll();
    };

    const onMouseUp = () => {
      if (shape && isDown) {
        // 使用ref获取最新的activeLayerId
        const currentActiveLayerId = activeLayerIdRef.current;
        console.log('Shape drawing finished, current active layer:', currentActiveLayerId);
        
        if (currentActiveLayerId && !shape.layerId) {
          shape.layerId = currentActiveLayerId;
          console.log('Shape assigned to layer:', currentActiveLayerId);
          onObjectAdded?.(shape, currentActiveLayerId);
        }
        
        // 形状绘制完成后，重新启用选择功能
        canvas.selection = true;
      }
      isDown = false;
      shape = null;
    };

    canvas.on('mouse:down', onMouseDown);
    canvas.on('mouse:move', onMouseMove);
    canvas.on('mouse:up', onMouseUp);
  }, [activeTool, strokeColor, fillColor, strokeWidth, opacity, onObjectAdded]);

  // 设置文本工具
  const setupTextTool = useCallback((canvas) => {
    const onMouseDown = (o) => {
      if (activeTool !== 'text') return;

      const pointer = canvas.getPointer(o.e);
      const text = new fabric.IText('输入文本', {
        left: pointer.x,
        top: pointer.y,
        fontFamily: 'Arial',
        fontSize: 16,
        fill: strokeColor,
        opacity: opacity,
        selectable: true, // 确保文本可选择
        moveable: true,   // 确保文本可移动
        hasControls: true // 显示控制点
      });

      canvas.add(text);
      canvas.setActiveObject(text);
      text.enterEditing();
      
      // 使用ref获取最新的activeLayerId
      const currentActiveLayerId = activeLayerIdRef.current;
      console.log('Text created, current active layer:', currentActiveLayerId);
      
      if (currentActiveLayerId && !text.layerId) {
        text.layerId = currentActiveLayerId;
        console.log('Text assigned to layer:', currentActiveLayerId);
        onObjectAdded?.(text, currentActiveLayerId);
      }
      
      // 文本创建后，重新启用选择功能
      canvas.selection = true;
    };

    canvas.on('mouse:down', onMouseDown);
  }, [activeTool, strokeColor, opacity, onObjectAdded]);

  // 公共方法
  const exportCanvas = useCallback((format = 'png') => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return null;

    if (format === 'json') {
      return canvas.toJSON();
    }

    return canvas.toDataURL({
      format: format,
      quality: 1
    });
  }, []);

  const importCanvas = useCallback((data) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    if (typeof data === 'string' && data.startsWith('data:')) {
      // 导入图片
      fabric.Image.fromURL(data, (img) => {
        canvas.add(img);
        // 使用ref获取最新的activeLayerId
        const currentActiveLayerId = activeLayerIdRef.current;
        if (currentActiveLayerId) {
          img.layerId = currentActiveLayerId;
          console.log('Imported image assigned to layer:', currentActiveLayerId);
          onObjectAdded?.(img, currentActiveLayerId);
        }
        canvas.renderAll();
      });
    } else if (typeof data === 'object') {
      // 导入JSON
      canvas.loadFromJSON(data, () => {
        canvas.renderAll();
      });
    }
  }, [onObjectAdded]);

  const clearCanvas = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    canvas.clear();
    canvas.backgroundColor = 'white';
  }, []);

  const deleteActiveLayer = useCallback((layerId) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    
    // 找到并删除属于该图层的所有对象
    const objectsToRemove = canvas.getObjects().filter(obj => obj.layerId === layerId);
    objectsToRemove.forEach(obj => {
      canvas.remove(obj);
    });
    
    canvas.renderAll();
  }, []);

  // 图层Z-index管理
  const reorderLayerObjects = useCallback((layerId, direction) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    
    // 获取该图层的所有对象
    const layerObjects = canvas.getObjects().filter(obj => obj.layerId === layerId);
    
    if (layerObjects.length === 0) return;
    
    // 根据方向调整Z-index
    layerObjects.forEach(obj => {
      if (direction === 'up') {
        canvas.bringToFront(obj);
      } else if (direction === 'down') {
        canvas.sendToBack(obj);
      }
    });
    
    canvas.renderAll();
  }, []);

  // 获取图层对象数量
  const getLayerObjectCount = useCallback((layerId) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return 0;
    
    return canvas.getObjects().filter(obj => obj.layerId === layerId).length;
  }, []);

  // 获取图层蒙版信息
  const getLayerMask = useCallback((layerId) => {
    return maskDataRef.current.get(layerId) || null;
  }, []);

  // 为图层创建蒙版
  const createMaskForLayer = useCallback((layerId, maskType, bounds) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    
    // 验证边界有效性
    if (!bounds || bounds.width <= 5 || bounds.height <= 5) {
      console.warn('Invalid bounds for mask creation:', bounds);
      return null;
    }
    
    const maskData = {
      id: maskType + '_' + Date.now(),
      type: maskType,
      layerId: layerId,
      bounds: {
        left: bounds.left,
        top: bounds.top,
        width: Math.max(5, bounds.width), // 确保最小尺寸
        height: Math.max(5, bounds.height)
      },
      visible: true
    };
    
    maskDataRef.current.set(layerId, maskData);
    applyMaskToLayer(canvas, layerId, maskData);
    
    onMaskApplied?.(maskData);
    return maskData;
  }, [applyMaskToLayer, onMaskApplied]);

  // 移除图层蒙版
  const removeMaskFromLayerById = useCallback((layerId) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    
    removeMaskFromLayer(canvas, layerId);
  }, [removeMaskFromLayer]);

  // 切换蒙版可见性
  const toggleMaskVisibility = useCallback((layerId, visible) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    
    const maskData = maskDataRef.current.get(layerId);
    if (maskData) {
      maskData.visible = visible;
      
      const layerObjects = canvas.getObjects().filter(obj => obj.layerId === layerId && !obj.isMask);
      layerObjects.forEach(obj => {
        try {
          if (visible && maskData) {
            // 重新应用蒙版（带有效性验证）
            applyMaskToLayer(canvas, layerId, maskData);
          } else {
            // 移除蒙版
            obj.clipPath = null;
            obj.globalCompositeOperation = 'source-over';
          }
        } catch (error) {
          console.error('Error toggling mask visibility:', error);
          // 如果出错，先移除clipPath避免渲染错误
          obj.clipPath = null;
          obj.globalCompositeOperation = 'source-over';
        }
      });
      
      canvas.renderAll();
    }
  }, [applyMaskToLayer]);

  // 切换蒙版反向（反向裁剪）
  const toggleMaskInvert = useCallback((layerId, inverted) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    
    const maskData = maskDataRef.current.get(layerId);
    if (maskData) {
      maskData.inverted = inverted;
      
      // 重新应用蒙版以更新反向状态
      applyMaskToLayer(canvas, layerId, maskData);
      
      canvas.renderAll();
    }
  }, [applyMaskToLayer]);

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    exportCanvas,
    importCanvas,
    clearCanvas,
    deleteActiveLayer,
    getLayerObjectCount,
    reorderLayerObjects,
    getLayerMask,
    createMaskForLayer,
    removeMaskFromLayerById,
    toggleMaskVisibility,
    toggleMaskInvert,
    fabricCanvas: fabricCanvasRef.current
  }), [exportCanvas, importCanvas, clearCanvas, deleteActiveLayer, getLayerObjectCount, reorderLayerObjects, getLayerMask, createMaskForLayer, removeMaskFromLayerById, toggleMaskVisibility, toggleMaskInvert]);

  return (
    <div className="relative">
      {/* 主画布 */}
      <canvas 
        ref={canvasRef}
        className="border border-gray-300 rounded-lg shadow-sm"
      />
      
      {/* 网格和标尺覆盖层 */}
      <GridRulerOverlay
        width={width}
        height={height}
        showGrid={showGrid}
        showRuler={showRuler}
        gridSize={gridSize}
        gridOpacity={0.3}  // 增加网格透明度使其更可见
        scale={canvasScale}
        pan={canvasPan}
      />
      
      {/* 辅助线管理器 */}
      <GuidelineManager
        canvas={fabricCanvasRef.current}
        width={width}
        height={height}
        showGuidelines={showGuidelines}
        onGuidelinesChange={setGuidelines}
      />
    </div>
  );
});

FabricCanvas.displayName = 'FabricCanvas';

export default FabricCanvas;