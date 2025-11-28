// React核心
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';

// 第三方库
import { 
  Rocket, 
  Plus, 
  Type, 
  Square, 
  Circle, 
  Pen, 
  Undo, 
  Redo, 
  Copy, 
  Clipboard, 
  AlignLeft, 
  AlignCenter, 
  AlignRight,
  ZoomIn,
  ZoomOut,
  Maximize,
  Bell,
  CreditCard,
  FileText,
  Settings,
  Star,
  MousePointer2,
  Hand,
  Eraser,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  Trash2,
  Crown,
  Minus,
  X,
  Layers,
  Scissors,
  Package,
  Brush,
  Download,
  Expand
} from 'lucide-react';
import { Tldraw, useEditor, useValue } from 'tldraw';
import 'tldraw/tldraw.css';
import clsx from 'clsx';

// API和工具
import api from '@/api/index.js';
import { useEnhancedLayers } from '../hooks/useEnhancedLayers';
import { useLayerHistory } from '../hooks/useLayerHistory';
import logger, { createLogger } from '../utils/logger.js';
import { DEFAULT_CONFIG, API_ENDPOINTS, DELAYS, IMAGE_SPACING, TOOL_TYPES } from '../utils/constants.js';
import errorHandler from '../utils/errorHandler.js';

// 组件
import TopNavbar from './navbar/TopNavbar.jsx';
import CanvasToolbar from './toolbar/CanvasToolbar.jsx';
import EditableCanvas from './canvas/EditableCanvas.jsx';
import GeneratorPanel from './panels/GeneratorPanel.jsx';
import LayerPanel from './LayerPanel.jsx';
import PropertyPanel from './PropertyPanel.jsx';
import EnhancedLayerPanel from './EnhancedLayerPanel.jsx';
import AlignAssistSystem from './AlignAssistSystem.jsx';
import LayerDiffViewer from './LayerDiffViewer.jsx';
import AIPanel from './AIPanel.jsx';
import VisualWorkflowEditor from './VisualWorkflowEditor.jsx';
import ServiceManager from './ServiceManager.jsx';

const arraysEqual = (a = [], b = []) =>
  a.length === b.length && a.every((value, index) => value === b[index]);

const loadImageElement = (src) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });

const clamp01 = (value) => Math.max(0, Math.min(1, value));

const normalizePointWithinBounds = (point, bounds) => {
  if (!bounds) return { x: 0, y: 0 };
  const width = bounds.width ?? bounds.w ?? 0;
  const height = bounds.height ?? bounds.h ?? 0;
  return {
    x: width ? clamp01((point.x - bounds.minX) / width) : 0,
    y: height ? clamp01((point.y - bounds.minY) / height) : 0
  };
};

const isPointInsideBounds = (point, bounds) =>
  !!bounds &&
  point.x >= bounds.minX &&
  point.x <= bounds.maxX &&
  point.y >= bounds.minY &&
  point.y <= bounds.maxY;

const MIN_RESIZE_SIZE = 20;

const clampResizeDeltaValue = (value = 0, size = 0) => {
  const numericValue = Number(value) || 0;
  if (numericValue >= 0) {
    return numericValue;
  }
  if (!size || size <= MIN_RESIZE_SIZE) {
    return 0;
  }
  const minDelta = MIN_RESIZE_SIZE - size;
  return Math.max(numericValue, minDelta);
};

const createAssetId = () => {
  const uuid =
    typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : Math.random().toString(36).slice(2, 10);
  return `asset:${uuid}`;
};

