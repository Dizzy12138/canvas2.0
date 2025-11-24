import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Tldraw, useEditor, useValue } from 'tldraw';
// 注意：我们不直接导入CSS文件，而是通过Vite处理
import Toolbar from './Toolbar';
import EnhancedLayerPanel from './EnhancedLayerPanel';
import PropertyPanel from './PropertyPanel';
import AIPanel from './AIPanel';
import ServiceManager from './ServiceManager';
import VisualWorkflowEditor from './VisualWorkflowEditor';
import MaskManager from './MaskManager';
import AlignAssistSystem from './AlignAssistSystem';
import LayerDiffViewer from './LayerDiffViewer';
import { useEnhancedLayers } from '../hooks/useEnhancedLayers';
import { useLayerHistory } from '../hooks/useLayerHistory';
import { createAssetId } from '@tldraw/tlschema';

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

// 自定义工具组件，用于与tldraw集成
const TldrawCustomTools = ({ 
  activeTool, 
  setActiveTool,
  strokeColor,
  setStrokeColor,
  fillColor,
  setFillColor,
  brushSize,
  setBrushSize,
  opacity,
  setOpacity,
  onObjectAdded,
  onObjectModified,
  onObjectDeleted
}) => {
  const editor = useEditor();
  
  // 监听选中形状的变化
  const selectedShapes = useValue('selected shapes', () => editor.getSelectedShapes(), [editor]);
  
  // 当选中形状变化时触发回调
  useEffect(() => {
    if (selectedShapes.length > 0) {
      // 触发对象修改回调
      onObjectModified?.(selectedShapes);
    }
  }, [selectedShapes, onObjectModified]);
  
  // 设置当前工具
  useEffect(() => {
    if (editor) {
      // 将我们的工具映射到tldraw工具
      const toolMap = {
        'select': 'select',
        'brush': 'draw',
        'pencil': 'draw',
        'eraser': 'erase',
        'rectangle': 'rectangle',
        'circle': 'ellipse',
        'line': 'line',
        'text': 'text'
      };
      
      const tldrawTool = toolMap[activeTool] || 'select';
      editor.setCurrentTool(tldrawTool);
    }
  }, [activeTool, editor]);
  
  // 监听形状创建事件
  useEffect(() => {
    if (!editor) return;
    
    const unsubscribe = editor.store.listen((changes) => {
      const mutation = changes.changes || {};
      const added = mutation.added || {};
      const removed = mutation.removed || {};

      Object.values(added).forEach((record) => {
        if (record.typeName === 'shape') {
          onObjectAdded?.(record);
        }
      });

      Object.values(removed).forEach((record) => {
        if (record.typeName === 'shape') {
          const shapeId = record.id || (typeof record === 'string' ? record : null);
          if (shapeId) {
            onObjectDeleted?.(shapeId);
          }
        }
      });
    });
    
    return () => unsubscribe();
  }, [editor, onObjectAdded, onObjectDeleted]);
  
  return null;
};

