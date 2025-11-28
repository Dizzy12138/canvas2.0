import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Undo2, Redo2, Eraser } from 'lucide-react';
import useMaskHistory from '../../hooks/useMaskHistory';

/**
 * 选区覆盖层组件 - 用于涂抹功能
 * 优化点：
 * 1. 使用 requestAnimationFrame 批处理绘制，消除延迟
 * 2. Canvas 操作优化，避免重复创建
 * 3. 事件处理优化，使用节流
 * 4. 独立的遮罩撤销/重做系统
 */
const SelectionOverlay = ({
  session,
  editorRef,
  containerRef,
  setSession,
  viewportRevision,
  onApply,
  onCancel
}) => {
  const [displayStroke, setDisplayStroke] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(20);
  const strokeRef = useRef([]);
  const canvasRef = useRef(null);
  const maskCanvasRef = useRef(null);
  const [previewImageUrl, setPreviewImageUrl] = useState(null);
  const [maskImageUrl, setMaskImageUrl] = useState(null);
  const rafIdRef = useRef(null);
  
  // 遮罩历史管理
  const maskHistory = useMaskHistory(50);

  // 计算边界
  const bounds = useMemo(() => {
    if (!session || !editorRef.current || !containerRef.current) return null;
    const editor = editorRef.current;
    const pageBounds = session.pageBounds;
    const topLeft = editor.pageToScreen({ x: pageBounds.minX, y: pageBounds.minY });
    const bottomRight = editor.pageToScreen({ x: pageBounds.maxX, y: pageBounds.maxY });
    const containerRect = containerRef.current.getBoundingClientRect();
    return {
      left: topLeft.x - containerRect.left,
      top: topLeft.y - containerRect.top,
      width: bottomRight.x - topLeft.x,
      height: bottomRight.y - topLeft.y
    };
  }, [session, editorRef, containerRef, viewportRevision]);

  // 初始化 canvas
  useEffect(() => {
    if (!session || !editorRef.current) return;
    
    const editor = editorRef.current;
    const shape = editor.getShape(session.shapeId);
    if (!shape) return;

    const asset = editor.getAsset(shape.props.assetId);
    if (!asset || asset.type !== 'image' || !asset.props?.src) return;
    
    // 隐藏原始图片
    editor.updateShapes([{
      ...shape,
      opacity: 0.01
    }]);
    
    // 加载原始图像
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      canvasRef.current = canvas;
      
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = img.width;
      maskCanvas.height = img.height;
      maskCanvasRef.current = maskCanvas;
      
      setPreviewImageUrl(canvas.toDataURL('image/png'));
    };
    img.src = asset.props.src;
    
    // 清理函数
    return () => {
      const currentShape = editor.getShape(session.shapeId);
      if (currentShape && currentShape.opacity < 1) {
        editor.updateShapes([{
          ...currentShape,
          opacity: 1
        }]);
      }
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [session, editorRef]);

  // 重新绘制所有笔画
  const redrawAllStrokes = useCallback(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const previewCanvas = document.createElement('canvas');
    previewCanvas.width = canvas.width;
    previewCanvas.height = canvas.height;
    const ctx = previewCanvas.getContext('2d', { willReadFrequently: true });
    
    // 绘制原始图像
    ctx.drawImage(canvas, 0, 0);
    
    const brushPx = brushSize * (canvas.width / (session.pageBounds.width || 1));
    
    // 绘制所有历史笔画
    maskHistory.strokes.forEach(stroke => {
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.globalCompositeOperation = 'source-over';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = brushPx * 2;
      
      ctx.beginPath();
      stroke.points.forEach((point, index) => {
        const x = point.x * canvas.width;
        const y = point.y * canvas.height;
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
    });
    
    setPreviewImageUrl(previewCanvas.toDataURL('image/png'));
  }, [brushSize, session, maskHistory.strokes]);

  // 实时预览更新（优化：使用 RAF）
  const updateRealtimePreview = useCallback((currentPoints) => {
    if (!canvasRef.current || !currentPoints || currentPoints.length === 0) return;
    
    // 取消之前的动画帧
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
    }
    
    // 使用 RAF 批处理绘制
    rafIdRef.current = requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      const previewCanvas = document.createElement('canvas');
      previewCanvas.width = canvas.width;
      previewCanvas.height = canvas.height;
      const ctx = previewCanvas.getContext('2d', { willReadFrequently: true });
      
      // 绘制原始图像
      ctx.drawImage(canvas, 0, 0);
      
      const brushPx = brushSize * (canvas.width / (session.pageBounds.width || 1));
      
      // 绘制所有历史笔画
      maskHistory.strokes.forEach(stroke => {
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.globalCompositeOperation = 'source-over';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = brushPx * 2;
        
        ctx.beginPath();
        stroke.points.forEach((point, index) => {
          const x = point.x * canvas.width;
          const y = point.y * canvas.height;
          if (index === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        });
        ctx.stroke();
      });
      
      // 绘制当前正在绘制的笔画
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.globalCompositeOperation = 'source-over';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = brushPx * 2;
      
      ctx.beginPath();
      currentPoints.forEach((point, index) => {
        const x = point.x * canvas.width;
        const y = point.y * canvas.height;
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
      
      setPreviewImageUrl(previewCanvas.toDataURL('image/png'));
    });
  }, [brushSize, session, maskHistory.strokes]);

  // 鼠标移动处理
  const handleMove = useCallback((event) => {
    if (!isDrawing || !editorRef.current || !containerRef.current || !session) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const screenPoint = {
      x: event.clientX - containerRect.left,
      y: event.clientY - containerRect.top
    };
    
    const editor = editorRef.current;
    const pagePoint = editor.screenToPage(screenPoint);
    const pageBounds = session.pageBounds;
    
    const normalizedPoint = {
      x: (pagePoint.x - pageBounds.minX) / (pageBounds.width || 1),
      y: (pagePoint.y - pageBounds.minY) / (pageBounds.height || 1)
    };
    
    if (normalizedPoint.x >= 0 && normalizedPoint.x <= 1 && normalizedPoint.y >= 0 && normalizedPoint.y <= 1) {
      strokeRef.current.push(normalizedPoint);
      maskHistory.addPointToStroke(normalizedPoint);
      const newStroke = [...strokeRef.current];
      setDisplayStroke(newStroke);
      updateRealtimePreview(newStroke);
    }
  }, [isDrawing, editorRef, containerRef, session, updateRealtimePreview, maskHistory]);

  // 鼠标抬起处理
  const handleUp = useCallback((event) => {
    if (!isDrawing) return;
    event.preventDefault();
    setIsDrawing(false);
    
    if (strokeRef.current.length > 2 && canvasRef.current) {
      // 完成当前笔画并添加到历史
      maskHistory.endStroke({
        brushSize: brushSize
      });
      
      // 重新生成合并后的蒙版
      const canvas = canvasRef.current;
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = canvas.width;
      maskCanvas.height = canvas.height;
      const maskCtx = maskCanvas.getContext('2d');
      
      maskCtx.fillStyle = '#ffffff';
      maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
      
      maskCtx.strokeStyle = '#000000';
      maskCtx.globalCompositeOperation = 'source-over';
      maskCtx.lineCap = 'round';
      maskCtx.lineJoin = 'round';
      
      const brushPx = brushSize * (canvas.width / (session.pageBounds.width || 1));
      maskCtx.lineWidth = brushPx * 2;
      
      // 绘制所有笔画到蒙版
      maskHistory.strokes.forEach(stroke => {
        if (stroke.points.length > 0) {
          maskCtx.beginPath();
          stroke.points.forEach((point, index) => {
            const x = point.x * canvas.width;
            const y = point.y * canvas.height;
            if (index === 0) {
              maskCtx.moveTo(x, y);
            } else {
              maskCtx.lineTo(x, y);
            }
          });
          maskCtx.stroke();
        }
      });
      
      const maskDataUrl = maskCanvas.toDataURL('image/png');
      setMaskImageUrl(maskDataUrl);
      
      // 重新绘制预览
      redrawAllStrokes();
      
      // 应用预览到 shape
      if (editorRef.current && previewImageUrl) {
        const editor = editorRef.current;
        const shape = editor.getShape(session.shapeId);
        if (shape) {
          editor.updateShapes([{
            ...shape,
            opacity: 1
          }]);
          
          const assetId = `asset:${Date.now()}-preview`;
          editor.createAssets([{
            id: assetId,
            type: 'image',
            typeName: 'asset',
            props: {
              name: 'smear-preview.png',
              src: previewImageUrl,
              w: canvasRef.current.width,
              h: canvasRef.current.height,
              mimeType: 'image/png',
              isAnimated: false
            },
            meta: {}
          }]);
          
          editor.updateShapes([{
            ...shape,
            props: {
              ...shape.props,
              assetId: assetId
            }
          }]);
        }
      }
      
      setSession(prev => ({
        ...prev,
        status: 'ready',
        maskDataUrl: maskDataUrl
      }));
      
      strokeRef.current = [];
      setDisplayStroke([]);
    }
  }, [isDrawing, brushSize, session, editorRef, setSession, maskHistory, redrawAllStrokes, previewImageUrl]);

  // 撤销笔画
  const handleUndo = useCallback(() => {
    const updatedStrokes = maskHistory.undo();
    if (updatedStrokes !== null) {
      redrawAllStrokes();
      
      // 如果在 ready 状态，回到 drawing 状态允许继续编辑
      if (session?.status === 'ready') {
        setSession(prev => ({
          ...prev,
          status: 'drawing'
        }));
      }
    }
  }, [maskHistory, redrawAllStrokes, session, setSession]);

  // 重做笔画
  const handleRedo = useCallback(() => {
    const updatedStrokes = maskHistory.redo();
    if (updatedStrokes !== null) {
      redrawAllStrokes();
      
      // 如果在 ready 状态，回到 drawing 状态允许继续编辑
      if (session?.status === 'ready') {
        setSession(prev => ({
          ...prev,
          status: 'drawing'
        }));
      }
    }
  }, [maskHistory, redrawAllStrokes, session, setSession]);

  // 清除所有笔画
  const handleClearAll = useCallback(() => {
    maskHistory.clear();
    redrawAllStrokes();
    
    // 清除后回到 drawing 状态
    if (session?.status === 'ready') {
      setSession(prev => ({
        ...prev,
        status: 'drawing'
      }));
    }
  }, [maskHistory, redrawAllStrokes, session, setSession]);

  // 键盘快捷键支持 - 在 drawing 或 ready 状态下都要拦截并执行
  useEffect(() => {
    // 只要 session 存在就拦截快捷键
    if (!session) return;

    const handleKeyDown = (event) => {
      // 只在涂抹模式下拦截 Ctrl+Z/Ctrl+Y
      if (session.status === 'drawing' || session.status === 'ready') {
        // Ctrl+Z: 撤销
        if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
          // 在 drawing 和 ready 状态都执行撤销
          handleUndo();
          return false;
        }
        // Ctrl+Shift+Z 或 Ctrl+Y: 重做
        else if (
          ((event.ctrlKey || event.metaKey) && event.key === 'z' && event.shiftKey) ||
          ((event.ctrlKey || event.metaKey) && event.key === 'y')
        ) {
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
          // 在 drawing 和 ready 状态都执行重做
          handleRedo();
          return false;
        }
      }
    };

    // 使用 capture 模式确保最先捕获
    window.addEventListener('keydown', handleKeyDown, { capture: true });

    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [session, handleUndo, handleRedo]);

  // 事件监听
  useEffect(() => {
    if (session?.status !== 'drawing') return;

    const handleDown = (event) => {
      event.preventDefault();
      setIsDrawing(true);
      strokeRef.current = [];
      setDisplayStroke([]);
      maskHistory.beginStroke();
    };

    window.addEventListener('pointerdown', handleDown);
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);

    return () => {
      window.removeEventListener('pointerdown', handleDown);
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
  }, [session?.status, handleMove, handleUp, maskHistory]);

  // 应用操作
  const handleApply = useCallback(async (mode) => {
    if (!session || !canvasRef.current || !maskImageUrl) return;
    
    try {
      const canvas = canvasRef.current;
      const resultCanvas = document.createElement('canvas');
      resultCanvas.width = canvas.width;
      resultCanvas.height = canvas.height;
      const ctx = resultCanvas.getContext('2d');
      
      // 加载蒙版
      const maskImg = await new Promise((resolve, reject) => {
        const img = new window.Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = maskImageUrl;
      });
      
      // 创建 alpha mask
      const alphaMaskCanvas = document.createElement('canvas');
      alphaMaskCanvas.width = canvas.width;
      alphaMaskCanvas.height = canvas.height;
      const alphaMaskCtx = alphaMaskCanvas.getContext('2d');
      alphaMaskCtx.drawImage(maskImg, 0, 0);
      
      const imageData = alphaMaskCtx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      for (let i = 0; i < data.length; i += 4) {
        const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
        data[i] = data[i + 1] = data[i + 2] = 255;
        data[i + 3] = gray;
      }
      
      alphaMaskCtx.putImageData(imageData, 0, 0);
      
      // 应用效果
      ctx.drawImage(canvas, 0, 0);
      ctx.globalCompositeOperation = mode === 'erase' ? 'destination-out' : 'destination-in';
      ctx.drawImage(alphaMaskCanvas, 0, 0);
      
      const resultDataUrl = resultCanvas.toDataURL('image/png');
      
      // 保存蒙版
      onApply('save-mask', {
        shapeId: session.shapeId,
        maskDataUrl: maskImageUrl,
        resultDataUrl: resultDataUrl,
        mode: mode
      });
      
      onCancel();
    } catch (error) {
      console.error('应用涂抹失败:', error);
    }
  }, [session, maskImageUrl, onApply, onCancel]);

  // 取消操作
  const handleCancel = useCallback(async () => {
    if (session?.maskDataUrl && session.status === 'ready') {
      onApply('save-mask', {
        shapeId: session.shapeId,
        maskDataUrl: session.maskDataUrl
      });
    }
    onCancel();
  }, [session, onApply, onCancel]);

  if (!session || !bounds) return null;

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: `${bounds.left}px`,
        top: `${bounds.top}px`,
        width: `${bounds.width}px`,
        height: `${bounds.height}px`,
        zIndex: 998
      }}
    >
      {/* 预览图像层 */}
      {previewImageUrl && (
        <img
          src={previewImageUrl}
          alt="Preview"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        />
      )}

      {/* 交互层 */}
      {session.status !== 'ready' && (
        <div
          className="absolute inset-0 pointer-events-auto cursor-crosshair"
          style={{ zIndex: 1000 }}
        />
      )}

      {/* 控制栏 */}
      {session.status === 'drawing' && (
        <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg px-4 py-2 pointer-events-auto flex items-center gap-3 z-[1001]">
          {/* 撤销/重做按钮 */}
          <div className="flex items-center gap-1 border-r pr-3">
            <button
              onClick={handleUndo}
              disabled={!maskHistory.canUndo}
              className="p-2 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="撤销 (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4 text-gray-700" />
            </button>
            <button
              onClick={handleRedo}
              disabled={!maskHistory.canRedo}
              className="p-2 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="重做 (Ctrl+Shift+Z)"
            >
              <Redo2 className="w-4 h-4 text-gray-700" />
            </button>
            <button
              onClick={handleClearAll}
              disabled={maskHistory.strokes.length === 0}
              className="p-2 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="清除所有"
            >
              <Eraser className="w-4 h-4 text-gray-700" />
            </button>
          </div>
          
          {/* 笔刷大小 */}
          <span className="text-sm text-gray-600">笔刷大小:</span>
          <input
            type="range"
            min="5"
            max="100"
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="w-32"
          />
          <span className="text-sm font-medium">{brushSize}px</span>
          
          {/* 笔画计数 */}
          {maskHistory.strokes.length > 0 && (
            <span className="text-xs text-gray-500 border-l pl-3">
              {maskHistory.strokes.length} 笔画
            </span>
          )}
        </div>
      )}

      {session.status === 'ready' && (
        <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg px-4 py-2 pointer-events-auto flex items-center gap-2 z-[1001]">
          {/* 撤销/重做按钮 */}
          <div className="flex items-center gap-1 border-r pr-3">
            <button
              onClick={handleUndo}
              disabled={!maskHistory.canUndo}
              className="p-2 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="撤销 (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4 text-gray-700" />
            </button>
            <button
              onClick={handleRedo}
              disabled={!maskHistory.canRedo}
              className="p-2 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="重做 (Ctrl+Shift+Z)"
            >
              <Redo2 className="w-4 h-4 text-gray-700" />
            </button>
            <button
              onClick={handleClearAll}
              disabled={maskHistory.strokes.length === 0}
              className="p-2 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="清除所有"
            >
              <Eraser className="w-4 h-4 text-gray-700" />
            </button>
            {maskHistory.strokes.length > 0 && (
              <span className="text-xs text-gray-500 ml-2">
                {maskHistory.strokes.length} 笔画
              </span>
            )}
          </div>
          
          {/* 应用按钮 */}
          <button
            onClick={() => handleApply('inverse')}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            保留
          </button>
          <button
            onClick={() => handleApply('erase')}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            擦除
          </button>
          <button
            onClick={handleCancel}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
          >
            取消
          </button>
        </div>
      )}
    </div>
  );
};

export default SelectionOverlay;