const ImageExtendOverlay = ({
  containerRef,
  editorRef,
  selectionBounds,
  onCommit,
  highlight
}) => {
  const [dragState, setDragState] = useState(null);
  const dragStateRef = useRef(null);
  const dragRafRef = useRef(null);
  const lastPointerRef = useRef(null);

  useEffect(() => {
    dragStateRef.current = dragState;
  }, [dragState]);
  
  useEffect(() => {
    setDragState(null);
  }, [selectionBounds?.shapeId]);

  useEffect(() => {
    const MIN_EXTEND_DELTA = 1;

    const handleMove = (event) => {
      const currentDrag = dragStateRef.current;
      if (!currentDrag) return;
      event.preventDefault();
      lastPointerRef.current = { x: event.clientX, y: event.clientY };
      
      if (dragRafRef.current) return;
      dragRafRef.current = requestAnimationFrame(() => {
        dragRafRef.current = null;
        const editor = editorRef.current;
        if (!editor || !lastPointerRef.current) return;
        const dragSnapshot = dragStateRef.current;
        if (!dragSnapshot) return;

        const currentPage = editor.screenToPage({
          x: lastPointerRef.current.x,
          y: lastPointerRef.current.y
        });
        const deltaX = currentPage.x - dragSnapshot.startPage.x;
        const deltaY = currentPage.y - dragSnapshot.startPage.y;
        const baseExtend = dragSnapshot.extend || { top: 0, right: 0, bottom: 0, left: 0 };
        const updatedExtend = {
          ...baseExtend
        };
        let changed = false;

        switch (dragSnapshot.direction) {
          case 'left': {
            const extent = -deltaX;
            const clamped = clampResizeDeltaValue(extent, dragSnapshot.initialWidth);
            if (Math.abs(clamped - (baseExtend.left ?? 0)) > MIN_EXTEND_DELTA) {
              updatedExtend.left = clamped;
              changed = true;
            }
            break;
          }
          case 'right': {
            const extent = deltaX;
            const clamped = clampResizeDeltaValue(extent, dragSnapshot.initialWidth);
            if (Math.abs(clamped - (baseExtend.right ?? 0)) > MIN_EXTEND_DELTA) {
              updatedExtend.right = clamped;
              changed = true;
            }
            break;
          }
          case 'top': {
            const extent = -deltaY;
            const clamped = clampResizeDeltaValue(extent, dragSnapshot.initialHeight);
            if (Math.abs(clamped - (baseExtend.top ?? 0)) > MIN_EXTEND_DELTA) {
              updatedExtend.top = clamped;
              changed = true;
            }
            break;
          }
          case 'bottom': {
            const extent = deltaY;
            const clamped = clampResizeDeltaValue(extent, dragSnapshot.initialHeight);
            if (Math.abs(clamped - (baseExtend.bottom ?? 0)) > MIN_EXTEND_DELTA) {
              updatedExtend.bottom = clamped;
              changed = true;
            }
            break;
          }
          default:
            break;
        }

        if (changed) {
          setDragState(prev => (prev ? { ...prev, extend: updatedExtend } : prev));
        }
      });
    };

    const handleUp = (event) => {
      const currentDrag = dragStateRef.current;
      if (!currentDrag) return;
      event.preventDefault();
      if (dragRafRef.current) {
        cancelAnimationFrame(dragRafRef.current);
        dragRafRef.current = null;
      }
      const hasExtend =
        currentDrag.extend &&
        Object.values(currentDrag.extend).some(value => Math.abs(value) > 0.5);
      if (hasExtend) {
        onCommit?.(currentDrag.shapeId, currentDrag.extend);
      }
      dragStateRef.current = null;
      setDragState(null);
    };

    window.addEventListener('pointermove', handleMove, { passive: false });
    window.addEventListener('pointerup', handleUp, { passive: false });
    window.addEventListener('pointercancel', handleUp, { passive: false });

    return () => {
      if (dragRafRef.current) {
        cancelAnimationFrame(dragRafRef.current);
        dragRafRef.current = null;
      }
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
  }, [editorRef, onCommit]);

  const handlePointerDown = useCallback((direction, event) => {
    if (!selectionBounds || !editorRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    const editor = editorRef.current;
    const startPage = editor.screenToPage({ x: event.clientX, y: event.clientY });
    const pageBounds = selectionBounds.pageBounds || {};
    const initialWidth = pageBounds.width ?? pageBounds.w ?? 0;
    const initialHeight = pageBounds.height ?? pageBounds.h ?? 0;
    const nextState = {
      direction,
      startPage,
      extend: { top: 0, right: 0, bottom: 0, left: 0 },
      shapeId: selectionBounds.shapeId,
      initialWidth,
      initialHeight
    };
    dragStateRef.current = nextState;
    setDragState(nextState);
  }, [editorRef, selectionBounds]);

  const previewRect = useMemo(() => {
    if (!selectionBounds) return null;
    const pageBounds = selectionBounds.pageBounds;
    const widthRatio = pageBounds?.width ? selectionBounds.width / pageBounds.width : 1;
    const heightRatio = pageBounds?.height ? selectionBounds.height / pageBounds.height : 1;
    if (!dragState) {
      return {
        left: selectionBounds.left,
        top: selectionBounds.top,
        width: selectionBounds.width,
        height: selectionBounds.height
      };
    }
    return {
      left: selectionBounds.left - (dragState.extend.left * widthRatio),
      top: selectionBounds.top - (dragState.extend.top * heightRatio),
      width: selectionBounds.width + (dragState.extend.left + dragState.extend.right) * widthRatio,
      height: selectionBounds.height + (dragState.extend.top + dragState.extend.bottom) * heightRatio
    };
  }, [selectionBounds, dragState]);

  if (!selectionBounds || !previewRect || !containerRef.current) {
    return null;
  }

  const handleSize = 12;
  const handles = [
    {
      key: 'top',
      style: {
        left: selectionBounds.left + selectionBounds.width / 2 - handleSize / 2,
        top: selectionBounds.top - handleSize / 2
      },
      cursor: 'ns-resize'
    },
    {
      key: 'right',
      style: {
        left: selectionBounds.left + selectionBounds.width - handleSize / 2,
        top: selectionBounds.top + selectionBounds.height / 2 - handleSize / 2
      },
      cursor: 'ew-resize'
    },
    {
      key: 'bottom',
      style: {
        left: selectionBounds.left + selectionBounds.width / 2 - handleSize / 2,
        top: selectionBounds.top + selectionBounds.height - handleSize / 2
      },
      cursor: 'ns-resize'
    },
    {
      key: 'left',
      style: {
        left: selectionBounds.left - handleSize / 2,
        top: selectionBounds.top + selectionBounds.height / 2 - handleSize / 2
      },
      cursor: 'ew-resize'
    }
  ];
  
  return (
    <div className="absolute inset-0 pointer-events-none select-none z-[1000]">
      <div
        className={clsx(
          'absolute border-2 border-blue-400 bg-blue-200/10 pointer-events-none rounded transition-all',
          highlight && 'shadow-[0_0_0_6px_rgba(59,130,246,0.2)]'
        )}
        style={{
          left: previewRect.left,
          top: previewRect.top,
          width: previewRect.width,
          height: previewRect.height
        }}
      />
      {handles.map(handle => (
        <div
          key={handle.key}
          className="absolute bg-blue-500 border-2 border-white rounded-full pointer-events-auto hover:scale-125 transition-transform"
          style={{
            width: 14,
            height: 14,
            ...handle.style,
            cursor: handle.cursor
          }}
          onPointerDown={(event) => handlePointerDown(handle.key, event)}
        />
      ))}
    </div>
  );
};

const ImageActionBar = ({
  selectionBounds,
  fillMode,
  onFillModeChange,
  onStartSmear,
  onDownload,
  onExtendHint
}) => {
  if (!selectionBounds) return null;

  const buttonClass = (isPrimary) =>
    clsx(
      'inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition-colors',
      isPrimary ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' : 'text-gray-600 hover:bg-gray-100'
    );

  // 计算操作栏位置，确保在可视范围内
  const barWidth = 400; // 操作栏估计宽度
  const barLeft = Math.max(barWidth / 2, Math.min(
    selectionBounds.left + selectionBounds.width / 2,
    window.innerWidth - barWidth / 2 - 100
  ));
  const barTop = Math.max(80, selectionBounds.top - 72);

  return (
    <div className="absolute inset-0 pointer-events-none z-[9999]">
      <div
        className="pointer-events-auto flex items-center gap-2 bg-white border shadow-lg rounded-full px-3 py-2 absolute"
        style={{
          left: `${barLeft}px`,
          top: `${barTop}px`,
          transform: 'translateX(-50%)',
          willChange: 'transform'
        }}
      >
        <button
          className={buttonClass(true)}
          onClick={onExtendHint}
          type="button"
        >
          <Expand className="w-4 h-4" />
          扩展
        </button>
        <button
          className={buttonClass(true)}
          onClick={onStartSmear}
          type="button"
        >
          <Brush className="w-4 h-4" />
          涂抹
        </button>
        <div className="h-6 w-px bg-gray-200" />
        <div className="flex items-center gap-1 bg-gray-100 rounded-full px-2 py-1 text-xs text-gray-600">
          <span className="text-gray-500">填充</span>
          <button
            type="button"
          className={clsx(
              'px-2 py-0.5 rounded-full transition-colors',
              fillMode === 'white' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
            )}
            onClick={() => onFillModeChange?.('white')}
          >
            白色
        </button>
            <button
            type="button"
            className={clsx(
              'px-2 py-0.5 rounded-full transition-colors',
              fillMode === 'transparent' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
            )}
            onClick={() => onFillModeChange?.('transparent')}
          >
            透明
            </button>
          </div>
        <div className="h-6 w-px bg-gray-200" />
              <button
          className={buttonClass(false)}
          onClick={onDownload}
          type="button"
        >
          <Download className="w-4 h-4" />
          下载
              </button>
          </div>
        </div>
  );
};

const SelectionOverlay = ({
  containerRef,
  editorRef,
  session,
  setSession,
  viewportRevision,
  onApply,
  onCancel
}) => {
  const [displayStroke, setDisplayStroke] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(20);
  const [eraseMode, setEraseMode] = useState('erase'); // 'erase' 或 'inverse'
  const strokeRef = useRef([]);
  const canvasRef = useRef(null);
  const maskCanvasRef = useRef(null);
  const strokeFlushRafRef = useRef(null);
  const previewCanvasDisplayRef = useRef(null);
  const previewVisibleRef = useRef(false);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [maskImageUrl, setMaskImageUrl] = useState(null); // 蒙版图像

  const showPreview = useCallback(() => {
    if (!previewVisibleRef.current) {
      previewVisibleRef.current = true;
      setIsPreviewVisible(true);
    }
  }, []);

  const hidePreview = useCallback(() => {
    if (previewVisibleRef.current) {
      previewVisibleRef.current = false;
      setIsPreviewVisible(false);
    }
  }, []);

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

  const paintPreviewCanvas = useCallback(
    (customPainter, { forceShow = false } = {}) => {
      if (!bounds || !previewCanvasDisplayRef.current || !canvasRef.current) return;
      const displayCanvas = previewCanvasDisplayRef.current;
      const ctx = displayCanvas.getContext('2d');
      if (!ctx) return;
      const baseCanvas = canvasRef.current;
      ctx.clearRect(0, 0, displayCanvas.width, displayCanvas.height);
      ctx.drawImage(baseCanvas, 0, 0, displayCanvas.width, displayCanvas.height);
      if (typeof customPainter === 'function') {
        customPainter(ctx, displayCanvas.width, displayCanvas.height);
      }
      if (typeof customPainter === 'function' || forceShow) {
        showPreview();
      } else {
        hidePreview();
      }
    },
    [bounds, showPreview, hidePreview]
  );

  useEffect(() => {
    strokeRef.current = [];
    setDisplayStroke([]);
    setIsDrawing(false);
    if (!session) {
      hidePreview();
    }
  }, [session, hidePreview]);

  // 初始化画布用于实时预览
  useEffect(() => {
    if (!session || !editorRef.current || !bounds) return;
    
    const editor = editorRef.current;
    const shape = editor.getShape(session.shapeId);
    if (!shape || shape.type !== 'image') return;
    
    const assetId = shape.props?.assetId;
    if (!assetId) return;
    
    const asset = editor.getAsset(assetId);
    if (!asset || asset.type !== 'image' || !asset.props?.src) return;
    
    // 加载原始图像
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // 创建画布
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      canvasRef.current = canvas;
      
      // 创建蒙版画布
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = img.width;
      maskCanvas.height = img.height;
      maskCanvasRef.current = maskCanvas;
      
      // 设置初始预览
      paintPreviewCanvas();
    };
    img.src = asset.props.src;
    
    // 清理函数
    return () => undefined;
  }, [session, editorRef, bounds, paintPreviewCanvas]);

  useEffect(() => {
    if (!bounds || !canvasRef.current) return;
    paintPreviewCanvas();
  }, [bounds, paintPreviewCanvas]);

  const updateRealtimePreview = useCallback(
    (points) => {
      if (!session || !bounds) return;
      paintPreviewCanvas((ctx, width, height) => {
        if (!points.length) return;
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.globalCompositeOperation = 'source-over';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        const brushPx =
          brushSize *
          (width / (session.pageBounds.width || session.pageBounds.w || 1));
        ctx.lineWidth = brushPx * 2;
        ctx.beginPath();
        points.forEach((point, index) => {
          const x = point.x * width;
          const y = point.y * height;
          if (index === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        });
        ctx.stroke();
      });
      showPreview();
    },
    [session, bounds, brushSize, paintPreviewCanvas, showPreview]
  );

  useEffect(() => {
    if (!isDrawing || !session || !canvasRef.current || !maskCanvasRef.current) return;

    const scheduleStrokeFlush = () => {
      if (strokeFlushRafRef.current) return;
      strokeFlushRafRef.current = requestAnimationFrame(() => {
        strokeFlushRafRef.current = null;
        setDisplayStroke([...strokeRef.current]);
        updateRealtimePreview(strokeRef.current);
      });
    };

    const handleMove = (event) => {
      const editor = editorRef.current;
      if (!editor) return;
      const pagePoint = editor.screenToPage({ x: event.clientX, y: event.clientY });
      const normalized = normalizePointWithinBounds(pagePoint, session.pageBounds);
      strokeRef.current.push(normalized);
      scheduleStrokeFlush();
    };

    const handleUp = async (event) => {
      event.preventDefault();
      setIsDrawing(false);
      
      
      // 生成 mask 并自动保存到图层
      if (strokeRef.current.length > 2 && canvasRef.current) {
        const canvas = canvasRef.current;
        
        // 创建 mask canvas（黑白蒙版）
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = canvas.width;
        maskCanvas.height = canvas.height;
        const maskCtx = maskCanvas.getContext('2d');
        
        // 填充白色背景（未擦除区域）
        maskCtx.fillStyle = '#ffffff';
        maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
        
        // 绘制黑色涂抹路径（要擦除的区域）
        maskCtx.strokeStyle = '#000000';
        maskCtx.globalCompositeOperation = 'source-over';
        maskCtx.lineCap = 'round';
        maskCtx.lineJoin = 'round';
        
        const brushPx = brushSize * (canvas.width / (session.pageBounds.width || 1));
        maskCtx.lineWidth = brushPx * 2;
        
        if (strokeRef.current.length > 0) {
          maskCtx.beginPath();
          strokeRef.current.forEach((point, index) => {
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
        
        // 保存 mask 图像
        const maskDataUrl = maskCanvas.toDataURL('image/png');
        setMaskImageUrl(maskDataUrl);
        
        // 保存路径点用于更新 session
        const finalPoints = [...strokeRef.current];
        
        // 更新 displayStroke 确保显示
        setDisplayStroke(finalPoints);
        
        // 生成最终预览（保持黑色半透明路径显示）
        // 直接在这里生成预览，而不是调用 updateRealtimePreview
        const previewCanvas = document.createElement('canvas');
        previewCanvas.width = canvas.width;
        previewCanvas.height = canvas.height;
        const previewCtx = previewCanvas.getContext('2d');
        
        // 绘制当前图像
        previewCtx.drawImage(canvas, 0, 0);
        
        // 绘制黑色半透明涂抹轨迹
        previewCtx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        previewCtx.globalCompositeOperation = 'source-over';
        previewCtx.lineCap = 'round';
        previewCtx.lineJoin = 'round';
        
        // 重用之前计算的 brushPx
        previewCtx.lineWidth = brushPx * 2;
        
        if (finalPoints.length > 0) {
          previewCtx.beginPath();
          finalPoints.forEach((point, index) => {
            const x = point.x * canvas.width;
            const y = point.y * canvas.height;
            if (index === 0) {
              previewCtx.moveTo(x, y);
            } else {
              previewCtx.lineTo(x, y);
            }
          });
          previewCtx.stroke();
        }
        
        // 更新预览图像
        const finalPreviewUrl = previewCanvas.toDataURL('image/png');
        paintPreviewCanvas((ctx, width, height) => {
          ctx.drawImage(previewCanvas, 0, 0, width, height);
        });
        
        // 恢复原始图片透明度，并应用预览
        if (editorRef.current) {
          const editor = editorRef.current;
          const shape = editor.getShape(session.shapeId);
          if (shape) {
            // 1. 恢复透明度
            editor.updateShapes([{
              ...shape,
              opacity: 1
            }]);
            
            // 2. 创建新的资产并应用到 shape
            const assetId = `asset:${Date.now()}-preview`;
            editor.createAssets([{
              id: assetId,
              type: 'image',
              typeName: 'asset',
              props: {
                name: 'smear-preview.png',
                src: finalPreviewUrl,
                w: canvasRef.current.width,
                h: canvasRef.current.height,
                mimeType: 'image/png',
                isAnimated: false
              },
              meta: {}
            }]);
            
            // 3. 更新 shape 使用新资产
            editor.updateShapes([{
              ...shape,
              props: {
                ...shape.props,
                assetId: assetId
              }
            }]);
            
          }
        }
        
        // 更新 session 状态为 'ready'，显示操作按钮
        setSession(prev => ({
          ...prev,
          status: 'ready',
          points: finalPoints,
          maskDataUrl: maskDataUrl
        }));
        
        // 不要清空 strokeRef，保持预览显示
        // strokeRef.current = [];  ❌ 这会导致预览消失
      }
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);

    return () => {
      if (strokeFlushRafRef.current) {
        cancelAnimationFrame(strokeFlushRafRef.current);
        strokeFlushRafRef.current = null;
      }
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
  }, [editorRef, isDrawing, session, brushSize, eraseMode, onApply, updateRealtimePreview, paintPreviewCanvas]);

  const handlePointerDown = useCallback((event) => {
    if (!session || session.status === 'ready') return;
    event.preventDefault();
    event.stopPropagation();
    const editor = editorRef.current;
    if (!editor) return;
    const pagePoint = editor.screenToPage({ x: event.clientX, y: event.clientY });
    if (!isPointInsideBounds(pagePoint, session.pageBounds)) {
      return;
    }
    strokeRef.current = [normalizePointWithinBounds(pagePoint, session.pageBounds)];
    setDisplayStroke([...strokeRef.current]);
    setIsDrawing(true);
  }, [editorRef, session]);

  const previewPoints = useMemo(() => {
    if (!bounds) return null;
    const points = session?.status === 'ready' ? session.points : displayStroke;
    if (!points || points.length < 2) return null;
    return points.map(point => ({
      x: bounds.left + point.x * bounds.width,
      y: bounds.top + point.y * bounds.height
    }));
  }, [bounds, displayStroke, session]);

  if (!session || !bounds) {
    return null;
  }

  const pathData =
    previewPoints && previewPoints.length > 1
      ? previewPoints.reduce(
          (acc, point, index) => `${acc}${index === 0 ? 'M' : 'L'}${point.x} ${point.y} `,
          ''
        ) + (session.tool === 'lasso' && session.status === 'ready' ? 'Z' : '')
      : null;

  // 处理应用擦除/保留（同时自动保存 mask）
  const handleApply = useCallback(async (mode) => {
    if (session.status !== 'ready' || !onApply || !canvasRef.current || !maskImageUrl) return;
    
    hidePreview();
    
    const canvas = canvasRef.current;
    const editor = editorRef.current;
    if (!editor) return;
    
    const shape = editor.getShape(session.shapeId);
    if (!shape || !shape.props?.assetId) return;
    
    // 使用传入的 mode，而不是状态中的 eraseMode
    const currentMode = mode || eraseMode;
    
    // 1. 保留模式不生成蒙版，擦除模式才保存
    const shouldSaveMask = currentMode !== 'inverse';
    if (shouldSaveMask) {
      onApply('save-mask', brushSize, null, maskImageUrl);
    }
    
    // 2. 应用擦除/保留效果
    const maskImg = new window.Image();
    maskImg.crossOrigin = 'anonymous';
    maskImg.onload = async () => {
      // 创建结果画布
      const resultCanvas = document.createElement('canvas');
      resultCanvas.width = canvas.width;
      resultCanvas.height = canvas.height;
      const ctx = resultCanvas.getContext('2d');
      
      // 绘制原图
      ctx.drawImage(canvas, 0, 0);
      
      // 创建 alpha mask（黑色区域 = 选中区域）
      const alphaMask = document.createElement('canvas');
      alphaMask.width = canvas.width;
      alphaMask.height = canvas.height;
      const alphaMaskCtx = alphaMask.getContext('2d');
      
      // 加载 mask 图像（白色背景 + 黑色路径）
      alphaMaskCtx.drawImage(maskImg, 0, 0);
      
      // 将黑白 mask 转换为 alpha mask
      const imageData = alphaMaskCtx.getImageData(0, 0, alphaMask.width, alphaMask.height);
      const data = imageData.data;
      
      for (let i = 0; i < data.length; i += 4) {
        const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
        // 黑色(0) -> alpha=255 (不透明，选中区域)
        // 白色(255) -> alpha=0 (透明，未选中区域)
        const alpha = 255 - brightness;
        data[i] = 0;
        data[i + 1] = 0;
        data[i + 2] = 0;
        data[i + 3] = alpha;
      }
      
      alphaMaskCtx.putImageData(imageData, 0, 0);
      
      // 应用 mask
      if (currentMode === 'erase') {
        // 擦除模式：destination-out（移除 alpha 区域）
        ctx.globalCompositeOperation = 'destination-out';
        ctx.drawImage(alphaMask, 0, 0);
      } else {
        // 保留模式：destination-in（只保留 alpha 区域）
        ctx.globalCompositeOperation = 'destination-in';
        ctx.drawImage(alphaMask, 0, 0);
      }
      
      const finalImageUrl = resultCanvas.toDataURL('image/png');
      await onApply(currentMode, brushSize, finalImageUrl);
      
      // 更新 canvas 为应用后的结果
      canvasRef.current = resultCanvas;
    };
    maskImg.src = maskImageUrl;
  }, [session, eraseMode, brushSize, onApply, maskImageUrl, editorRef, hidePreview, showPreview]);

  // 处理保存为蒙版图层
  const handleSaveAsMask = useCallback(async () => {
    if (session.status !== 'ready' || !onApply || !maskImageUrl) return;
    
    // 调用 onApply 并传递 'save-mask' 模式和 mask 数据
    await onApply('save-mask', brushSize, null, session.maskDataUrl || maskImageUrl);
  }, [session, brushSize, onApply, maskImageUrl]);

  // 调试日志
  
  return (
    <>
      {/* 实时预览层 - 显示涂抹后的效果 */}
      {bounds && (
        <canvas
          ref={previewCanvasDisplayRef}
          className="absolute pointer-events-none transition-opacity duration-100"
          style={{
            left: `${bounds.left}px`,
            top: `${bounds.top}px`,
            width: `${bounds.width}px`,
            height: `${bounds.height}px`,
            zIndex: 998,
            opacity: isPreviewVisible ? 1 : 0
          }}
          width={Math.max(1, Math.round(bounds.width))}
          height={Math.max(1, Math.round(bounds.height))}
        />
      )}
      
      {/* 涂抹画布区域 - 只在绘制时可交互 */}
      {session.status !== 'ready' && (
        <div
          className="absolute inset-0 pointer-events-auto"
          style={{ 
            zIndex: 1000,
            cursor: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="${brushSize}" height="${brushSize}" viewBox="0 0 ${brushSize} ${brushSize}"><circle cx="${brushSize/2}" cy="${brushSize/2}" r="${brushSize/2}" fill="rgba(0,0,0,0.5)" stroke="black" stroke-width="2"/></svg>') ${brushSize/2} ${brushSize/2}, crosshair`
          }}
          onPointerDown={handlePointerDown}
        />
      )}

      {/* 涂抹工具控制栏 */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[9999] pointer-events-auto">
        <div className="flex items-center gap-3 bg-white/95 border shadow-xl rounded-full px-4 py-2">
          {/* 如果 status 为 'ready'，显示应用选项 */}
          {session.status === 'ready' ? (
            <>
              <span className="text-sm font-medium text-gray-700">选择操作：</span>
              
              <div className="h-6 w-px bg-gray-300" />
              
              {/* 保留按钮 */}
              <button
                type="button"
                className="px-4 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-md text-sm font-medium transition-colors"
                onClick={() => {
                  handleApply('inverse');
                }}
              >
                保留
                    </button>
              
              {/* 擦除按钮 */}
              <button
                type="button"
                className="px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-md text-sm font-medium transition-colors"
                onClick={() => {
                  handleApply('erase');
                }}
              >
                擦除
                    </button>
              
              <div className="h-6 w-px bg-gray-300" />
              
              {/* 取消按钮 */}
              <button
                type="button"
                className="px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white rounded-md text-sm transition-colors"
                onClick={() => {
                  if (onCancel) onCancel();
                }}
              >
                取消
              </button>
            </>
          ) : (
            <>
              {/* 绘制模式下的控制 */}
              {/* 笔刷大小 */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">笔刷:</span>
          <input
                  type="range"
                  min="5"
                  max="100"
                  value={brushSize}
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                  className="w-24"
                />
                <span className="text-xs font-medium text-gray-700 w-6">{brushSize}</span>
              </div>

              <div className="h-6 w-px bg-gray-300" />

              {/* 完成按钮 */}
          <button
                type="button"
                className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-xs transition-colors"
                onClick={() => {
                  if (onCancel) onCancel();
                }}
              >
                完成
          </button>
        </>
      )}
    </div>
      </div>
    </>
  );
};



// 主组件
const OuzhiArtPlatform = () => {
  // 项目状态
  const [projectName, setProjectName] = useState('未命名项目');
  const [isEditingName, setIsEditingName] = useState(false);
  
  // 生成器状态
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditorInitialized, setIsEditorInitialized] = useState(false);
  const [generatedImages, setGeneratedImages] = useState([]);
  // 用于跟踪生成过程中创建的图层ID，在所有图片添加完成后清除多选状态
  const generatedLayerIdsRef = useRef(new Set());
  // 跟踪当前正在轮询的 promptId，避免重复轮询
  const activePromptIdRef = useRef(null);
  // 保存当前轮询控制器，便于在发起新的生成任务时取消旧的轮询
  const pollControllerRef = useRef(null);
  // 用于保存最新的layers状态，避免闭包问题（先初始化为null，稍后更新）
  const layersRef = useRef(null);
  // 记录每个shape的原始图像和裁剪/扩展状态
  const imageCropStateRef = useRef(new Map());
  // 用于保存 assetId 到文件名的映射（用于图层命名）
  const assetFileNameMapRef = useRef(new Map());
  // 记录 assetId -> 图层ID 列表映射
  const assetLayerMapRef = useRef(new Map());
  
  // 画布状态
  const [activeTool, setActiveTool] = useState('select');
  const [zoomLevel, setZoomLevel] = useState(1);
  const containerRef = useRef(null);
  const editorRef = useRef(null);
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [fillColor, setFillColor] = useState('transparent');
  const [brushSize, setBrushSize] = useState(3);
  const [opacity, setOpacity] = useState(1);
  const [showAssistPanel, setShowAssistPanel] = useState(false);
  const [showServiceManager, setShowServiceManager] = useState(false);
  const [diffView, setDiffView] = useState(null);
  const [workflowParams, setWorkflowParams] = useState({});
  const [selectedWorkflowData, setSelectedWorkflowData] = useState(null);
  const [selectionSession, setSelectionSession] = useState(null);
  const [selectionAction, setSelectionAction] = useState(null);
  const [cropFillMode, setCropFillMode] = useState('white');
  const [selectedImageInfo, setSelectedImageInfo] = useState(null);
  const [viewportRevision, setViewportRevision] = useState(0);
  const [extendHighlight, setExtendHighlight] = useState(false);
  const extendHighlightTimeoutRef = useRef(null);
  
  // 边栏收起状态
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);
  const [isLayerPanelCollapsed, setIsLayerPanelCollapsed] = useState(false);
  
  // 系统状态
  const [points, setPoints] = useState(1280);
  const [memberStatus, setMemberStatus] = useState('高级会员');
  
  const triggerExtendHighlight = useCallback(() => {
    setExtendHighlight(true);
    if (extendHighlightTimeoutRef.current) {
      clearTimeout(extendHighlightTimeoutRef.current);
    }
    extendHighlightTimeoutRef.current = setTimeout(() => {
      setExtendHighlight(false);
    }, 1000);
  }, []);
  
  // 取消当前轮询（用于在用户发起新的生成时停止旧的轮询）
  const cancelActivePoll = useCallback(() => {
    if (pollControllerRef.current) {
      pollControllerRef.current.cancelled = true;
      pollControllerRef.current = null;
    }
    activePromptIdRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      if (extendHighlightTimeoutRef.current) {
        clearTimeout(extendHighlightTimeoutRef.current);
      }
    };
  }, []);
  
  // 使用增强的图层hook
  const { 
    layers, 
    activeLayerId, 
    layerGroups,
    masks,
    setLayers, 
    addLayer,
    deleteLayer,
    setActiveLayerId,
    toggleLayerVisibility,
    toggleLayerLock,
    renameLayer,
    setLayerOpacity,
    setLayerBlendMode,
    reorderLayer,
    createLayerGroup,
    deleteLayerGroup,
    renameLayerGroup,
    createMaskForLayer,
    updateMask,
    mergeMultipleLayers,
    splitLayer,
    duplicateLayer,
    cloneLayer,
    fuseLayers
  } = useEnhancedLayers([]);
  
  // 更新 layersRef，确保始终使用最新的 layers
  layersRef.current = layers;
  useEffect(() => {
    if (!isEditorInitialized || !editorRef.current) return;
    const editor = editorRef.current;

    const refreshSelection = () => {
      const selection = editor.getSelectedShapes().filter(shape => shape.type === 'image');
      if (selection.length === 1) {
        const shape = selection[0];
        const bounds = editor.getShapePageBounds(shape.id);
        if (bounds) {
          setSelectedImageInfo({ shapeId: shape.id, bounds });
          return;
        }
      }
      setSelectedImageInfo(null);
    };

    const unsubscribe = editor.store.listen((event) => {
      refreshSelection();
      const mutation = event.changes || {};
      const updated = mutation.updated || {};
      const cameraChanged = Object.values(updated).some(record => record.typeName === 'camera');
      if (cameraChanged) {
        setViewportRevision(prev => prev + 1);
      }
    });

    refreshSelection();

    return () => unsubscribe();
  }, [isEditorInitialized]);

  useEffect(() => {
    const handleResize = () => setViewportRevision(prev => prev + 1);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (selectionSession && selectionSession.layerId !== activeLayerId) {
      setSelectionSession(null);
    }
  }, [activeLayerId, selectionSession]);

  const selectionScreenBounds = useMemo(() => {
    if (!selectedImageInfo || !editorRef.current || !containerRef.current) return null;
    const editor = editorRef.current;
    const bounds = selectedImageInfo.bounds || editor.getShapePageBounds(selectedImageInfo.shapeId);
    if (!bounds) return null;
    const topLeft = editor.pageToScreen({ x: bounds.minX, y: bounds.minY });
    const bottomRight = editor.pageToScreen({ x: bounds.maxX, y: bounds.maxY });
    const containerRect = containerRef.current.getBoundingClientRect();
    return {
      shapeId: selectedImageInfo.shapeId,
      left: topLeft.x - containerRect.left,
      top: topLeft.y - containerRect.top,
      width: bottomRight.x - topLeft.x,
      height: bottomRight.y - topLeft.y,
      pageBounds: bounds
    };
  }, [selectedImageInfo, viewportRevision]);

  
  // 多选图层状态
  const [selectedLayerIds, setSelectedLayerIds] = useState(new Set());

  const getLayerShapeIds = useCallback((layer) => {
    if (!layer) return [];
    if (Array.isArray(layer.shapeIds) && layer.shapeIds.length > 0) {
      return layer.shapeIds;
    }
    if (Array.isArray(layer.objects) && layer.objects.length > 0) {
      return layer.objects.map(obj => obj.id).filter(Boolean);
    }
    return [];
  }, []);

  const getLayerIdByShapeId = useCallback((shapeId) => {
    if (!shapeId) return null;
    const targetLayer = layers.find(layer => {
      const shapeIds = getLayerShapeIds(layer);
      return shapeIds.includes(shapeId);
    });
    return targetLayer?.id || null;
  }, [layers, getLayerShapeIds]);
  
  // 使用图层历史hook
  const { 
    history, 
    currentIndex: historyIndex,
    save: saveLayerHistory,
    undo: undoHistory,
    redo: redoHistory,
    canUndo,
    canRedo
  } = useLayerHistory(50);
  
  // 生成不重复的图层名称（例如同名时追加 "(2)")
  const getUniqueLayerName = useCallback((baseName, excludeLayerId = null) => {
    if (!baseName) return baseName;

    const currentLayers = layersRef.current || layers;
    const existingNames = new Set(
      currentLayers
        .filter(layer => layer.id !== excludeLayerId)
        .map(layer => layer.name)
        .filter(Boolean)
    );

    if (!existingNames.has(baseName)) {
      return baseName;
    }

    let counter = 2;
    while (existingNames.has(`${baseName} (${counter})`)) {
      counter += 1;
    }

    return `${baseName} (${counter})`;
  }, [layers]);
  
  // 统一更新使用同一 asset 的图层名称（生成文件名 (2)/(3) ...）
  const updateLayerNamesForAsset = useCallback((assetId, baseName) => {
    if (!assetId || !baseName) return;
    const currentLayers = layersRef.current || [];
    const editor = editorRef.current;
    if (!editor) return;

    // 先根据映射获取关联图层ID
    let relatedLayerIds = assetLayerMapRef.current.get(assetId);
    if (relatedLayerIds && relatedLayerIds.length > 0) {
      relatedLayerIds = relatedLayerIds.filter(id => currentLayers.some(layer => layer.id === id));
      assetLayerMapRef.current.set(assetId, relatedLayerIds);
    }

    let relatedLayers = [];
    if (relatedLayerIds && relatedLayerIds.length > 0) {
      relatedLayers = relatedLayerIds
        .map(layerId => currentLayers.find(layer => layer.id === layerId))
        .filter(Boolean);
    }

    // 如果映射中还没有，退回到遍历匹配 assetId
    if (relatedLayers.length === 0) {
      relatedLayers = currentLayers
        .filter(layer => Array.isArray(layer.shapeIds) && layer.shapeIds.length > 0)
        .filter(layer => {
          return layer.shapeIds.some(shapeId => {
            try {
              const shape = editor.getShape(shapeId);
              return shape?.props?.assetId === assetId;
            } catch {
              return false;
            }
          });
        });

      if (relatedLayers.length > 0) {
        assetLayerMapRef.current.set(assetId, relatedLayers.map(layer => layer.id));
      }
    }

    if (relatedLayers.length === 0) {
      return;
    }

    relatedLayers.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeA - timeB;
    });

    relatedLayers.forEach((layer, index) => {
      const numberedName = index === 0 ? baseName : `${baseName} (${index + 1})`;
      const uniqueName = getUniqueLayerName(numberedName, layer.id);
      if (layer.name !== uniqueName) {
        logger.debug('[updateLayerNamesForAsset] 更新图层名称:', {
          layerId: layer.id,
          oldName: layer.name,
          newName: uniqueName,
          index
        });
        renameLayer(layer.id, uniqueName);
      }
    });
  }, [getUniqueLayerName, renameLayer]);
  
  // 对象添加处理 - 为每个内容创建独立图层（像PS一样）
  const handleObjectAdded = useCallback((obj) => {
    logger.debug('Object added:', obj);
    logger.debug('Object data:', obj.data);
    logger.debug('ImageData:', obj.data?.imageData);
    
    const objectData = {
      id: obj.id,
      type: obj.type,
      data: obj,
      timestamp: Date.now()
    };
    
    const assetId = obj.data?.props?.assetId;
    // 判断是否是生成的图片（更准确的判断）
    // 生成的图片应该满足以下条件之一：
    // 1. imageData 存在且有 filename 属性（ComfyUI 输出格式）
    // 2. imageUrl 包含 /api/comfy/view（ComfyUI 生成的图片URL）
    const isGeneratedImage = (obj.data?.imageData && typeof obj.data.imageData === 'object' && obj.data.imageData.filename) ||
                              (obj.data?.imageUrl && typeof obj.data.imageUrl === 'string' && obj.data.imageUrl.includes('/api/comfy/view'));
    
    // 为每个内容创建独立图层
    let layerName = '';
    if (isGeneratedImage && obj.data?.imageData?.filename) {
      // 生成的图片，使用文件名
      const fileBaseName = obj.data.imageData.filename;
      const baseName = `生成图片 ${fileBaseName}`;
      layerName = getUniqueLayerName(baseName);
      if (assetId) {
        setTimeout(() => updateLayerNamesForAsset(assetId, fileBaseName), 0);
      }
    } else if (obj.type === 'image') {
      // 普通图片图层，尝试从多个来源提取文件名
      let fileName = null;
      
      logger.debug(`[图层创建] 尝试提取文件名，obj.data:`, obj.data);
      logger.debug(`[图层创建] obj.data.props:`, obj.data?.props);
      
      // 1. 首先检查文件名映射（如果之前保存过）
      if (assetId && assetFileNameMapRef.current.has(assetId)) {
        fileName = assetFileNameMapRef.current.get(assetId);
        logger.debug(`[图层创建] 从文件名映射获取:`, fileName);
      }
      
      // 2. 尝试从 asset 中获取文件名（立即尝试，不等待延迟）
      if (!fileName && assetId && editorRef.current) {
        try {
          let asset = null;
          // 先尝试从映射中获取（如果之前已经保存过）
          if (assetFileNameMapRef.current.has(assetId)) {
            fileName = assetFileNameMapRef.current.get(assetId);
          } else {
            // 尝试从 store 中获取 asset
            if (editorRef.current.getAsset) {
              asset = editorRef.current.getAsset(assetId);
              logger.debug(`[图层创建] 通过 getAsset 获取 asset:`, asset);
            } else if (editorRef.current.store) {
              const store = editorRef.current.store;
              if (store.get) {
                asset = store.get(assetId);
              } else if (store.queryRecords) {
                const records = store.queryRecords('asset', () => true);
                asset = records.find(r => r.id === assetId);
              }
              logger.debug(`[图层创建] 通过 store 获取 asset:`, asset);
            }
            
            if (asset) {
              // 检查 asset 的所有可能属性
              const assetDebugInfo = {
                id: asset.id,
                type: asset.type,
                typeName: asset.typeName,
                props: asset.props,
                meta: asset.meta
              };
              logger.debug(`[图层创建] asset 完整结构:`, assetDebugInfo);
              
              // 优先使用 asset.props.name（tldraw 可能保存文件名）
              if (asset.props?.name) {
                fileName = asset.props.name;
                logger.debug(`[图层创建] 从 asset.props.name 获取文件名:`, fileName);
                // 保存到映射中，以便后续使用
                assetFileNameMapRef.current.set(assetId, fileName);
              }
              // 其次尝试从 asset.props.src 中提取
              else if (asset.props?.src) {
                const url = asset.props.src;
                logger.debug(`[图层创建] 从 asset.props.src 提取文件名:`, url);
                // 尝试多种 URL 格式
                const patterns = [
                  /\/([^\/\?]+)\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?|$)/i,  // 标准文件扩展名
                  /\/([^\/\?]+)(\?|$)/,  // 任何文件名
                  /filename=([^&]+)/,  // 查询参数中的 filename
                ];
                
                for (const pattern of patterns) {
                  const match = url.match(pattern);
                  if (match) {
                    fileName = decodeURIComponent(match[1]);
                    logger.debug(`[图层创建] 匹配到文件名:`, fileName);
                    // 保存到映射中
                    assetFileNameMapRef.current.set(assetId, fileName);
                    break;
                  }
                }
              }
              // 检查 asset.meta 中是否有文件名
              if (!fileName && asset.meta?.name) {
                fileName = asset.meta.name;
                logger.debug(`[图层创建] 从 asset.meta.name 获取文件名:`, fileName);
                // 保存到映射中
                assetFileNameMapRef.current.set(assetId, fileName);
              }
            }
          }
        } catch (error) {
          logger.warn(`[图层创建] 无法从 asset 获取文件名:`, error);
        }
      }
      
      // 3. 如果 asset 中没有，尝试从 shape.props.src 中提取
      if (!fileName && obj.data?.props?.src) {
        const url = obj.data.props.src;
        logger.debug(`[图层创建] 从 shape.props.src 提取文件名:`, url);
        const patterns = [
          /\/([^\/\?]+)\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?|$)/i,
          /\/([^\/\?]+)(\?|$)/,
          /filename=([^&]+)/,
        ];
        
        for (const pattern of patterns) {
          const match = url.match(pattern);
          if (match) {
            fileName = decodeURIComponent(match[1]);
            logger.debug(`[图层创建] 从 shape.props.src 匹配到文件名:`, fileName);
            break;
          }
        }
      }
      
      // 4. 如果还是没有，尝试从 imageUrl 中提取
      if (!fileName && obj.data?.imageUrl) {
        const url = obj.data.imageUrl;
        logger.debug(`[图层创建] 从 imageUrl 提取文件名:`, url);
        const patterns = [
          /\/([^\/\?]+)\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?|$)/i,
          /\/([^\/\?]+)(\?|$)/,
          /filename=([^&]+)/,
        ];
        
        for (const pattern of patterns) {
          const match = url.match(pattern);
          if (match) {
            fileName = decodeURIComponent(match[1]);
            logger.debug(`[图层创建] 从 imageUrl 匹配到文件名:`, fileName);
            break;
          }
        }
      }
      
      // 5. 如果提取到了文件名，使用文件名；否则使用默认命名
      if (fileName) {
        // 移除可能的查询参数和哈希，保留文件扩展名
        fileName = fileName.split('?')[0].split('#')[0];
        // 确保文件名不为空且不是纯数字（避免与"图层 1"格式冲突）
        if (fileName && !/^\d+$/.test(fileName)) {
          layerName = getUniqueLayerName(fileName);
          logger.debug(`[图层创建] 使用提取的文件名:`, layerName);
        } else {
          layerName = '';
          logger.debug(`[图层创建] 文件名无效，使用默认命名`);
        }
      } else {
        // 如果找不到文件名但有 assetId，延迟检查（asset 监听器可能稍后才保存映射）
        if (assetId) {
          logger.debug(`[图层创建] 未找到文件名，但有 assetId，延迟检查:`, assetId);
          // 延迟检查映射和 asset（asset 监听器可能在 shape 创建之后才触发）
          setTimeout(() => {
            let delayedFileName = null;
            
            // 再次检查映射
            if (assetFileNameMapRef.current.has(assetId)) {
              delayedFileName = assetFileNameMapRef.current.get(assetId);
            }
            
            // 如果映射中还没有，直接查询 asset
            if (!delayedFileName && editorRef.current) {
              try {
                let asset = null;
                if (editorRef.current.getAsset) {
                  asset = editorRef.current.getAsset(assetId);
                } else if (editorRef.current.store) {
                  const store = editorRef.current.store;
                  if (store.get) {
                    asset = store.get(assetId);
                  } else if (store.queryRecords) {
                    const records = store.queryRecords('asset', () => true);
                    asset = records.find(r => r.id === assetId);
                  }
                }
                
                if (asset) {
                  if (asset.props?.name) {
                    delayedFileName = asset.props.name;
                  } else if (asset.props?.src) {
                    const url = asset.props.src;
                    const patterns = [
                      /\/([^\/\?]+)\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?|$)/i,
                      /\/([^\/\?]+)(\?|$)/,
                      /filename=([^&]+)/,
                    ];
                    for (const pattern of patterns) {
                      const match = url.match(pattern);
                      if (match) {
                        delayedFileName = decodeURIComponent(match[1]);
                        break;
                      }
                    }
                  }
                  
                  if (delayedFileName) {
                    delayedFileName = delayedFileName.split('?')[0].split('#')[0];
                    assetFileNameMapRef.current.set(assetId, delayedFileName);
                    updateLayerNamesForAsset(assetId, delayedFileName);
                  }
                }
              } catch (error) {
                logger.warn(`[图层创建] 延迟检查 asset 失败:`, error);
              }
            }
            
            // 如果找到了文件名，更新图层名称
            if (delayedFileName && !/^\d+$/.test(delayedFileName)) {
              updateLayerNamesForAsset(assetId, delayedFileName);
            } else {
            }
          }, 500); // 延迟 500ms，等待 asset 监听器处理（同时上传多个文件时需要更长时间）
        }
        
        // 使用默认命名（addLayer 会自动处理递增编号）
        layerName = '';
        logger.debug(`[图层创建] 未提取到文件名，使用默认命名`);
      }
    } else {
      // 其他类型的图层，使用默认命名（addLayer 会自动处理递增编号）
      layerName = ''; // 空字符串，让 addLayer 使用默认命名
    }
    
    logger.debug(`[图层创建] 类型: ${isGeneratedImage ? '生成图片' : obj.type === 'image' ? '上传图片' : obj.type}, 名称: ${layerName || '(使用默认命名)'}`);
    
    const newLayer = addLayer({
      name: layerName,
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'normal',
      objects: [objectData],
      // 存储shape ID用于同步可见性
      shapeIds: [obj.id]
    });
    
    logger.debug('Created new layer for object:', newLayer.id, 'object:', objectData);
    
    // 记录 asset 与图层的映射
    if (assetId) {
      const layerIds = assetLayerMapRef.current.get(assetId) || [];
      if (!layerIds.includes(newLayer.id)) {
        assetLayerMapRef.current.set(assetId, [...layerIds, newLayer.id]);
      }
      // 如果已经拿到文件名，立刻尝试命名（延迟一点确保图层已创建）
      const knownName = assetFileNameMapRef.current.get(assetId);
      if (knownName) {
        setTimeout(() => {
          updateLayerNamesForAsset(assetId, knownName);
        }, 50);
      } else {
        // 即使没有文件名，也延迟检查一次（asset 监听器可能稍后才保存）
        setTimeout(() => {
          const delayedKnownName = assetFileNameMapRef.current.get(assetId);
          if (delayedKnownName) {
            updateLayerNamesForAsset(assetId, delayedKnownName);
          }
        }, 600);
      }
    }
    
    // 激活新创建的图层
    setActiveLayerId(newLayer.id);
    
    if (isGeneratedImage) {
      // 记录生成过程中创建的图层ID
      generatedLayerIdsRef.current.add(newLayer.id);
      
      // 如果是生成过程中的图片，不立即设置选中状态
      // 等待所有图片添加完成后，在 useEffect 中统一处理
      logger.debug(`[生成图片] 记录图层 ${newLayer.id}，等待所有图片添加完成`);
    } else {
      // 非生成图片，立即选中
      setSelectedLayerIds(new Set([newLayer.id]));
    }
  }, [addLayer, setActiveLayerId, renameLayer, getUniqueLayerName, updateLayerNamesForAsset]);
  
  // 用于防止循环更新的 ref
  const isSyncingZIndexRef = useRef(false);
  
  // 图层重排序处理函数（需要在handleObjectModified之前定义）
  const handleLayerReorder = useCallback((layerId, newIndex) => {
    reorderLayer(layerId, newIndex);
  }, [reorderLayer]);
  
  // 对象修改处理 - 检测z-index变化并同步到图层排序
  const handleObjectModified = useCallback((objs) => {
    if (!editorRef.current || !objs || objs.length === 0) return;
    if (isSyncingZIndexRef.current) return; // 防止循环更新
    
    logger.debug('Objects modified:', objs);
    
    // 获取所有shape的当前z-index顺序
    const allShapes = editorRef.current.getCurrentPageShapes();
    
    // 按z-index排序（从下到上）
    const sortedShapes = [...allShapes].sort((a, b) => {
      // tldraw中shape的index属性表示z-index
      const indexA = allShapes.indexOf(a);
      const indexB = allShapes.indexOf(b);
      return indexA - indexB;
    });
    
    // 检查是否有shape的z-index发生了变化
    let hasZIndexChange = false;
    const layerShapeMap = new Map(); // 图层ID -> shape数组
    
    sortedShapes.forEach((shape, index) => {
      // 找到包含该shape的图层
      const layer = layers.find(l => {
        const shapeIds = l.shapeIds || l.objects?.map(obj => obj.id) || [];
        return shapeIds.includes(shape.id);
      });
      
      if (layer) {
        if (!layerShapeMap.has(layer.id)) {
          layerShapeMap.set(layer.id, []);
        }
        layerShapeMap.get(layer.id).push({ shape, index });
      }
    });
    
    // 根据shape的z-index顺序，计算图层的目标顺序
    const layerOrder = [];
    const processedLayers = new Set();
    
    sortedShapes.forEach((shape) => {
      const layer = layers.find(l => {
        const shapeIds = l.shapeIds || l.objects?.map(obj => obj.id) || [];
        return shapeIds.includes(shape.id);
      });
      
      if (layer && !processedLayers.has(layer.id)) {
        layerOrder.push(layer.id);
        processedLayers.add(layer.id);
      }
    });
    
    // 检查图层顺序是否需要更新
    const currentOrder = layers
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map(l => l.id);
    
    if (layerOrder.length > 0 && JSON.stringify(layerOrder) !== JSON.stringify(currentOrder)) {
      logger.debug('[画布排序] 检测到z-index变化，更新图层顺序:', layerOrder);
      isSyncingZIndexRef.current = true;
      
      // 更新图层顺序
      layerOrder.forEach((layerId, newIndex) => {
        const currentIndex = layers.findIndex(l => l.id === layerId);
        if (currentIndex !== -1 && currentIndex !== newIndex) {
          handleLayerReorder(layerId, newIndex);
        }
      });
      
      // 延迟重置标志，避免立即触发同步
      setTimeout(() => {
        isSyncingZIndexRef.current = false;
      }, 100);
    }
  }, [layers, handleLayerReorder]);
  
  // 对象删除处理 - 同步删除对应的图层
  const handleObjectDeleted = useCallback((shapeId) => {
    logger.debug('Object deleted:', shapeId);
    imageCropStateRef.current.delete(shapeId);
    
    const layerToDelete = layers.find(layer => {
      const hasInShapeIds = layer.shapeIds && layer.shapeIds.includes(shapeId);
      const hasInObjects = layer.objects && layer.objects.some(obj => obj.id === shapeId);
      return hasInShapeIds || hasInObjects;
    });
    
    if (layerToDelete) {
      logger.debug('Deleting layer:', layerToDelete.id, 'for shape:', shapeId);
      deleteLayer(layerToDelete.id);
    } else {
      // 可能是临时 shape（如多选框等），无需警告
      logger.debug('Deleted shape not bound to any layer, ignoring:', shapeId);
    }
  }, [layers, deleteLayer]);
  
  // 生成器功能 - 运行应用
  const handleGenerate = async (appId, uiInputs, pollTimeoutSeconds = 120) => {
    if (!appId || !uiInputs) return;
    
    // 每次开始新的生成前，先取消上一次的轮询，避免并发请求导致 429
    cancelActivePoll();
    
    setIsGenerating(true);
    setGeneratedImages([]); // 清空之前的图片
    
    try {
      // 调用应用运行接口
      const response = await api.post(`/comfy/apps/${appId}/run`, { uiInputs });
      const result = response.data?.data;
      
      logger.debug('应用运行结果:', result);
      
      // 如果有 prompt_id，需要轮询获取结果
      const promptId = result?.prompt_id || result?.promptId;
      
      if (promptId) {
        const controller = { cancelled: false, promptId };
        pollControllerRef.current = controller;
        activePromptIdRef.current = promptId;
        
        // 轮询获取结果
        const pollResult = async (currentController) => {
          const basePollInterval = 2000; // 基础轮询间隔：2秒
          // 根据用户配置的超时时间计算最大轮询次数
          const maxAttempts = Math.floor(pollTimeoutSeconds / (basePollInterval / 1000)); // 转换为次数
          const serverErrorInterval = 5000; // 服务器错误时的轮询间隔：5秒
          const rateLimitInterval = 10000; // 429速率限制时的轮询间隔：10秒
          const maxConsecutiveErrors = 5; // 最大连续错误次数
          const maxConsecutiveRateLimits = 10; // 最大连续速率限制次数（429不算严重错误）
          
          logger.info(`[轮询] 开始轮询，超时时间: ${pollTimeoutSeconds}秒，最大尝试次数: ${maxAttempts}`);
          
          const finalizePoll = () => {
            if (activePromptIdRef.current === promptId) {
              activePromptIdRef.current = null;
            }
            if (pollControllerRef.current === currentController) {
              pollControllerRef.current = null;
            }
          };
          
          let consecutiveErrors = 0; // 连续错误计数（不包括429）
          let consecutiveRateLimits = 0; // 连续速率限制计数
          let lastErrorStatus = null; // 最后一次错误的状态码
          let currentPollInterval = basePollInterval; // 当前轮询间隔
          
          for (let attempt = 0; attempt < maxAttempts; attempt++) {
            if (currentController?.cancelled || activePromptIdRef.current !== promptId) {
              logger.info(`[轮询] promptId ${promptId} 已被取消或被新任务替换，停止轮询`);
              finalizePoll();
              return;
            }
            
            try {
              // 根据错误情况调整轮询间隔
              // 注意：429错误在catch块中已经等待，所以这里需要判断是否需要等待
              let shouldWait = true;
              
              if (lastErrorStatus === 429) {
                // 429错误已在catch块中等待，跳过本次等待
                shouldWait = false;
                lastErrorStatus = null; // 重置状态
              } else if (lastErrorStatus && [502, 503, 504].includes(lastErrorStatus)) {
                currentPollInterval = serverErrorInterval;
              } else {
                currentPollInterval = basePollInterval;
              }
              
              // 只在需要时等待（429错误已在catch块中等待）
              if (shouldWait && attempt > 0) {
                await new Promise(resolve => setTimeout(resolve, currentPollInterval));
              }
              
              // 每10次轮询显示一次进度提示
              if (attempt > 0 && attempt % 10 === 0) {
                const elapsedSeconds = Math.floor(attempt * basePollInterval / 1000);
                logger.info(`[轮询] 已等待 ${elapsedSeconds} 秒，继续等待结果...`);
              }
              
              logger.debug(`[轮询] 尝试 ${attempt + 1}/${maxAttempts}, promptId: ${promptId}`);
              const historyResponse = await api.get(`/comfy/history/${promptId}`, {
                // 禁用304缓存，强制获取最新数据
                headers: {
                  'Cache-Control': 'no-cache',
                  'Pragma': 'no-cache'
                },
                // 增加超时时间，避免在服务器繁忙时过早超时
                timeout: 10000
              });
              
              // 成功请求，重置错误计数
              consecutiveErrors = 0;
              lastErrorStatus = null;
              
              logger.debug(`[轮询] 响应状态: ${historyResponse.status}, 完整响应:`, historyResponse);
              logger.debug(`[轮询] 响应数据:`, JSON.stringify(historyResponse.data, null, 2));
              
              // 处理不同的响应格式
              // ComfyUI history 直接返回: { promptId: { outputs: {...} } }
              // 后端可能包装为: { data: { promptId: { outputs: {...} } } }
              let historyData = historyResponse.data;
              
              // 如果后端包装在 data 中，提取出来
              if (historyData && typeof historyData === 'object' && 'data' in historyData && !historyData[promptId]) {
                historyData = historyData.data;
              }
              
              // 检查是否是空对象或无效数据
              if (!historyData || (typeof historyData === 'object' && Object.keys(historyData).length === 0)) {
                logger.debug(`[轮询] 尝试 ${attempt + 1}: 无数据或空响应，继续轮询...`);
                continue;
              }
              
              // 检查是否有该promptId的数据
              const promptData = historyData[promptId];
              
              if (!promptData) {
                logger.debug(`[轮询] 尝试 ${attempt + 1}: promptId ${promptId} 不在历史中，继续轮询...`);
                continue;
              }
              
              logger.debug(`[轮询] 找到 prompt 数据:`, promptData);
              logger.debug(`[轮询] promptData 的键:`, Object.keys(promptData));
              logger.debug(`[轮询] promptData 完整内容:`, JSON.stringify(promptData, null, 2));
              
              // 检查状态，如果已完成但没有输出，可能是格式问题
              if (promptData.status === 'success' || promptData.status === 'completed') {
                logger.debug(`[轮询] 任务已完成，状态: ${promptData.status}`);
              }
              
              const promptOutputs = promptData.outputs;
              
              if (!promptOutputs) {
                logger.debug(`[轮询] 尝试 ${attempt + 1}: 无输出数据，继续轮询...`);
                // 如果任务已完成但没有输出，可能是格式问题，尝试其他方式
                if (promptData.status === 'success' || promptData.status === 'completed') {
                  logger.debug(`[轮询] 任务已完成但无 outputs，尝试检查其他字段...`);
                  // 尝试从其他字段获取图片信息
                  if (promptData.images && Array.isArray(promptData.images)) {
                    logger.debug(`[轮询] 在 promptData.images 中找到图片:`, promptData.images);
                    const imageOutputs = promptData.images;
                    if (imageOutputs.length > 0) {
                      logger.info(`[轮询] 成功！从 promptData.images 设置生成图片:`, imageOutputs);
                      generatedLayerIdsRef.current.clear();
                      setGeneratedImages(imageOutputs);
                      setIsGenerating(false);
                      setSelectedLayerIds(new Set());
                      // 注意：清空上传组件的值应该在 GeneratorPanel 中处理
                      finalizePoll();
                      return; // 成功获取结果，停止轮询
                    }
                  }
                }
                continue;
              }
              
              logger.debug(`[轮询] 找到输出数据:`, promptOutputs);
              logger.debug(`[轮询] outputs 的键:`, Object.keys(promptOutputs));
              
              // 提取所有图片
              const imageOutputs = [];
              
              // 遍历所有输出节点
              Object.entries(promptOutputs).forEach(([nodeId, output]) => {
                logger.debug(`[轮询] 检查节点 ${nodeId} 的输出:`, output);
                logger.debug(`[轮询] 节点 ${nodeId} 输出的键:`, Object.keys(output || {}));
                
                if (output && output.images && Array.isArray(output.images)) {
                  output.images.forEach(img => {
                    logger.debug(`[轮询] 找到图片:`, img);
                    imageOutputs.push(img);
                  });
                } else if (output && typeof output === 'object') {
                  // 尝试其他可能的格式
                  // 有些情况下图片可能在 output 的直接属性中
                  Object.entries(output).forEach(([key, value]) => {
                    if (key === 'images' && Array.isArray(value)) {
                      value.forEach(img => {
                        logger.debug(`[轮询] 在 ${key} 中找到图片:`, img);
                        imageOutputs.push(img);
                      });
                    }
                  });
                }
              });
              
              logger.debug(`[轮询] 提取到 ${imageOutputs.length} 张图片`);
              
              if (imageOutputs.length > 0) {
                logger.info(`[轮询] 成功！设置生成图片:`, imageOutputs);
                // 清空之前记录的图层ID
                generatedLayerIdsRef.current.clear();
                setGeneratedImages(imageOutputs);
                setIsGenerating(false);
                // 立即清除多选状态，避免画布选择监听器触发多选
                setSelectedLayerIds(new Set());
                // 注意：清空上传组件的值应该在 GeneratorPanel 中处理
                // 这里只负责设置生成结果和停止轮询
                // 注意：不在这里清除多选状态，因为图片添加是异步的
                // 会在所有图片添加完成后的 useEffect 中处理
                finalizePoll();
                return; // 成功获取结果，停止轮询
              }
              
              logger.debug(`[轮询] 尝试 ${attempt + 1}: 暂无图片输出，继续轮询...`);
            } catch (error) {
              const status = error.response?.status;
              const isServerError = status && [502, 503, 504].includes(status);
              const isNotFound = status === 404;
              const isRateLimit = status === 429;
              
              lastErrorStatus = status;
              
              if (isNotFound) {
                // 404 是正常的，说明任务还没完成，继续轮询
                logger.debug(`[轮询] promptId ${promptId} 尚未存在，继续轮询...`);
                consecutiveErrors = 0; // 404 不算错误
                consecutiveRateLimits = 0; // 重置速率限制计数
                continue;
              } else if (isRateLimit) {
                // 429 速率限制：增加延迟，使用指数退避
                consecutiveRateLimits++;
                consecutiveErrors = 0; // 429不算严重错误，重置错误计数
                
                const retryAfterHeader = Number(error.response?.headers?.['retry-after']);
                const retryAfterMs = Number.isFinite(retryAfterHeader) && retryAfterHeader > 0 
                  ? retryAfterHeader * 1000 
                  : null;
                const backoffInterval = retryAfterMs 
                  ?? Math.min(rateLimitInterval * Math.pow(1.5, consecutiveRateLimits - 1), 30000);
                
                logger.warn(
                  `[轮询] 尝试 ${attempt + 1} 遇到速率限制 (429)，将在 ${Math.round(backoffInterval/1000)} 秒后重试... (连续 ${consecutiveRateLimits} 次)` +
                  (retryAfterMs ? '（遵循 Retry-After）' : '')
                );
                
                // 如果连续多次遇到速率限制，增加延迟但继续尝试
                if (consecutiveRateLimits >= maxConsecutiveRateLimits) {
                  logger.warn(`[轮询] 连续 ${consecutiveRateLimits} 次遇到速率限制，使用最大延迟 ${30000/1000} 秒`);
                }
                
                // 等待更长时间后再继续
                await new Promise(resolve => setTimeout(resolve, backoffInterval));
                continue;
              } else if (isServerError) {
                // 服务器错误（502/503/504），可能是服务器繁忙，增加延迟后继续
                consecutiveErrors++;
                consecutiveRateLimits = 0; // 重置速率限制计数
                
                logger.warn(`[轮询] 尝试 ${attempt + 1} 遇到服务器错误 ${status}，可能是服务器繁忙，将在 ${serverErrorInterval/1000} 秒后重试...`);
                
                // 如果连续多次遇到服务器错误，提前终止
                if (consecutiveErrors >= maxConsecutiveErrors) {
                  logger.error(`[轮询] 连续 ${consecutiveErrors} 次遇到服务器错误，提前终止轮询`);
                  setIsGenerating(false);
                  errorHandler.showWarning(`服务器繁忙（错误 ${status}），请稍后重试或查看历史记录`);
                  finalizePoll();
                  return;
                }
                continue;
              } else {
                // 其他错误
                consecutiveErrors++;
                consecutiveRateLimits = 0; // 重置速率限制计数
                
                logger.error(`[轮询] 尝试 ${attempt + 1} 失败:`, error);
                
                // 如果连续多次遇到错误，提前终止
                if (consecutiveErrors >= maxConsecutiveErrors) {
                  logger.error(`[轮询] 连续 ${consecutiveErrors} 次遇到错误，提前终止轮询`);
                  setIsGenerating(false);
                  errorHandler.showWarning('获取生成结果时遇到错误，请稍后查看历史记录');
                  finalizePoll();
                  return;
                }
                continue;
              }
            }
          }
          
          // 超时
          const totalWaitTime = Math.floor(maxAttempts * basePollInterval / 1000);
          logger.error(`[轮询] 超时：已尝试 ${maxAttempts} 次（约 ${totalWaitTime} 秒），仍未获取到结果`);
          logger.error(`[轮询] promptId: ${promptId}`);
          setIsGenerating(false);
          errorHandler.showWarning(`获取生成结果超时（已等待 ${totalWaitTime} 秒），任务可能仍在处理中，请稍后查看历史记录或刷新页面`);
          finalizePoll();
        };
        
        pollResult(controller);
      } else if (result && result.outputs) {
        // 如果有直接输出，立即使用
        const imageOutputs = [];
        Object.values(result.outputs).forEach(output => {
          if (output.images && Array.isArray(output.images)) {
            output.images.forEach(img => {
              imageOutputs.push(img);
            });
          }
        });
        
        if (imageOutputs.length > 0) {
          // 清空之前记录的图层ID
          generatedLayerIdsRef.current.clear();
          setGeneratedImages(imageOutputs);
          // 立即清除多选状态，避免画布选择监听器触发多选
          setSelectedLayerIds(new Set());
          // 注意：清空上传组件的值应该在 GeneratorPanel 中处理（通过监听 isGenerating 状态）
        }
        setIsGenerating(false);
      } else {
        setIsGenerating(false);
        errorHandler.showWarning('生成任务已提交，但暂无输出结果');
      }
    } catch (error) {
      const errorMessage = errorHandler.handleError(error, '生成任务');
      logger.error('生成失败:', error);
      errorHandler.showError(errorMessage, error);
      setIsGenerating(false);
    }
  };
  
  // 图层操作功能
  const handleLayerAdd = () => {
    const newLayer = addLayer();
    logger.debug('添加新图层:', newLayer);
    // 设置新添加的图层为激活状态
    setActiveLayerId(newLayer.id);
    
    // 调试信息
    logger.debug('New layer added, setting active layer to:', newLayer.id);
  };
  
  const handleEditorReady = useCallback((editor) => {
    editorRef.current = editor;
    logger.debug('[主组件] Editor ready:', editor);
    setIsEditorInitialized(true);
  }, []);
  
  const handleLayerDelete = (layerId) => {
    // 查找要删除的图层
    const layerToDelete = layers.find(layer => layer.id === layerId);
    
    if (layerToDelete && editorRef.current) {
      // 删除图层关联的所有shape
      const shapeIds = layerToDelete.shapeIds || (layerToDelete.objects?.map(obj => obj.id) || []);
      shapeIds.forEach(shapeId => {
        try {
          const shape = editorRef.current.getShape(shapeId);
          if (shape) {
            logger.debug('[图层删除] 删除shape:', shapeId);
            editorRef.current.deleteShape(shapeId);
          }
        } catch (error) {
          logger.warn('[图层删除] 删除shape失败:', shapeId, error);
        }
      });
    }
    
    // 删除图层
    deleteLayer(layerId);
  };
  
  const handleLayerRename = (layerId, newName) => {
    renameLayer(layerId, newName);
  };
  
  const handleLayerToggleVisibility = (layerId) => {
    logger.debug('Toggling visibility for layer:', layerId);
    
    // 更新图层可见性状态
    toggleLayerVisibility(layerId);
  };
  
  const handleLayerToggleLock = (layerId) => {
    toggleLayerLock(layerId);
  };

  const handleLayerDuplicate = (layerId) => {
    duplicateLayer(layerId);
  };

  const handleLayerMerge = (layerId) => {
    // 合并图层到下一层
    const layerIndex = layers.findIndex(l => l.id === layerId);
    if (layerIndex >= 0 && layerIndex < layers.length - 1) {
      const nextLayer = layers[layerIndex + 1];
      mergeMultipleLayers([layerId, nextLayer.id]);
    }
  };

  const handleLayerSplit = (layerId) => {
    splitLayer(layerId);
  };

  const handleLayerClone = (layerId) => {
    cloneLayer(layerId);
  };

  const handleLayerFuse = (layerIds) => {
    fuseLayers(layerIds);
  };

  const handleLayerMergeDown = (layerId) => {
    // 向下合并图层
    const layerIndex = layers.findIndex(l => l.id === layerId);
    if (layerIndex >= 0 && layerIndex < layers.length - 1) {
      const nextLayer = layers[layerIndex + 1];
      mergeMultipleLayers([layerId, nextLayer.id]);
    }
  };

  const handleLayerDrop = (draggedLayerId, targetLayerId, position) => {
    // 处理图层拖放重新排序
    const draggedIndex = layers.findIndex(l => l.id === draggedLayerId);
    const targetIndex = layers.findIndex(l => l.id === targetLayerId);
    if (draggedIndex < 0 || targetIndex < 0) return;
    
    const newIndex = position === 'above' ? targetIndex : targetIndex + 1;
    handleLayerReorder(draggedLayerId, newIndex);
  };

  const handleLayerGroupDrop = (layerId, groupId) => {
    // 将图层拖放到组中
    setLayers(prev => prev.map(layer => 
      layer.id === layerId
        ? { ...layer, parentId: groupId }
        : layer
    ));
  };

  const handleLayerToggleGroup = (layerId) => {
    // 切换图层组的展开/折叠状态
    setLayers(prev => prev.map(layer => 
      layer.id === layerId && layer.isGroup
        ? { ...layer, isExpanded: !layer.isExpanded }
        : layer
    ));
  };
  
  // 同步图层顺序到 tldraw 的 z-index
  useEffect(() => {
    if (!editorRef.current || !layers || layers.length === 0) return;
    if (isSyncingZIndexRef.current) return; // 防止循环更新
    
    // 获取按 orderIndex 排序的图层列表
    const sortedLayers = [...layers].sort((a, b) => a.orderIndex - b.orderIndex);
    const rootLayers = sortedLayers.filter(l => !l.parentId);
    
    // 按顺序从下到上调整 z-index
    // tldraw 中，先 sendToBack 的会在最下面，后 bringToFront 的会在最上面
    rootLayers.forEach((layer, index) => {
      const shapeIds = layer.shapeIds || layer.objects?.map(obj => obj.id) || [];
      if (shapeIds.length > 0) {
        try {
          // 先发送到后面（从下往上构建）
          editorRef.current.sendToBack(shapeIds);
        } catch (error) {
          logger.warn(`[图层排序] 发送到后面失败:`, shapeIds, error);
        }
      }
    });
    
    // 然后按顺序从下到上依次带到前面
    // 这样最下面的图层会先被带到前面，然后被后面的图层覆盖
    rootLayers.forEach((layer, index) => {
      const shapeIds = layer.shapeIds || layer.objects?.map(obj => obj.id) || [];
      if (shapeIds.length > 0) {
        try {
          // 按顺序带到前面，后面的图层会覆盖前面的
          editorRef.current.bringToFront(shapeIds);
        } catch (error) {
          logger.warn(`[图层排序] 带到前面失败:`, shapeIds, error);
        }
      }
    });
    
    logger.debug(`[图层排序] 已同步 ${rootLayers.length} 个图层的 z-index`);
  }, [layers.map(l => `${l.id}-${l.orderIndex}`).join(',')]); // 当图层顺序变化时触发
  
  // 用于防止循环更新的 ref
  const isSelectingFromLayerRef = useRef(false);

  const pruneLayerShapeReferences = useCallback(
    (layerId, invalidShapeIds) => {
      if (!invalidShapeIds || invalidShapeIds.length === 0) return;
      setLayers((prevLayers) =>
        prevLayers.map((layer) => {
          if (layer.id !== layerId) return layer;
          const nextShapeIds = (layer.shapeIds || []).filter(
            (id) => !invalidShapeIds.includes(id)
          );
          const nextObjects = (layer.objects || []).filter(
            (obj) => !invalidShapeIds.includes(obj.id)
          );
          const changed =
            nextShapeIds.length !== (layer.shapeIds || []).length ||
            nextObjects.length !== (layer.objects || []).length;
          if (!changed) return layer;
          return {
            ...layer,
            shapeIds: nextShapeIds,
            objects: nextObjects
          };
        })
      );
    },
    [setLayers]
  );
  
  // 监听 activeLayerId 变化，自动选中图层对应的所有 shape
  useEffect(() => {
    if (!editorRef.current || !activeLayerId) return;
    
    const layer = layers.find(l => l.id === activeLayerId);
    if (layer) {
      const shapeIds = layer.shapeIds || layer.objects?.map(obj => obj.id) || [];
      logger.debug(`[图层选择] 图层 ${activeLayerId} 包含 ${shapeIds.length} 个 shapeIds:`, shapeIds);
      
      if (shapeIds.length > 0) {
        // 验证所有 shape 是否存在
        const validShapeIds = [];
        const invalidShapeIds = [];
        
        shapeIds.forEach(shapeId => {
          try {
            const shape = editorRef.current.getShape(shapeId);
            if (shape) {
              validShapeIds.push(shapeId);
            } else {
              invalidShapeIds.push(shapeId);
            }
          } catch (error) {
            invalidShapeIds.push(shapeId);
            logger.warn(`[图层选择] Shape 不存在或获取失败:`, shapeId, error);
          }
        });
        
        if (invalidShapeIds.length > 0) {
          logger.debug(`[图层选择] 移除 ${invalidShapeIds.length} 个已删除的 shapeId:`, invalidShapeIds);
          pruneLayerShapeReferences(layer.id, invalidShapeIds);
        }
        
        if (validShapeIds.length > 0) {
          // 设置标志，防止触发画布选择的监听
          isSelectingFromLayerRef.current = true;
          
          // 选中所有有效的 shape
          editorRef.current.setSelectedShapes(validShapeIds);
          logger.debug(`[图层选择] 自动选中 ${validShapeIds.length} 个 shape:`, validShapeIds);
          
          // 延迟重置标志
          setTimeout(() => {
            isSelectingFromLayerRef.current = false;
          }, 200);
        } else {
          logger.debug(`[图层选择] 图层 ${activeLayerId} 目前没有可选的 shape`);
        }
      } else {
        logger.debug(`[图层选择] 图层 ${activeLayerId} 没有 shapeIds`);
      }
    } else {
      logger.debug(`[图层选择] 图层不存在:`, activeLayerId);
    }
  }, [activeLayerId, layers, pruneLayerShapeReferences]);
  
  // 监听 asset 创建，保存文件名映射
  useEffect(() => {
    if (!isEditorInitialized || !editorRef.current) return;
    
    const unsubscribe = editorRef.current.store.listen((entry) => {
      try {
        // 检查是否有新添加的 asset
        if (entry.changes?.added) {
          Object.values(entry.changes.added).forEach((record) => {
            if (record.typeName === 'asset' && record.type === 'image') {
              const assetId = record.id;
              let fileName = null;
              
              // 尝试从 asset 中获取文件名
              if (record.props?.name) {
                fileName = record.props.name;
              } else if (record.props?.src) {
                // 从 URL 中提取文件名
                const url = record.props.src;
                const patterns = [
                  /\/([^\/\?]+)\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?|$)/i,
                  /\/([^\/\?]+)(\?|$)/,
                  /filename=([^&]+)/,
                ];
                
                for (const pattern of patterns) {
                  const match = url.match(pattern);
                  if (match) {
                    fileName = decodeURIComponent(match[1]);
                    break;
                  }
                }
              }
              
              if (fileName) {
                // 移除查询参数和哈希
                fileName = fileName.split('?')[0].split('#')[0];
                assetFileNameMapRef.current.set(assetId, fileName);
                logger.debug(`[Asset监听] 保存文件名映射: ${assetId} -> ${fileName}`);
                
                // 检查是否有对应的图层需要更新名称
                if (fileName && !/^\d+$/.test(fileName)) {
                  const currentLayers = layersRef.current || [];
                  
                  // 查找包含该 assetId 的图层
                  const targetLayer = currentLayers.find(layer => {
                    if (!layer.shapeIds || layer.shapeIds.length === 0) {
                      return false;
                    }
                    // 检查该图层的 shape 是否使用这个 assetId
                    const found = layer.shapeIds.some(shapeId => {
                      if (!editorRef.current) return false;
                      try {
                        const shape = editorRef.current.getShape(shapeId);
                        const shapeAssetId = shape?.props?.assetId;
                        const matches = shapeAssetId === assetId;
                        if (matches) {
                        }
                        return matches;
                      } catch (error) {
                        return false;
                      }
                    });
                    return found;
                  });
                  
                  
                  if (targetLayer) {
                    // 如果图层名称还是默认的"图层 X"格式（包括 "图层 X (N)" 格式），更新为文件名
                    const isDefaultName = /^图层 \d+/.test(targetLayer.name);
                    // 强制更新：如果图层名称是默认格式，或者图层名称与文件名不同，都更新
                    if (isDefaultName || targetLayer.name !== fileName) {
                      logger.debug(`[Asset监听] 更新图层名称: ${targetLayer.id} (${targetLayer.name}) -> ${fileName}`);
                      renameLayer(targetLayer.id, fileName);
                    } else {
                    }
                  } else {
                    // 如果没找到图层，可能是图层还没创建，延迟再试一次
                    setTimeout(() => {
                      updateLayerNamesForAsset(assetId, fileName);
                    }, 500);
                  }
                }
              }
            }
          });
        }
      } catch (error) {
        logger.warn(`[Asset监听] 处理 asset 创建失败:`, error);
      }
    });
    
    return () => unsubscribe();
  }, [isEditorInitialized, renameLayer, getUniqueLayerName, updateLayerNamesForAsset]);
  
  // 监听画布内容选择变化，同步到图层选择（支持多选）
  useEffect(() => {
    if (!editorRef.current || !layers || layers.length === 0) return;
    
    let isUpdating = false; // 防止循环更新
    
    // 使用 editor 的 store 监听选中形状的变化
    const unsubscribe = editorRef.current.store.listen((entry) => {
      if (isUpdating || isSelectingFromLayerRef.current) return; // 如果正在更新或从图层选择触发，跳过
      
      // 如果正在生成中，跳过画布选择同步，避免干扰生成完成后的状态
      if (isGenerating) {
        return;
      }
      
      try {
        const selectedShapeIds = editorRef.current.getSelectedShapeIds();
        
        if (selectedShapeIds.length > 0) {
          // 根据选中的 shape 找到对应的所有图层（支持多选）
          const matchingLayers = layers.filter(layer => {
            const layerShapeIds = layer.shapeIds || layer.objects?.map(obj => obj.id) || [];
            return selectedShapeIds.some(shapeId => layerShapeIds.includes(shapeId));
          });
          
          if (matchingLayers.length > 0) {
            const matchingLayerIds = new Set(matchingLayers.map(l => l.id));
            
            // 检查是否需要更新选择
            const needsUpdate = matchingLayers.length !== selectedLayerIds.size ||
              !Array.from(matchingLayerIds).every(id => selectedLayerIds.has(id));
            
            if (needsUpdate) {
              isUpdating = true;
              logger.debug(`[画布选择] 同步到图层多选:`, Array.from(matchingLayerIds));
              setSelectedLayerIds(matchingLayerIds);
              
              // 设置第一个匹配的图层为激活图层
              if (matchingLayers[0].id !== activeLayerId) {
                setActiveLayerId(matchingLayers[0].id);
              }
              
              setTimeout(() => { isUpdating = false; }, 100);
            }
          }
        } else {
          // 如果画布选择被清除，也清除图层多选
          if (selectedLayerIds.size > 0) {
            setSelectedLayerIds(new Set());
          }
        }
      } catch (error) {
        logger.warn(`[画布选择] 同步失败:`, error);
      }
    });
    
    return () => unsubscribe();
  }, [layers, activeLayerId, selectedLayerIds, isGenerating]);
  
  // 监听生成图片添加完成，清除多选状态或自动合并
  useEffect(() => {
    if (isGenerating || generatedLayerIdsRef.current.size === 0) {
      return;
    }

    const timer = setTimeout(() => {
      const generatedLayerIds = Array.from(generatedLayerIdsRef.current);
      generatedLayerIdsRef.current.clear();

      const currentLayers = layersRef.current || [];
      const editor = editorRef.current;

      if (!editor || currentLayers.length === 0 || generatedLayerIds.length === 0) {
        return;
      }

      const existingLayers = generatedLayerIds
        .map(id => currentLayers.find(layer => layer.id === id))
        .filter(Boolean);

      if (existingLayers.length === 0) {
        return;
      }

      const parseFileNameFromUrl = (url) => {
        if (!url || typeof url !== 'string') return null;
        try {
          const decoded = decodeURIComponent(url);
          const fileMatch = decoded.match(/([^/?#]+\.(png|jpe?g|webp|gif|svg|bmp))(?:[?#].*)?$/i);
          if (fileMatch) {
            return fileMatch[1];
          }
          const filenameParam = decoded.match(/filename=([^&]+)/i);
          if (filenameParam) {
            return filenameParam[1];
          }
          return null;
        } catch {
          return null;
        }
      };

      const assetIdsToUpdate = new Set();
      const candidateNames = [];

      existingLayers.forEach(layer => {
        const shapeIds = layer.shapeIds || layer.objects?.map(obj => obj.id) || [];
        shapeIds.forEach(shapeId => {
          try {
            const shape = editor.getShape(shapeId);
            const assetId = shape?.props?.assetId;
            if (assetId) {
              assetIdsToUpdate.add(assetId);
              const mappedName = assetFileNameMapRef.current.get(assetId);
              if (mappedName) {
                candidateNames.push(mappedName);
              }
            }

            // 从对象数据中提取候选名称
            const objectData = layer.objects?.find(obj => obj.id === shapeId);
            const originalShape = objectData?.data;
            const imageDataFile = originalShape?.data?.imageData?.filename;
            if (imageDataFile) {
              candidateNames.push(imageDataFile);
            }

            const imageUrl = originalShape?.data?.imageUrl || shape?.meta?.src || shape?.props?.src;
            const parsed = parseFileNameFromUrl(imageUrl);
            if (parsed) {
              candidateNames.push(parsed);
            }
          } catch (error) {
            logger.warn('[生成完成] 提取 shape 信息失败:', shapeId, error);
          }
        });
      });

      // 选择最终名称
      let finalBaseName = candidateNames.find(name => !!name);
      if (!finalBaseName) {
        const firstLayerName = existingLayers[0].name || '';
        if (firstLayerName && !/^图层\s*\d+/.test(firstLayerName)) {
          finalBaseName = firstLayerName;
        }
      }
      if (!finalBaseName) {
        finalBaseName = '生成结果';
      }

      let targetLayerId = existingLayers[0].id;
      let mergedLayerId = targetLayerId;

      if (existingLayers.length > 1) {
        const sourceLayerIds = existingLayers.slice(1).map(layer => layer.id);
        logger.info('[生成完成] 自动合并图层:', { targetLayerId, sourceLayerIds });
        mergedLayerId = mergeMultipleLayers(targetLayerId, sourceLayerIds) || targetLayerId;
      }

      // 更新名称
      const uniqueName = getUniqueLayerName(finalBaseName, mergedLayerId);
      const updatedLayers = layersRef.current || [];
      const mergedLayer = updatedLayers.find(layer => layer.id === mergedLayerId);
      if (uniqueName && mergedLayer?.name !== uniqueName) {
        logger.info('[生成完成] 重命名合并后的图层:', mergedLayerId, '->', uniqueName);
        renameLayer(mergedLayerId, uniqueName);
      }

      // 更新 asset -> layer 映射
      assetIdsToUpdate.forEach(assetId => {
        if (assetId) {
          assetLayerMapRef.current.set(assetId, [mergedLayerId]);
        }
      });

      // 设置选中与激活
      setSelectedLayerIds(new Set([mergedLayerId]));
      setActiveLayerId(mergedLayerId);
    }, 300);

    return () => clearTimeout(timer);
  }, [isGenerating, mergeMultipleLayers, renameLayer, getUniqueLayerName, setActiveLayerId]);
  
  
  // 处理图层选择，同步到画布内容选择（支持多选）
  const handleLayerSelectWithSync = (layerId, event) => {
    const isMultiSelect = event?.ctrlKey || event?.metaKey || event?.shiftKey;
    
    if (isMultiSelect) {
      // 多选模式
      setSelectedLayerIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(layerId)) {
          newSet.delete(layerId);
          // 如果取消选择的是当前激活图层，切换到其他选中的图层
          if (activeLayerId === layerId && newSet.size > 0) {
            setActiveLayerId(Array.from(newSet)[0]);
          } else if (newSet.size === 0) {
            setActiveLayerId(null);
          }
        } else {
          newSet.add(layerId);
          setActiveLayerId(layerId);
        }
        return newSet;
      });
    } else {
      // 单选模式
      setSelectedLayerIds(new Set([layerId]));
      setActiveLayerId(layerId);
    }
    
    // 注意：实际的 shape 选择会由上面的 useEffect 自动处理
    // 这里不需要手动设置，避免与 useEffect 冲突
  };
  
  // 组合选中的图层
  const handleGroupSelectedLayers = () => {
    if (selectedLayerIds.size < 2) {
      errorHandler.showWarning('请至少选择2个图层进行组合');
      return;
    }
    
    const layerIdsArray = Array.from(selectedLayerIds);
    const groupName = `图层组 ${layerGroups.length + 1}`;
    const newGroup = createLayerGroup(groupName, layerIdsArray);
    
    // 清除多选状态
    setSelectedLayerIds(new Set());
    setActiveLayerId(layerIdsArray[0]);
    
    logger.debug(`[图层组合] 创建组合:`, newGroup.id, layerIdsArray);
  };
  
  // 合并选中的图层
  const handleMergeSelectedLayers = () => {
    if (selectedLayerIds.size < 2) {
      errorHandler.showWarning('请至少选择2个图层进行合并');
      return;
    }
    
    const layerIdsArray = Array.from(selectedLayerIds);
    const targetLayerId = layerIdsArray[0];
    const sourceLayerIds = layerIdsArray.slice(1);
    
    logger.debug(`[图层合并] 开始合并:`, { target: targetLayerId, sources: sourceLayerIds });
    
    // 在合并前收集所有要合并的 shapeIds
    const allShapeIdsToMerge = [];
    layerIdsArray.forEach(layerId => {
      const layer = layers.find(l => l.id === layerId);
      if (layer) {
        const shapeIds = layer.shapeIds || layer.objects?.map(obj => obj.id) || [];
        allShapeIdsToMerge.push(...shapeIds);
      }
    });
    
    logger.debug(`[图层合并] 收集到的 shapeIds:`, allShapeIdsToMerge);
    
    // 执行合并
    const mergedLayerId = mergeMultipleLayers(targetLayerId, sourceLayerIds);
    
    if (mergedLayerId) {
      // 清除多选状态
      setSelectedLayerIds(new Set());
      
      // 设置合并后的图层为激活图层
      // useEffect 会自动选中该图层对应的所有 shape（包括合并进来的）
      setActiveLayerId(mergedLayerId);
      
      logger.debug(`[图层合并] 合并成功:`, mergedLayerId, `预期包含 ${allShapeIdsToMerge.length} 个 shape`);
      
      // 验证合并后的图层数据（延迟执行，等待状态更新）
      setTimeout(() => {
        // 使用 ref 获取最新的 layers 状态，避免闭包问题
        const currentLayers = layersRef.current;
        if (!currentLayers) {
          logger.warn(`[图层合并] 警告：无法获取最新的图层状态`);
          return;
        }
        
        const mergedLayer = currentLayers.find(l => l.id === mergedLayerId);
        if (mergedLayer) {
          const actualShapeIds = mergedLayer.shapeIds || [];
          logger.debug(`[图层合并] 合并后的图层数据:`, {
            id: mergedLayer.id,
            name: mergedLayer.name,
            shapeIdsCount: actualShapeIds.length,
            expectedCount: allShapeIdsToMerge.length,
            objectsCount: mergedLayer.objects?.length || 0,
            shapeIds: actualShapeIds,
            expectedShapeIds: allShapeIdsToMerge
          });
          
          // 检查是否有遗漏的 shapeIds
          // 同时验证这些 shape 是否在画布上还存在
          const missingShapeIds = [];
          allShapeIdsToMerge.forEach(shapeId => {
            if (!actualShapeIds.includes(shapeId)) {
              // 检查 shape 是否在画布上还存在
              if (editorRef.current) {
                const shape = editorRef.current.getShape(shapeId);
                if (shape) {
                  // shape 存在但未合并，这是问题
                  missingShapeIds.push(shapeId);
                  logger.warn(`[图层合并] Shape ${shapeId} 存在于画布但未合并到图层`);
                } else {
                  // shape 不存在，可能是被删除了，这是正常的
                  logger.debug(`[图层合并] Shape ${shapeId} 不存在于画布，可能已被删除`);
                }
              } else {
                missingShapeIds.push(shapeId);
              }
            }
          });
          
          if (missingShapeIds.length > 0) {
            logger.warn(`[图层合并] 警告：有 ${missingShapeIds.length} 个 shapeId 未被合并:`, missingShapeIds);
          } else {
            logger.info(`[图层合并] 验证通过：所有 shapeIds 都已正确合并`);
          }
        } else {
          logger.error(`[图层合并] 错误：合并后的图层不存在:`, mergedLayerId);
        }
        }, DELAYS.STATE_UPDATE); // 增加延迟，确保状态更新完成
      } else {
        errorHandler.showError('合并失败，请检查图层是否有效');
        logger.error(`[图层合并] 合并失败`);
    }
  };
  
  // 取消多选
  const handleClearSelection = () => {
    setSelectedLayerIds(new Set());
  };
  
  const handleLayerSetOpacity = (layerId, opacity) => {
    setLayerOpacity(layerId, opacity);
  };
  
  const handleLayerSetBlendMode = (layerId, blendMode) => {
    setLayerBlendMode(layerId, blendMode);
  };
  
  const handleLayerGroupCreate = () => {
    createLayerGroup(`图层组 ${layerGroups.length + 1}`);
  };
  
  const handleLayerGroupDelete = (groupId) => {
    deleteLayerGroup(groupId);
  };
  
  const handleLayerGroupRename = (groupId, newName) => {
    renameLayerGroup(groupId, newName);
  };

  const autoExtendCrop = useCallback(async (shapeId, extend) => {
    if (!editorRef.current) return;
    const editor = editorRef.current;
    const shape = editor.getShape(shapeId);
    if (!shape || shape.type !== 'image') return;

    const assetId = shape.props?.assetId;
    if (!assetId) return;
    const asset = editor.getAsset(assetId);
    if (!asset || asset.type !== 'image') return;

    try {
      let cropState = imageCropStateRef.current.get(shapeId);
      const baseSrc = cropState?.originalSrc || asset.props?.src;
      const mimeType = cropState?.mimeType || asset.props?.mimeType || 'image/png';
      if (!baseSrc) {
        logger.warn('[自动扩展] 缺少原始图像数据');
        return;
      }

      if (!cropState) {
        const baseImage = await loadImageElement(baseSrc);
        cropState = {
          originalSrc: baseSrc,
          mimeType,
          originalWidth: asset.props?.w || baseImage.width,
          originalHeight: asset.props?.h || baseImage.height,
          crop: { left: 0, right: 0, top: 0, bottom: 0 },
          padding: { left: 0, right: 0, top: 0, bottom: 0 }
        };
        imageCropStateRef.current.set(shapeId, cropState);
      }

      let baseImageElement = cropState.baseImageElement;
      if (!baseImageElement) {
        baseImageElement = await loadImageElement(cropState.originalSrc);
        cropState.baseImageElement = baseImageElement;
      }
      const baseWidth = cropState.originalWidth || baseImageElement.width;
      const baseHeight = cropState.originalHeight || baseImageElement.height;
      if (!baseWidth || !baseHeight) return;

      const prevCrop = { ...cropState.crop };
      const prevPadding = { ...cropState.padding };
      const prevVisibleWidthPx = baseWidth - prevCrop.left - prevCrop.right;
      const prevVisibleHeightPx = baseHeight - prevCrop.top - prevCrop.bottom;
      const prevTotalWidthPx = prevVisibleWidthPx + prevPadding.left + prevPadding.right;
      const prevTotalHeightPx = prevVisibleHeightPx + prevPadding.top + prevPadding.bottom;
      if (prevTotalWidthPx <= 0 || prevTotalHeightPx <= 0) return;

      const pxPerCanvasX = prevTotalWidthPx / Math.max(shape.props.w || 1, 1e-6);
      const pxPerCanvasY = prevTotalHeightPx / Math.max(shape.props.h || 1, 1e-6);
      const unitPerPxX = pxPerCanvasX !== 0 ? 1 / pxPerCanvasX : 0;
      const unitPerPxY = pxPerCanvasY !== 0 ? 1 / pxPerCanvasY : 0;
      const minVisibleWidthPx = MIN_RESIZE_SIZE * pxPerCanvasX;
      const minVisibleHeightPx = MIN_RESIZE_SIZE * pxPerCanvasY;

      const extendValues = {
        left: clampResizeDeltaValue(extend?.left || 0, shape.props.w),
        right: clampResizeDeltaValue(extend?.right || 0, shape.props.w),
        top: clampResizeDeltaValue(extend?.top || 0, shape.props.h),
        bottom: clampResizeDeltaValue(extend?.bottom || 0, shape.props.h)
      };

      const extendPixels = {
        left: Math.round(extendValues.left * pxPerCanvasX),
        right: Math.round(extendValues.right * pxPerCanvasX),
        top: Math.round(extendValues.top * pxPerCanvasY),
        bottom: Math.round(extendValues.bottom * pxPerCanvasY)
      };

      const adjustSide = (side) => {
        const deltaPx = extendPixels[side];
        if (deltaPx === 0) return;
        const isHorizontal = side === 'left' || side === 'right';
        const crop = cropState.crop;
        const padding = cropState.padding;

        if (deltaPx > 0) {
          let remaining = deltaPx;
          if (crop[side] > 0) {
            const restore = Math.min(remaining, crop[side]);
            crop[side] -= restore;
            remaining -= restore;
          }
          if (remaining > 0) {
            padding[side] += remaining;
          }
        } else {
          let shrinkAmount = Math.abs(deltaPx);
          if (padding[side] > 0) {
            const reducePad = Math.min(shrinkAmount, padding[side]);
            padding[side] -= reducePad;
            shrinkAmount -= reducePad;
          }
          if (shrinkAmount > 0) {
            if (isHorizontal) {
              const visibleWidth = baseWidth - crop.left - crop.right;
              const maxAdditionalCrop = Math.max(0, visibleWidth - minVisibleWidthPx);
              const applied = Math.min(shrinkAmount, maxAdditionalCrop);
              crop[side] += applied;
            } else {
              const visibleHeight = baseHeight - crop.top - crop.bottom;
              const maxAdditionalCrop = Math.max(0, visibleHeight - minVisibleHeightPx);
              const applied = Math.min(shrinkAmount, maxAdditionalCrop);
              crop[side] += applied;
            }
          }
        }
      };

      ['left', 'right', 'top', 'bottom'].forEach(adjustSide);

      const nextVisibleWidthPx = baseWidth - cropState.crop.left - cropState.crop.right;
      const nextVisibleHeightPx = baseHeight - cropState.crop.top - cropState.crop.bottom;
      const nextTotalWidthPx = nextVisibleWidthPx + cropState.padding.left + cropState.padding.right;
      const nextTotalHeightPx = nextVisibleHeightPx + cropState.padding.top + cropState.padding.bottom;
      if (nextTotalWidthPx <= 0 || nextTotalHeightPx <= 0) {
        logger.warn('[自动扩展] 计算后的尺寸无效');
        return;
      }

      const deltaLeftPx =
        (cropState.padding.left - prevPadding.left) - (cropState.crop.left - prevCrop.left);
      const deltaRightPx =
        (cropState.padding.right - prevPadding.right) - (cropState.crop.right - prevCrop.right);
      const deltaTopPx =
        (cropState.padding.top - prevPadding.top) - (cropState.crop.top - prevCrop.top);
      const deltaBottomPx =
        (cropState.padding.bottom - prevPadding.bottom) - (cropState.crop.bottom - prevCrop.bottom);

      const deltaLeftCanvas = deltaLeftPx * unitPerPxX;
      const deltaRightCanvas = deltaRightPx * unitPerPxX;
      const deltaTopCanvas = deltaTopPx * unitPerPxY;
      const deltaBottomCanvas = deltaBottomPx * unitPerPxY;

      const newShapeWidth = Math.max(
        MIN_RESIZE_SIZE,
        shape.props.w + deltaLeftCanvas + deltaRightCanvas
      );
      const newShapeHeight = Math.max(
        MIN_RESIZE_SIZE,
        shape.props.h + deltaTopCanvas + deltaBottomCanvas
      );
      const newShapeX = shape.x - deltaLeftCanvas;
      const newShapeY = shape.y - deltaTopCanvas;

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(nextTotalWidthPx));
      canvas.height = Math.max(1, Math.round(nextTotalHeightPx));
      const ctx = canvas.getContext('2d');

      if (cropFillMode === 'transparent') {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.drawImage(
        baseImageElement,
        cropState.crop.left,
        cropState.crop.top,
        nextVisibleWidthPx,
        nextVisibleHeightPx,
        cropState.padding.left,
        cropState.padding.top,
        nextVisibleWidthPx,
        nextVisibleHeightPx
      );

      const dataUrl = canvas.toDataURL(cropState.mimeType || mimeType);
      const newAssetId = createAssetId();

      editor.createAssets([
        {
          id: newAssetId,
          typeName: 'asset',
          type: 'image',
          props: {
            ...asset.props,
            w: canvas.width,
            h: canvas.height,
            src: dataUrl,
            mimeType: cropState.mimeType || mimeType
          },
          meta: asset.meta || {}
        }
      ]);

      editor.markHistoryStoppingPoint('auto-extend-crop');
      editor.updateShapes([
        {
          ...shape,
          x: newShapeX,
          y: newShapeY,
          props: {
            ...shape.props,
            w: newShapeWidth,
            h: newShapeHeight,
            assetId: newAssetId
          }
        }
      ]);

      setLayers(prev =>
        prev.map(layer => {
          const shapeIds = getLayerShapeIds(layer);
          if (!shapeIds.includes(shapeId)) return layer;
          return {
            ...layer,
            objects: (layer.objects || []).map(obj =>
              obj.id === shapeId
                ? {
                    ...obj,
                    data: {
                      ...obj.data,
                      props: {
                        ...(obj.data?.props || {}),
                        w: newShapeWidth,
                        h: newShapeHeight,
                        assetId: newAssetId
                      }
                    }
                  }
                : obj
            )
          };
        })
      );

      const targetLayer = layersRef.current?.find(layer => getLayerShapeIds(layer).includes(shapeId));
      if (targetLayer) {
        const targetMask = masks.find(mask => mask.layerId === targetLayer.id);
        if (targetMask) {
          const bounds = targetMask.bounds || { x: 0, y: 0, width: 0, height: 0 };
          updateMask(targetMask.id, {
            bounds: {
              ...bounds,
              x: (bounds.x || 0) + deltaLeftCanvas,
              y: (bounds.y || 0) + deltaTopCanvas,
              width: (bounds.width || 0) + deltaLeftCanvas + deltaRightCanvas,
              height: (bounds.height || 0) + deltaTopCanvas + deltaBottomCanvas
            }
          });
        }
      }
    } catch (error) {
      console.error('Failed to extend image bounds:', error);
    }
  }, [cropFillMode, editorRef, getLayerShapeIds, masks, setLayers, updateMask]);

  const startSelectionSession = useCallback((toolType, options = {}) => {
    if (!editorRef.current) return false;
    const editor = editorRef.current;
    const targetLayerId = options.layerId || activeLayerId;
    if (!targetLayerId) {
      logger.warn('未指定可用的图层来创建选区');
      return false;
    }
    const targetLayer = layers.find(layer => layer.id === targetLayerId);
    if (!targetLayer) {
      logger.warn('未找到可用的图层来创建选区');
      return false;
    }
    const layerShapeIds = getLayerShapeIds(targetLayer);
    const shapeId = options.shapeId && layerShapeIds.includes(options.shapeId)
      ? options.shapeId
      : layerShapeIds[0];
    if (!shapeId) {
      logger.warn('当前图层没有可用的图像形状');
      return false;
    }
    const shape = editor.getShape(shapeId);
    if (!shape || shape.type !== 'image') {
      logger.warn('当前仅支持对图像图层进行选区操作');
      return false;
    }
    const bounds = editor.getShapePageBounds(shapeId);
    if (!bounds) return false;
    setSelectionAction(options.applyMode || null);
    setSelectionSession({
      tool: toolType,
      layerId: targetLayer.id,
      shapeId,
      pageBounds: bounds,
      points: [],
      status: 'drawing'
    });
    return true;
  }, [activeLayerId, editorRef, getLayerShapeIds, layers]);

  const handleStartSmearErase = useCallback(() => {
    if (!selectedImageInfo) {
      errorHandler.showWarning('请先选中一张图片再使用涂抹工具');
      return;
    }
    const layerId = getLayerIdByShapeId(selectedImageInfo.shapeId);
    const success = startSelectionSession('brush', {
      applyMode: null, // 不再自动应用，由用户选择
      layerId,
      shapeId: selectedImageInfo.shapeId
    });
    if (!success) {
      errorHandler.showWarning('无法进入涂抹模式，请确认图层可编辑');
    }
  }, [selectedImageInfo, getLayerIdByShapeId, startSelectionSession]);

  // applySelectionCrop 需要在 handleSmearApply 之前定义
  const applySelectionCrop = useCallback(async (mode, sessionOverride = null) => {
    const session = sessionOverride || selectionSession;
    if (!session || session.points.length < 2 || !editorRef.current) return;
    const editor = editorRef.current;
    const shape = editor.getShape(session.shapeId);
    if (!shape || shape.type !== 'image') return;
    const assetId = shape.props?.assetId;
    if (!assetId) return;
    const asset = editor.getAsset(assetId);
    if (!asset || asset.type !== 'image' || !asset.props?.src) return;

    try {
      const imageElement = await loadImageElement(asset.props.src);
      const originalWidth = asset.props?.w || imageElement.width;
      const originalHeight = asset.props?.h || imageElement.height;

      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = originalWidth;
      maskCanvas.height = originalHeight;
      const maskCtx = maskCanvas.getContext('2d');
      maskCtx.fillStyle = '#ffffff';
      maskCtx.strokeStyle = '#ffffff';
      maskCtx.lineCap = 'round';
      maskCtx.lineJoin = 'round';

      if (session.tool === 'brush') {
        const brushPx = Math.max(
          2,
          (brushSize || 1) * (originalWidth / (session.pageBounds.width || session.pageBounds.w || 1))
        );
        maskCtx.lineWidth = brushPx;
        maskCtx.beginPath();
        session.points.forEach((point, index) => {
          const px = point.x * originalWidth;
          const py = point.y * originalHeight;
          if (index === 0) {
            maskCtx.moveTo(px, py);
          } else {
            maskCtx.lineTo(px, py);
          }
        });
        maskCtx.stroke();
      } else {
        maskCtx.beginPath();
        session.points.forEach((point, index) => {
          const px = point.x * originalWidth;
          const py = point.y * originalHeight;
          if (index === 0) {
            maskCtx.moveTo(px, py);
          } else {
            maskCtx.lineTo(px, py);
          }
        });
        maskCtx.closePath();
        maskCtx.fill();
      }

      const resultCanvas = document.createElement('canvas');
      resultCanvas.width = originalWidth;
      resultCanvas.height = originalHeight;
      const resultCtx = resultCanvas.getContext('2d');
      resultCtx.drawImage(imageElement, 0, 0);
      resultCtx.globalCompositeOperation = mode === 'crop' ? 'destination-in' : 'destination-out';
      resultCtx.drawImage(maskCanvas, 0, 0);

      const mimeType = asset.props?.mimeType || 'image/png';
      const dataUrl = resultCanvas.toDataURL(mimeType);
      const newAssetId = createAssetId();

      editor.createAssets([
        {
          id: newAssetId,
          typeName: 'asset',
          type: 'image',
          props: {
            ...asset.props,
            w: originalWidth,
            h: originalHeight,
            src: dataUrl,
            mimeType
          },
          meta: asset.meta || {}
        }
      ]);

      editor.markHistoryStoppingPoint(mode === 'crop' ? 'selection-crop' : 'selection-inverse-crop');
      editor.updateShapes([
        {
          ...shape,
          props: {
            ...shape.props,
            assetId: newAssetId
          }
        }
      ]);

      setLayers(prev =>
        prev.map(layer => {
          const shapeIds = getLayerShapeIds(layer);
          if (!shapeIds.includes(session.shapeId)) return layer;
          return {
            ...layer,
            objects: (layer.objects || []).map(obj =>
              obj.id === session.shapeId
                ? {
                    ...obj,
                    data: {
                      ...obj.data,
                      props: {
                        ...(obj.data?.props || {}),
                        assetId: newAssetId
                      }
                    }
                  }
                : obj
            )
          };
        })
      );

      createMaskForLayer(session.layerId, {
        type: `selection-${session.tool}`,
        data: session.points,
        inverted: mode === 'inverse',
        bounds: {
          x: session.pageBounds.minX,
          y: session.pageBounds.minY,
          width: session.pageBounds.width ?? session.pageBounds.w ?? 0,
          height: session.pageBounds.height ?? session.pageBounds.h ?? 0
        }
      });

      setSelectionSession(null);
    } catch (error) {
      console.error('Failed to apply selection crop:', error);
    }
  }, [brushSize, createMaskForLayer, editorRef, getLayerShapeIds, selectionSession, setLayers]);

  // 处理涂抹应用（支持实时预览图像）
  const handleSmearApply = useCallback(async (mode, customBrushSize, previewDataUrl, maskDataUrl) => {
    if (!selectionSession) return;
    
    const editor = editorRef.current;
    if (!editor) return;
    
    const shape = editor.getShape(selectionSession.shapeId);
    if (!shape || shape.type !== 'image') return;
    
    // 如果是保存为 mask 模式
    if (mode === 'save-mask' && maskDataUrl) {
      try {
        const layerId = getLayerIdByShapeId(selectionSession.shapeId);
        const layer = layers.find(l => l.id === layerId);
        
        if (layer) {
          // 使用 createMaskForLayer 创建蒙版
          createMaskForLayer(layerId, {
            type: 'smear-brush',
            data: selectionSession.points || [],
            maskImage: maskDataUrl,
            bounds: {
              x: selectionSession.pageBounds.minX,
              y: selectionSession.pageBounds.minY,
              width: selectionSession.pageBounds.width ?? selectionSession.pageBounds.w ?? 0,
              height: selectionSession.pageBounds.height ?? selectionSession.pageBounds.h ?? 0
            }
          });
          
          // 重要：保存历史记录，使蒙版操作可撤销
          saveLayerHistory(layers, layerGroups, masks);
          
          errorHandler.showSuccess('蒙版已保存到图层');
        }
        
        setSelectionSession(null);
        setSelectionAction(null);
        return;
      } catch (error) {
        console.error('保存蒙版失败:', error);
        errorHandler.showError('保存蒙版失败');
        return;
      }
    }
    
    // 如果有预览图像（应用擦除/保留），直接使用
    if (previewDataUrl) {
      try {
        const newAssetId = createAssetId();
        const asset = editor.getAsset(shape.props.assetId);
        
        editor.createAssets([{
          id: newAssetId,
          typeName: 'asset',
          type: 'image',
          props: {
            ...asset.props,
            src: previewDataUrl,
            mimeType: 'image/png'
          },
          meta: asset.meta || {}
        }]);
        
        editor.updateShapes([{
          ...shape,
          props: {
            ...shape.props,
            assetId: newAssetId
          }
        }]);
        
        setSelectionSession(null);
        setSelectionAction(null);
        errorHandler.showSuccess('涂抹已应用');
        return;
      } catch (error) {
        console.error('应用涂抹失败:', error);
        errorHandler.showError('应用涂抹失败');
        return;
      }
    }
    
    // 原有逻辑（兼容旧的非实时模式）
    if (!selectionSession.status || selectionSession.status !== 'ready') return;

    if (mode === 'save-mask') {
      // 保存为蒙版图层
      try {
        const session = selectionSession;
        const editor = editorRef.current;
        const shape = editor.getShape(session.shapeId);
        if (!shape || shape.type !== 'image') return;
        
        const assetId = shape.props?.assetId;
        if (!assetId) return;
        
        const asset = editor.getAsset(assetId);
        if (!asset || asset.type !== 'image' || !asset.props?.src) return;

        const imageElement = await loadImageElement(asset.props.src);
        const originalWidth = asset.props?.w || imageElement.width;
        const originalHeight = asset.props?.h || imageElement.height;

        // 创建蒙版画布
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = originalWidth;
        maskCanvas.height = originalHeight;
        const maskCtx = maskCanvas.getContext('2d');
        maskCtx.fillStyle = '#ffffff';
        maskCtx.strokeStyle = '#ffffff';
        maskCtx.lineCap = 'round';
        maskCtx.lineJoin = 'round';

        const brushPx = Math.max(
          2,
          (customBrushSize || brushSize) * (originalWidth / (session.pageBounds.width || 1))
        );
        maskCtx.lineWidth = brushPx;
        maskCtx.beginPath();
        session.points.forEach((point, index) => {
          const px = point.x * originalWidth;
          const py = point.y * originalHeight;
          if (index === 0) {
            maskCtx.moveTo(px, py);
          } else {
            maskCtx.lineTo(px, py);
          }
        });
        maskCtx.stroke();

        // 将蒙版保存为新图层
        const maskDataUrl = maskCanvas.toDataURL('image/png');
        const layerId = getLayerIdByShapeId(session.shapeId);
        const layer = layers.find(l => l.id === layerId);
        
        if (layer) {
          // 使用 createMaskForLayer 创建蒙版
          createMaskForLayer(layerId, {
            type: 'smear-brush',
            data: session.points,
            maskImage: maskDataUrl,
            bounds: {
              x: session.pageBounds.minX,
              y: session.pageBounds.minY,
              width: session.pageBounds.width ?? session.pageBounds.w ?? 0,
              height: session.pageBounds.height ?? session.pageBounds.h ?? 0
            }
          });
          
          // 重要：保存历史记录，使蒙版操作可撤销
          saveLayerHistory(layers, layerGroups, masks);
          
          errorHandler.showSuccess('蒙版已保存到图层');
        }
        
        setSelectionSession(null);
        setSelectionAction(null);
      } catch (error) {
        console.error('保存蒙版失败:', error);
        errorHandler.showError('保存蒙版失败');
      }
    } else {
      // 应用擦除/反向擦除
      const applyMode = mode === 'erase' ? 'inverse' : 'crop';
      
      // 临时更新 brushSize 用于应用
      const oldBrushSize = brushSize;
      setBrushSize(customBrushSize || brushSize);
      
      await applySelectionCrop(applyMode, selectionSession);
      
      // 恢复原来的 brushSize
      setBrushSize(oldBrushSize);
      
      setSelectionSession(null);
      setSelectionAction(null);
    }
  }, [selectionSession, brushSize, applySelectionCrop, editorRef, getLayerIdByShapeId, layers, createMaskForLayer]);

  // 处理涂抹取消（保留 mask）
  const handleSmearCancel = useCallback(async () => {
    // 如果有 session 并且状态是 ready（已绘制完成），保存 mask
    if (selectionSession && selectionSession.status === 'ready' && selectionSession.maskDataUrl) {
      try {
        const layerId = getLayerIdByShapeId(selectionSession.shapeId);
        const layer = layers.find(l => l.id === layerId);
        
        if (layer) {
          // 使用 createMaskForLayer 创建蒙版
          createMaskForLayer(layerId, {
            type: 'smear-brush',
            data: selectionSession.points || [],
            maskImage: selectionSession.maskDataUrl,
            bounds: {
              x: selectionSession.pageBounds.minX,
              y: selectionSession.pageBounds.minY,
              width: selectionSession.pageBounds.width ?? selectionSession.pageBounds.w ?? 0,
              height: selectionSession.pageBounds.height ?? selectionSession.pageBounds.h ?? 0
            }
          });
          
          errorHandler.showSuccess('蒙版已保存');
        }
      } catch (error) {
        console.error('保存蒙版失败:', error);
      }
    }
    
    // 清除 session，退出涂抹模式
    setSelectionSession(null);
    setSelectionAction(null);
  }, [selectionSession, getLayerIdByShapeId, layers, createMaskForLayer]);

  useEffect(() => {
    if (!selectionSession || selectionSession.status !== 'ready' || !selectionAction) return;
    (async () => {
      await applySelectionCrop(selectionAction, selectionSession);
      setSelectionAction(null);
    })();
  }, [selectionAction, applySelectionCrop, selectionSession]);

  useEffect(() => {
    if (!selectionSession && selectionAction) {
      setSelectionAction(null);
    }
  }, [selectionAction, selectionSession]);

  const handleDownloadSelectedImage = useCallback(() => {
    if (!editorRef.current || !selectedImageInfo) {
      errorHandler.showWarning('请选择要下载的图片');
      return;
    }
    const editor = editorRef.current;
    const shape = editor.getShape(selectedImageInfo.shapeId);
    if (!shape || shape.type !== 'image') {
      errorHandler.showWarning('当前选择不是图片');
      return;
    }
    const assetId = shape.props?.assetId;
    const asset = assetId ? editor.getAsset(assetId) : null;
    if (!asset || !asset.props?.src) {
      errorHandler.showWarning('未找到图片资源');
      return;
    }
    const link = document.createElement('a');
    link.href = asset.props.src;
    const mappedName = assetFileNameMapRef.current.get(asset.id);
    const fileName = mappedName || asset.props.name || `${shape.id}.png`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [selectedImageInfo]);
  
  // 系统功能
  const handleOpenMember = () => {
    logger.debug('打开会员页面');
  };
  
  const handleNotificationClick = () => {
    logger.debug('查看通知');
  };
  
  const handleProfileClick = () => {
    logger.debug('打开个人中心');
  };
  
  return (
    <div className="w-full h-full bg-gray-100 flex flex-col">
      {/* 顶部导航栏已移至App.jsx，这里不再显示 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 生成器面板 */}
        <GeneratorPanel
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
          isCollapsed={isLeftPanelCollapsed}
          onToggleCollapse={() => setIsLeftPanelCollapsed(!isLeftPanelCollapsed)}
          layers={layers}
          editorRef={editorRef}
        />
        
        {/* 画布区域 */}
        <div className="flex-1 flex flex-col">
          {/* tldraw画布 */}
          <div
            ref={containerRef}
            className="flex-1 relative bg-gray-200 overflow-hidden"
            style={{ zIndex: 1 }}
          >
            <Tldraw>
              <EditableCanvas 
                activeTool={activeTool}
                onToolChange={setActiveTool}
                onObjectAdded={handleObjectAdded}
                onObjectModified={handleObjectModified}
                onObjectDeleted={handleObjectDeleted}
                layers={layers}
                toggleLayerVisibility={toggleLayerVisibility}
                onEditorReady={handleEditorReady}
                generatedImages={generatedImages}
              />
            </Tldraw>
            {selectionScreenBounds && !selectionSession && (
              <>
                <ImageExtendOverlay
                  containerRef={containerRef}
                  editorRef={editorRef}
                  selectionBounds={selectionScreenBounds}
                  onCommit={autoExtendCrop}
                  highlight={extendHighlight}
                />
                <ImageActionBar
                  selectionBounds={selectionScreenBounds}
                  fillMode={cropFillMode}
                  onFillModeChange={setCropFillMode}
                  onStartSmear={handleStartSmearErase}
                  onDownload={handleDownloadSelectedImage}
                  onExtendHint={triggerExtendHighlight}
                />
              </>
            )}
            {selectionSession && (
              <SelectionOverlay
                containerRef={containerRef}
                editorRef={editorRef}
                session={selectionSession}
                setSession={setSelectionSession}
                viewportRevision={viewportRevision}
                onApply={handleSmearApply}
                onCancel={handleSmearCancel}
              />
            )}
          </div>
        </div>
        
        {/* 右侧图层面板 */}
        <div className={clsx(
          "h-full border-l bg-white flex flex-col relative z-[100] transition-all duration-300",
          isLayerPanelCollapsed ? "w-12" : "w-[360px]"
        )}>
          <LayerPanel
            layers={layers}
            activeLayerId={activeLayerId}
            selectedLayerIds={selectedLayerIds}
            setSelectedLayerIds={setSelectedLayerIds}
            onLayerSelect={layerId => handleLayerSelectWithSync(layerId, { multi: false })}
            onLayerToggleVisibility={handleLayerToggleVisibility}
            onLayerToggleLock={handleLayerToggleLock}
            onLayerRename={handleLayerRename}
            onLayerDelete={handleLayerDelete}
            onLayerAdd={handleLayerAdd}
            onLayerDuplicate={handleLayerDuplicate}
            onLayerMerge={handleLayerMerge}
            onLayerSplit={handleLayerSplit}
            onLayerClone={handleLayerClone}
            onLayerFuse={handleLayerFuse}
            onLayerSetOpacity={handleLayerSetOpacity}
            onLayerSetBlendMode={handleLayerSetBlendMode}
            layerGroups={layerGroups}
            onLayerReorder={handleLayerReorder}
            onLayerGroupCreate={handleLayerGroupCreate}
            onLayerGroupDelete={handleLayerGroupDelete}
            onLayerGroupRename={handleLayerGroupRename}
            onLayerDrop={handleLayerDrop}
            onLayerGroupDrop={handleLayerGroupDrop}
            onLayerToggleGroup={handleLayerToggleGroup}
            onLayerMergeDown={handleLayerMergeDown}
            onLayerMergeSelected={handleMergeSelectedLayers}
            onGroupSelectedLayers={handleGroupSelectedLayers}
            onClearSelection={handleClearSelection}
            isCollapsed={isLayerPanelCollapsed}
            onToggleCollapse={() => setIsLayerPanelCollapsed(!isLayerPanelCollapsed)}
            editorRef={editorRef}
          />
        </div>
      </div>
    </div>
  );
};

export default OuzhiArtPlatform;