const ImageExtendOverlay = ({
  containerRef,
  editorRef,
  selectionBounds,
  onCommit,
  fillMode,
  onFillModeChange
}) => {
  const [dragState, setDragState] = useState(null);

  useEffect(() => {
    setDragState(null);
  }, [selectionBounds?.shapeId]);

  useEffect(() => {
    if (!dragState) return;

    const handleMove = (event) => {
      event.preventDefault();
      const editor = editorRef.current;
      if (!editor) return;
      const currentPage = editor.screenToPage({ x: event.clientX, y: event.clientY });
      const deltaX = currentPage.x - dragState.startPage.x;
      const deltaY = currentPage.y - dragState.startPage.y;
      const extend = { top: 0, right: 0, bottom: 0, left: 0 };
      switch (dragState.direction) {
        case 'left':
          extend.left = Math.max(0, -deltaX);
          break;
        case 'right':
          extend.right = Math.max(0, deltaX);
          break;
        case 'top':
          extend.top = Math.max(0, -deltaY);
          break;
        case 'bottom':
          extend.bottom = Math.max(0, deltaY);
          break;
        default:
          break;
      }
      setDragState(prev => (prev ? { ...prev, extend } : prev));
    };

    const handleUp = (event) => {
      event.preventDefault();
      const hasExtend = dragState.extend && Object.values(dragState.extend).some(value => value > 0);
      if (hasExtend) {
        onCommit?.(dragState.shapeId, dragState.extend);
      }
      setDragState(null);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);

    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
  }, [dragState, editorRef, onCommit]);

  const handlePointerDown = useCallback((direction, event) => {
    if (!selectionBounds || !editorRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    const editor = editorRef.current;
    const startPage = editor.screenToPage({ x: event.clientX, y: event.clientY });
    setDragState({
      direction,
      startPage,
      extend: { top: 0, right: 0, bottom: 0, left: 0 },
      shapeId: selectionBounds.shapeId
    });
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
    <div className="absolute inset-0 pointer-events-none select-none">
      <div
        className="absolute border-2 border-blue-400 bg-blue-200/10 pointer-events-none rounded"
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
          className="absolute bg-white border border-blue-500 rounded pointer-events-auto"
          style={{
            width: handleSize,
            height: handleSize,
            ...handle.style,
            cursor: handle.cursor
          }}
          onPointerDown={(event) => handlePointerDown(handle.key, event)}
        />
      ))}
      <div
        className="absolute pointer-events-auto bg-white/90 rounded-md shadow px-2 py-1 text-xs text-gray-600 flex items-center gap-2"
        style={{
          left: Math.max(0, selectionBounds.left),
          top: Math.max(0, selectionBounds.top - 36)
        }}
      >
        <span>填充</span>
        <button
          className={clsx(
            'px-2 py-0.5 rounded',
            fillMode === 'white' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
          )}
          onClick={() => onFillModeChange?.('white')}
        >
          白色
        </button>
        <button
          className={clsx(
            'px-2 py-0.5 rounded',
            fillMode === 'transparent' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
          )}
          onClick={() => onFillModeChange?.('transparent')}
        >
          透明
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
  viewportRevision
}) => {
  const [displayStroke, setDisplayStroke] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const strokeRef = useRef([]);

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

  useEffect(() => {
    strokeRef.current = [];
    setDisplayStroke([]);
    setIsDrawing(false);
  }, [session]);

  useEffect(() => {
    if (!isDrawing || !session) return;

    const handleMove = (event) => {
      const editor = editorRef.current;
      if (!editor) return;
      const pagePoint = editor.screenToPage({ x: event.clientX, y: event.clientY });
      const normalized = normalizePointWithinBounds(pagePoint, session.pageBounds);
      strokeRef.current = [...strokeRef.current, normalized];
      setDisplayStroke(strokeRef.current);
    };

    const handleUp = (event) => {
      event.preventDefault();
      setIsDrawing(false);
      const finalizedStroke = strokeRef.current;
      strokeRef.current = [];
      setDisplayStroke([]);
      if (finalizedStroke.length > 2) {
        setSession(prev => (prev ? { ...prev, points: finalizedStroke, status: 'ready' } : prev));
      }
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);

    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
  }, [editorRef, isDrawing, session, setSession]);

  const handlePointerDown = useCallback((event) => {
    if (!session || session.status === 'ready') return;
    event.preventDefault();
    event.stopPropagation();
    const editor = editorRef.current;
    if (!editor) return;
    const pagePoint = editor.screenToPage({ x: event.clientX, y: event.clientY });
    if (!isPointInsideBounds(pagePoint, session.pageBounds)) return;
    const normalized = normalizePointWithinBounds(pagePoint, session.pageBounds);
    strokeRef.current = [normalized];
    setDisplayStroke(strokeRef.current);
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

  return (
    <div
      className={clsx(
        'absolute inset-0',
        session.status === 'ready' ? 'pointer-events-none' : 'pointer-events-auto cursor-crosshair'
      )}
      onPointerDown={session.status === 'ready' ? undefined : handlePointerDown}
    >
      {pathData && (
        <svg className="absolute inset-0 pointer-events-none">
          <path
            d={pathData}
            fill={session.tool === 'lasso' && session.status === 'ready' ? 'rgba(59,130,246,0.2)' : 'none'}
            stroke="rgba(59,130,246,0.8)"
            strokeWidth={2}
          />
        </svg>
      )}
    </div>
  );
};

const TldrawCanvas = () => {
  const containerRef = useRef(null);
  const [activeTool, setActiveTool] = useState('select');
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [fillColor, setFillColor] = useState('transparent');
  const [brushSize, setBrushSize] = useState(3);
  const [opacity, setOpacity] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showMaskPanel, setShowMaskPanel] = useState(false);
  const [showAssistPanel, setShowAssistPanel] = useState(false);
  const [showServiceManager, setShowServiceManager] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [workflowParams, setWorkflowParams] = useState({});
  const [selectedWorkflowData, setSelectedWorkflowData] = useState(null);
  const [diffView, setDiffView] = useState(null);
  
  // 辅助系统默认设置
  const [assistSettings, setAssistSettings] = useState({
    showGrid: true,
    showRuler: false,
    showGuidelines: false,
    snapToGrid: false,
    snapToObjects: false,
    gridSize: 20
  });
  
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
    updateLayer,
    renameLayer,
    setLayerOpacity,
    setLayerBlendMode,
    reorderLayer,
    createLayerGroup,
    deleteLayerGroup,
    createMaskForLayer,
    updateMask,
    deleteMask,
    addLayerEffect,
    updateLayerEffect,
    deleteLayerEffect,
    mergeLayers,
    mergeMultipleLayers,
    splitLayer,
    duplicateLayer,
    cloneLayer,
    fuseLayers,
    renameLayerGroup
  } = useEnhancedLayers([
    { id: 'layer-1', name: '图层 1', visible: true, locked: false, opacity: 1, blendMode: 'normal', objects: [], orderIndex: 0 }
  ]);
  
  // 使用图层历史hook
  const { 
    history, 
    currentIndex: historyIndex,
    save: saveHistory,
    undo: undoHistory,
    redo: redoHistory,
    goTo: goToHistory,
    getHistoryDiff,
    applyDiffToCurrent
  } = useLayerHistory(50);

  const editorRef = useRef(null);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const layersRef = useRef(layers);
  const layerOrderGuardsRef = useRef({ fromUi: false, fromEditor: false });
  const [selectedImageInfo, setSelectedImageInfo] = useState(null);
  const [viewportRevision, setViewportRevision] = useState(0);
  const [cropFillMode, setCropFillMode] = useState('white');
  const [selectionSession, setSelectionSession] = useState(null);

  useEffect(() => {
    layersRef.current = layers;
  }, [layers]);

  useEffect(() => {
    if (!isEditorReady || !editorRef.current) return;
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
  }, [isEditorReady]);

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

  const selectionState = selectionSession
    ? { status: selectionSession.status, tool: selectionSession.tool }
    : null;
  
  // 保存历史记录
  useEffect(() => {
    saveHistory(layers, layerGroups, masks);
  }, [layers, layerGroups, masks, saveHistory]);

  const handleEditorMount = useCallback((editor) => {
    editorRef.current = editor;
    setIsEditorReady(true);
  }, []);
  
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

  const handleObjectAdded = useCallback((shape) => {
    if (!shape || !shape.id) return;
    const objectData = {
      id: shape.id,
      type: shape.type,
      data: shape,
      timestamp: Date.now()
    };
    
    setLayers(prev => prev.map(layer => {
      if (layer.id !== activeLayerId) return layer;
      const existingShapeIds = Array.isArray(layer.shapeIds) ? layer.shapeIds : [];
      const hasShape = existingShapeIds.includes(shape.id);
      return {
        ...layer,
        objects: [...(layer.objects || []), objectData],
        shapeIds: hasShape ? existingShapeIds : [...existingShapeIds, shape.id]
      };
    }));
  }, [activeLayerId, setLayers]);
  
  // 对象修改处理
  const handleObjectModified = (objs) => {
    console.log('Objects modified:', objs);
  };

  const handleObjectDeleted = useCallback((shapeId) => {
    if (!shapeId) return;
    setLayers(prev =>
      prev.map(layer => {
        const shapeIds = Array.isArray(layer.shapeIds) ? layer.shapeIds : [];
        const objects = Array.isArray(layer.objects) ? layer.objects : [];
        if (!shapeIds.includes(shapeId) && !objects.some(obj => obj.id === shapeId)) {
          return layer;
        }
        return {
          ...layer,
          shapeIds: shapeIds.filter(id => id !== shapeId),
          objects: objects.filter(obj => obj.id !== shapeId)
        };
      })
    );
  }, [setLayers]);

  const syncLayerOrderFromEditor = useCallback(() => {
    if (!editorRef.current || layerOrderGuardsRef.current.fromUi) return;
    const editor = editorRef.current;
    const currentLayers = layersRef.current;
    if (!currentLayers || currentLayers.length === 0) return;

    const pageId = editor.getCurrentPageId();
    const sortedShapeIds = editor.getSortedChildIdsForParent(pageId);
    if (!sortedShapeIds || sortedShapeIds.length === 0) return;

    const resolvedOrder = [];
    const seen = new Set();
    sortedShapeIds.forEach(shapeId => {
      const layer = currentLayers.find(l => {
        const shapeIds = getLayerShapeIds(l);
        return shapeIds.includes(shapeId);
      });
      if (layer && !seen.has(layer.id)) {
        resolvedOrder.push(layer.id);
        seen.add(layer.id);
      }
    });

    if (resolvedOrder.length === 0) return;

    const currentOrder = [...currentLayers]
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map(layer => layer.id);

    if (arraysEqual(resolvedOrder, currentOrder)) return;

    layerOrderGuardsRef.current.fromEditor = true;
    setLayers(prev => {
      const map = new Map(prev.map(layer => [layer.id, layer]));
      const orderedLayers = [];
      resolvedOrder.forEach(id => {
        if (map.has(id)) {
          orderedLayers.push(map.get(id));
          map.delete(id);
        }
      });
      map.forEach(layer => orderedLayers.push(layer));
      return orderedLayers.map((layer, index) =>
        layer.orderIndex === index ? layer : { ...layer, orderIndex: index }
      );
    });
    requestAnimationFrame(() => {
      layerOrderGuardsRef.current.fromEditor = false;
    });
  }, [getLayerShapeIds, setLayers]);

  useEffect(() => {
    if (!isEditorReady || !editorRef.current) return;
    const editor = editorRef.current;

    const unsubscribe = editor.store.listen((changes) => {
      const mutation = changes.changes || {};
      const added = mutation.added || {};
      const removed = mutation.removed || {};
      const updated = mutation.updated || {};
      const hasShapeMutation =
        Object.values(added).some(record => record.typeName === 'shape') ||
        Object.values(removed).some(record => record.typeName === 'shape') ||
        Object.values(updated).some(record => record.typeName === 'shape');

      if (hasShapeMutation && !layerOrderGuardsRef.current.fromEditor) {
        syncLayerOrderFromEditor();
      }
    });

    syncLayerOrderFromEditor();

    return () => unsubscribe();
  }, [isEditorReady, syncLayerOrderFromEditor]);

  const moveLayerShapesInEditor = useCallback((layerId, targetIndex) => {
    const editor = editorRef.current;
    if (!editor) return;
    const orderedLayers = [...(layersRef.current || [])].sort((a, b) => a.orderIndex - b.orderIndex);
    const currentIndex = orderedLayers.findIndex(layer => layer.id === layerId);
    if (currentIndex === -1 || targetIndex === currentIndex) return;

    const layer = orderedLayers[currentIndex];
    const shapeIds = getLayerShapeIds(layer);
    if (shapeIds.length === 0) return;

    const steps = targetIndex - currentIndex;
    if (steps === 0) return;

    editor.markHistoryStoppingPoint('layer-order-panel');
    if (steps > 0) {
      for (let i = 0; i < steps; i++) {
        editor.bringForward(shapeIds, { considerAllShapes: true });
      }
    } else {
      for (let i = 0; i < Math.abs(steps); i++) {
        editor.sendBackward(shapeIds, { considerAllShapes: true });
      }
    }
  }, [getLayerShapeIds]);

  const autoExtendCrop = useCallback(async (shapeId, extend) => {
    if (!editorRef.current) return;
    const editor = editorRef.current;
    const shape = editor.getShape(shapeId);
    if (!shape || shape.type !== 'image') return;

    const assetId = shape.props?.assetId;
    if (!assetId) return;
    const asset = editor.getAsset(assetId);
    if (!asset || asset.type !== 'image') return;
    const src = asset.props?.src;
    if (!src) return;

    const extendValues = {
      left: Math.max(0, extend?.left || 0),
      right: Math.max(0, extend?.right || 0),
      top: Math.max(0, extend?.top || 0),
      bottom: Math.max(0, extend?.bottom || 0)
    };

    if (
      extendValues.left === 0 &&
      extendValues.right === 0 &&
      extendValues.top === 0 &&
      extendValues.bottom === 0
    ) {
      return;
    }

    try {
      const imageElement = await loadImageElement(src);
      const originalWidth = asset.props?.w || imageElement.width;
      const originalHeight = asset.props?.h || imageElement.height;
      const scaleX = shape.props.w > 0 ? originalWidth / shape.props.w : 1;
      const scaleY = shape.props.h > 0 ? originalHeight / shape.props.h : 1;
      const extendPixels = {
        left: Math.round(extendValues.left * scaleX),
        right: Math.round(extendValues.right * scaleX),
        top: Math.round(extendValues.top * scaleY),
        bottom: Math.round(extendValues.bottom * scaleY)
      };

      const newWidthPx = originalWidth + extendPixels.left + extendPixels.right;
      const newHeightPx = originalHeight + extendPixels.top + extendPixels.bottom;

      const canvas = document.createElement('canvas');
      canvas.width = newWidthPx;
      canvas.height = newHeightPx;
      const ctx = canvas.getContext('2d');

      if (cropFillMode !== 'transparent') {
        ctx.fillStyle = cropFillMode || '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }

      ctx.drawImage(imageElement, extendPixels.left, extendPixels.top, originalWidth, originalHeight);

      const mimeType = asset.props?.mimeType || 'image/png';
      const dataUrl = canvas.toDataURL(mimeType);
      const newAssetId = createAssetId();

      editor.createAssets([
        {
          id: newAssetId,
          typeName: 'asset',
          type: 'image',
          props: {
            ...asset.props,
            w: newWidthPx,
            h: newHeightPx,
            src: dataUrl,
            mimeType
          },
          meta: asset.meta || {}
        }
      ]);

      const newShapeWidth = shape.props.w + extendValues.left + extendValues.right;
      const newShapeHeight = shape.props.h + extendValues.top + extendValues.bottom;
      editor.markHistoryStoppingPoint('auto-extend-crop');
      editor.updateShapes([
        {
          ...shape,
          x: shape.x - extendValues.left,
          y: shape.y - extendValues.top,
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
              x: (bounds.x || 0) + extendValues.left,
              y: (bounds.y || 0) + extendValues.top,
              width: (bounds.width || 0) + extendValues.left + extendValues.right,
              height: (bounds.height || 0) + extendValues.top + extendValues.bottom
            }
          });
        }
      }
    } catch (error) {
      console.error('Failed to extend image bounds:', error);
    }
  }, [cropFillMode, getLayerShapeIds, masks, setLayers, updateMask]);

  const startSelectionSession = useCallback((toolType) => {
    if (!editorRef.current || !activeLayerId) return;
    const editor = editorRef.current;
    const targetLayer = layers.find(layer => layer.id === activeLayerId);
    if (!targetLayer) {
      console.warn('未找到可用的图层来创建选区');
      return;
    }
    const shapeId = getLayerShapeIds(targetLayer)[0];
    if (!shapeId) {
      console.warn('当前图层没有可用的图像形状');
      return;
    }
    const shape = editor.getShape(shapeId);
    if (!shape || shape.type !== 'image') {
      console.warn('当前仅支持对图像图层进行选区操作');
      return;
    }
    const bounds = editor.getShapePageBounds(shapeId);
    if (!bounds) return;
    setSelectionSession({
      tool: toolType,
      layerId: targetLayer.id,
      shapeId,
      pageBounds: bounds,
      points: [],
      status: 'drawing'
    });
  }, [activeLayerId, editorRef, getLayerShapeIds, layers]);

  const cancelSelectionSession = useCallback(() => {
    setSelectionSession(null);
  }, []);

  const applySelectionCrop = useCallback(async (mode) => {
    if (!selectionSession || selectionSession.points.length < 2 || !editorRef.current) return;
    const editor = editorRef.current;
    const shape = editor.getShape(selectionSession.shapeId);
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

      if (selectionSession.tool === 'brush') {
        const brushPx = Math.max(
          2,
          (brushSize || 1) * (originalWidth / (selectionSession.pageBounds.width || selectionSession.pageBounds.w || 1))
        );
        maskCtx.lineWidth = brushPx;
        maskCtx.beginPath();
        selectionSession.points.forEach((point, index) => {
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
        selectionSession.points.forEach((point, index) => {
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
          if (!shapeIds.includes(selectionSession.shapeId)) return layer;
          return {
            ...layer,
            objects: (layer.objects || []).map(obj =>
              obj.id === selectionSession.shapeId
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

      createMaskForLayer(selectionSession.layerId, {
        type: `selection-${selectionSession.tool}`,
        data: selectionSession.points,
        inverted: mode === 'inverse',
        bounds: {
          x: selectionSession.pageBounds.minX,
          y: selectionSession.pageBounds.minY,
          width: selectionSession.pageBounds.width ?? selectionSession.pageBounds.w ?? 0,
          height: selectionSession.pageBounds.height ?? selectionSession.pageBounds.h ?? 0
        }
      });

      setSelectionSession(null);
    } catch (error) {
      console.error('Failed to apply selection crop:', error);
    }
  }, [brushSize, createMaskForLayer, getLayerShapeIds, selectionSession, setLayers]);
  
  // 工具切换
  const handleToolChange = (toolId) => {
    console.log('切换工具到:', toolId);
    setActiveTool(toolId);
    
    if (toolId === 'mask' || toolId === 'clip') {
      setShowMaskPanel(true);
      setShowAssistPanel(false);
    } else if (['grid', 'ruler', 'guideline', 'snap', 'align', 'symmetry'].includes(toolId)) {
      setShowAssistPanel(true);
      setShowMaskPanel(false);
      
      if (toolId === 'grid') {
        console.log('启用网格辅助');
        setAssistSettings(prev => ({ ...prev, showGrid: true }));
      } else if (toolId === 'ruler') {
        console.log('启用标尺辅助');
        setAssistSettings(prev => ({ ...prev, showRuler: true }));
      } else if (toolId === 'guideline') {
        console.log('启用参考线辅助');
        setAssistSettings(prev => ({ ...prev, showGuidelines: true }));
      }
    } else {
      setShowMaskPanel(false);
      setShowAssistPanel(false);
    }
  };
  
  const handleAction = (actionId) => {
    switch (actionId) {
      case 'undo':
        undoHistory();
        break;
      case 'redo':
        redoHistory();
        break;
      case 'save':
        // TODO: 实现保存功能
        console.log('保存项目');
        break;
      case 'open':
        console.log('打开项目');
        break;
      case 'import':
        // TODO: 实现导入功能
        console.log('导入文件');
        break;
      case 'export':
        // TODO: 实现导出功能
        console.log('导出文件');
        break;
      default:
        break;
    }
  };
  
  const handleLayerDelete = (layerId) => {
    deleteLayer(layerId);
  };
  
  const handleLayerAdd = () => {
    const newLayer = addLayer();
    console.log('New layer added:', newLayer);
  };
  
  const handleLayerRename = (layerId, newName) => {
    renameLayer(layerId, newName);
  };
  
  const handleLayerToggleLock = (layerId) => {
    toggleLayerLock(layerId);
  };
  
  const handleLayerReorder = useCallback((layerId, newIndex) => {
    layerOrderGuardsRef.current.fromUi = true;
    reorderLayer(layerId, newIndex);
    moveLayerShapesInEditor(layerId, newIndex);
    requestAnimationFrame(() => {
      layerOrderGuardsRef.current.fromUi = false;
    });
  }, [moveLayerShapesInEditor, reorderLayer]);

  const handleSelectionCrop = useCallback(() => {
    applySelectionCrop('crop');
  }, [applySelectionCrop]);

  const handleSelectionInverseCrop = useCallback(() => {
    applySelectionCrop('inverse');
  }, [applySelectionCrop]);
  
  const handleMaskCreate = (layerId, shape) => {
    console.log('Creating mask for layer:', layerId, 'with shape:', shape);
    setActiveTool(shape === 'rectangle' ? 'mask' : 'clip');
  };
  
  const handleMaskCreated = (maskData) => {
    console.log('Mask created:', maskData);
    setLayers(prev => prev.map(layer =>
      layer.id === maskData.layerId 
        ? { ...layer, hasMask: true, maskData }
        : layer
    ));
  };
  
  const handleMaskApplied = (maskData) => {
    console.log('Mask applied:', maskData);
  };
  
  const handleMaskRemove = (layerId) => {
    setLayers(prev => prev.map(layer =>
      layer.id === layerId 
        ? { ...layer, hasMask: false, maskData: null }
        : layer
    ));
  };
  
  const handleMaskToggle = (layerId, visible) => {
    setLayers(prev => prev.map(layer =>
      layer.id === layerId && layer.maskData 
        ? { ...layer, maskData: { ...layer.maskData, visible } }
        : layer
    ));
  };
  
  const handleAssistToggle = (assistType) => {
    console.log('Assist toggle:', assistType);
    setShowAssistPanel(true);
  };
  
  const handleToggleGrid = () => {
    console.log('切换网格显示:', !assistSettings.showGrid);
    setAssistSettings(prev => ({ ...prev, showGrid: !prev.showGrid }));
  };
  
  const handleToggleRuler = () => {
    setAssistSettings(prev => ({ ...prev, showRuler: !prev.showRuler }));
  };
  
  const handleToggleGuidelines = () => {
    setAssistSettings(prev => ({ ...prev, showGuidelines: !prev.showGuidelines }));
  };
  
  const handleToggleSnapToGrid = () => {
    setAssistSettings(prev => ({ ...prev, snapToGrid: !prev.snapToGrid }));
  };
  
  const handleToggleSnapToObjects = () => {
    setAssistSettings(prev => ({ ...prev, snapToObjects: !prev.snapToObjects }));
  };
  
  const handleAlign = (alignType, objects) => {
    console.log('Align operation:', alignType, objects);
  };
  
  const handleDistribute = (distributeType, objects) => {
    console.log('Distribute operation:', distributeType, objects);
  };
  
  const handleSymmetry = (symmetryType, objects) => {
    console.log('Symmetry operation:', symmetryType, objects);
  };
  
  // AI 生成处理
  const handleAIGenerate = async (request) => {
    setIsGenerating(true);
    try {
      console.log('AI 生成请求:', request);
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (error) {
      console.error('AI 生成失败:', error);
    } finally {
      setIsGenerating(false);
    }
  };
  
  // 图层组重命名处理
  const handleLayerGroupRename = (groupId, newName) => {
    renameLayerGroup(groupId, newName);
  };
  
  // 图层组切换处理
  const handleLayerGroupToggle = (groupId) => {
    console.log('Toggle group:', groupId);
  };
  
  // 图层合并处理
  const handleLayerMerge = ({ targetLayerId, sourceLayerIds }) => {
    mergeMultipleLayers(targetLayerId, sourceLayerIds);
  };
  
  // 图层拆分处理
  const handleLayerSplit = (layerId) => {
    splitLayer(layerId);
  };
  
  // 图层克隆处理
  const handleLayerClone = (layerId) => {
    cloneLayer(layerId);
  };
  
  // 跨图层融合处理
  const handleFusionStart = ({ sourceLayerId, targetLayerId, mode, strength }) => {
    fuseLayers(sourceLayerId, targetLayerId, mode, strength);
  };
  
  // 历史记录跳转
  const handleHistoryGoTo = (index) => {
    const state = goToHistory(index);
    if (state) {
      setLayers(state.layers);
    }
  };
  
  // 历史记录撤销
  const handleHistoryUndo = () => {
    const state = undoHistory();
    if (state) {
      setLayers(state.layers);
    }
  };
  
  // 历史记录重做
  const handleHistoryRedo = () => {
    const state = redoHistory();
    if (state) {
      setLayers(state.layers);
    }
  };
  
  // 历史记录比较
  const handleHistoryCompare = (index1, index2) => {
    const diff = getHistoryDiff(index1, index2);
    setDiffView(diff);
  };
  
  // 撤销变更
  const handleRevertChange = (type, action, data) => {
    console.log('Revert change:', type, action, data);
  };
  
  return (
    <div className="w-full h-screen bg-gray-50 flex">
      <Toolbar
        activeTool={activeTool}
        onToolChange={handleToolChange}
        onAction={handleAction}
        className="w-16 h-full border-r"
      />
      
      <div className="flex-1 flex">
        <div ref={containerRef} className="flex-1 relative overflow-hidden">
          <div style={{ position: 'absolute', inset: 0 }}>
            <Tldraw onMount={handleEditorMount}>
              <TldrawCustomTools
                activeTool={activeTool}
                setActiveTool={setActiveTool}
                strokeColor={strokeColor}
                setStrokeColor={setStrokeColor}
                fillColor={fillColor}
                setFillColor={setFillColor}
                brushSize={brushSize}
                setBrushSize={setBrushSize}
                opacity={opacity}
                setOpacity={setOpacity}
                onObjectAdded={handleObjectAdded}
                onObjectModified={handleObjectModified}
                onObjectDeleted={handleObjectDeleted}
              />
            </Tldraw>
          </div>
          {selectionScreenBounds && !selectionSession && (
            <ImageExtendOverlay
              containerRef={containerRef}
              editorRef={editorRef}
              selectionBounds={selectionScreenBounds}
              onCommit={autoExtendCrop}
              fillMode={cropFillMode}
              onFillModeChange={setCropFillMode}
            />
          )}
          {selectionSession && (
            <SelectionOverlay
              containerRef={containerRef}
              editorRef={editorRef}
              session={selectionSession}
              setSession={setSelectionSession}
              viewportRevision={viewportRevision}
            />
          )}
          {jobs.length > 0 && (
            <div className="panel p-3 absolute top-4 right-4">
              <div className="text-xs text-gray-500 mb-1">任务</div>
              <ul className="space-y-1 max-h-24 overflow-auto">
                {jobs.map(j => (
                  <li key={j.jobId} className="text-xs text-gray-600">{j.jobId.slice(0,8)} · {j.status} · {j.progress ?? 0}%</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        
        <div className="w-80 h-full border-l bg-white overflow-y-auto">
          <div className="space-y-4 p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-gray-900">配置</div>
              <button onClick={() => setShowServiceManager(true)} className="text-xs underline">AI 服务设置</button>
            </div>
            
            {showAssistPanel && (
              <AlignAssistSystem
                showGrid={assistSettings.showGrid}
                showRuler={assistSettings.showRuler}
                showGuidelines={assistSettings.showGuidelines}
                snapToGrid={assistSettings.snapToGrid}
                snapToObjects={assistSettings.snapToObjects}
                onToggleGrid={handleToggleGrid}
                onToggleRuler={handleToggleRuler}
                onToggleGuidelines={handleToggleGuidelines}
                onToggleSnapToGrid={handleToggleSnapToGrid}
                onToggleSnapToObjects={handleToggleSnapToObjects}
                onAlign={handleAlign}
                onDistribute={handleDistribute}
                onSymmetry={handleSymmetry}
              />
            )}
            
            {showMaskPanel && (
              <MaskManager
                layers={layers}
                activeLayerId={activeLayerId}
                onMaskCreate={handleMaskCreate}
                onMaskApply={handleMaskApplied}
                onMaskRemove={handleMaskRemove}
                onMaskToggle={handleMaskToggle}
                selectionState={selectionState}
                onSelectionToolChange={startSelectionSession}
                onSelectionCrop={handleSelectionCrop}
                onSelectionInverseCrop={handleSelectionInverseCrop}
                onSelectionCancel={cancelSelectionSession}
              />
            )}
            
            <PropertyPanel
              strokeColor={strokeColor}
              fillColor={fillColor}
              strokeWidth={brushSize}
              opacity={opacity}
              activeTool={activeTool}
              onStrokeColorChange={setStrokeColor}
              onFillColorChange={setFillColor}
              onStrokeWidthChange={setBrushSize}
              onOpacityChange={setOpacity}
            />
            
            <EnhancedLayerPanel
              layers={layers}
              layerGroups={layerGroups}
              activeLayerId={activeLayerId}
              masks={masks}
              history={history}
              historyIndex={historyIndex}
              onLayerSelect={setActiveLayerId}
              onLayerAdd={handleLayerAdd}
              onLayerDelete={handleLayerDelete}
              onLayerToggleVisibility={toggleLayerVisibility}
              onLayerToggleLock={handleLayerToggleLock}
              onLayerRename={handleLayerRename}
              onLayerReorder={handleLayerReorder}
              onLayerSetOpacity={setLayerOpacity}
              onLayerSetBlendMode={setLayerBlendMode}
              onLayerGroupCreate={createLayerGroup}
              onLayerGroupDelete={deleteLayerGroup}
              onLayerGroupRename={handleLayerGroupRename}
              onLayerGroupToggle={handleLayerGroupToggle}
              onMaskCreate={handleMaskCreate}
              onLayerMerge={handleLayerMerge}
              onLayerSplit={handleLayerSplit}
              onLayerClone={handleLayerClone}
              onFusionStart={handleFusionStart}
              onHistoryGoTo={handleHistoryGoTo}
              onHistoryUndo={handleHistoryUndo}
              onHistoryRedo={handleHistoryRedo}
              onHistoryCompare={handleHistoryCompare}
            />
            
            {diffView && (
              <LayerDiffViewer
                diff={diffView}
                beforeState={history[historyIndex - 1]}
                afterState={history[historyIndex]}
                onRevertChange={handleRevertChange}
              />
            )}
            
            <AIPanel
              onGenerate={handleAIGenerate}
              isGenerating={isGenerating}
              onWorkflowChange={setSelectedWorkflowData}
            />
            
            <VisualWorkflowEditor
              workflowData={selectedWorkflowData}
              onParameterChange={setWorkflowParams}
              onSaveWorkflow={() => console.log('Save workflow')}
              onLoadWorkflow={() => console.log('Load workflow')}
            />
            
            {showServiceManager && (
              <ServiceManager 
                open={showServiceManager} 
                onClose={() => setShowServiceManager(false)} 
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TldrawCanvas;