import React, { useRef, useState, useEffect } from 'react';
import { useLayers } from '../hooks/useLayers';
import { useHistory } from '../hooks/useHistory';
import { useDrawing } from '../hooks/useDrawing';
import { useRenderer } from '../hooks/useRenderer';
import Toolbar from './Toolbar';
import LayerPanel from './LayerPanel';
import PropertyPanel from './PropertyPanel';
import AIPanel from './AIPanel';

const AICanvasTool = () => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  console.log('AICanvasTool component rendered');

  const { 
    layers, 
    activeLayerId, 
    setLayers, 
    addLayer,
    deleteLayer,
    setActiveLayerId,
    toggleLayerVisibility,
    toggleLayerLock,
    updateLayer
  } = useLayers([
    { id: 'layer-1', name: '图层 1', visible: true, locked: false, opacity: 1, objects: [] }
  ]);
  const { save, current, resumeRecording, undo, redo } = useHistory(50);

  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1, rotation: 0 });
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [fillColor, setFillColor] = useState('transparent');
  const [brushSize, setBrushSize] = useState(3);
  const [opacity, setOpacity] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);

  const screenToCanvas = (screenX, screenY) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const x = (screenX - rect.left - transform.x) / transform.scale;
    const y = (screenY - rect.top - transform.y) / transform.scale;
    return { x, y };
  };

  const addObject = (obj) => {
    setLayers(prev => prev.map(layer =>
      layer.id === activeLayerId ? { ...layer, objects: [...layer.objects, obj] } : layer
    ));
    save({ layers: JSON.parse(JSON.stringify(layers)), activeLayerId });
  };

  const drawing = useDrawing({ screenToCanvas, addObject, layers, activeLayerId });
  const { renderCanvas } = useRenderer({ canvasRef, layers, transform, drawing: { ...drawing, strokeColor, fillColor, brushSize } });

  // 初始化画布尺寸
  useEffect(() => {
    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // 工具栏操作处理
  const handleToolChange = (toolId) => {
    drawing.setActiveTool(toolId);
  };

  const handleAction = (actionId) => {
    switch (actionId) {
      case 'undo':
        undo();
        break;
      case 'redo':
        redo();
        break;
      case 'save':
        // TODO: 实现保存功能
        console.log('保存项目');
        break;
      case 'open':
        // TODO: 实现打开功能
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

  // 图层操作处理
  const handleLayerRename = (layerId, newName) => {
    updateLayer(layerId, (layer) => ({ name: newName }));
  };

  const handleLayerToggleLock = (layerId) => {
    updateLayer(layerId, (layer) => ({ locked: !layer.locked }));
  };

  const handleLayerReorder = (layerId, newIndex) => {
    const currentIndex = layers.findIndex(layer => layer.id === layerId);
    if (currentIndex === -1) return;
    
    const newLayers = [...layers];
    const [movedLayer] = newLayers.splice(currentIndex, 1);
    newLayers.splice(newIndex, 0, movedLayer);
    setLayers(newLayers);
  };

  // AI生成处理
  const handleAIGenerate = async (request) => {
    setIsGenerating(true);
    try {
      // TODO: 实现AI生成逻辑
      console.log('AI生成请求:', request);
      // 模拟异步操作
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (error) {
      console.error('AI生成失败:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="w-full h-screen bg-gray-50 flex">
      {/* 左侧工具栏 */}
      <Toolbar
        activeTool={drawing.activeTool}
        onToolChange={handleToolChange}
        onAction={handleAction}
        className="w-16 h-full border-r"
      />

      {/* 主画布区域 */}
      <div className="flex-1 flex">
        <div ref={containerRef} className="flex-1 relative overflow-hidden">
          <canvas 
            ref={canvasRef} 
            className="w-full h-full cursor-crosshair block" 
            style={{
              touchAction: 'none',  // 禁用视视口缩放等手势
              imageRendering: 'pixelated' // 保持像素精确
            }}
            onMouseDown={(e) => {
              console.log('Mouse down event:', e);
              drawing.handlePointerDown(e);
            }}
            onMouseMove={(e) => {
              drawing.handlePointerMove(e);
            }}
            onMouseUp={(e) => {
              console.log('Mouse up event:', e);
              drawing.handlePointerUp({
                strokeColor,
                fillColor: drawing.activeTool === 'eraser' ? 'transparent' : fillColor,
                strokeWidth: brushSize,
                opacity: drawing.activeTool === 'eraser' ? 0 : opacity
              });
            }}
          />
        </div>

        {/* 右侧面板区域 */}
        <div className="w-80 h-full border-l bg-white overflow-y-auto">
          <div className="space-y-4 p-4">
            {/* 属性面板 */}
            <PropertyPanel
              strokeColor={strokeColor}
              fillColor={fillColor}
              strokeWidth={brushSize}
              opacity={opacity}
              activeTool={drawing.activeTool}
              onStrokeColorChange={setStrokeColor}
              onFillColorChange={setFillColor}
              onStrokeWidthChange={setBrushSize}
              onOpacityChange={setOpacity}
            />

            {/* 图层面板 */}
            <LayerPanel
              layers={layers}
              activeLayerId={activeLayerId}
              onLayerSelect={setActiveLayerId}
              onLayerAdd={addLayer}
              onLayerDelete={deleteLayer}
              onLayerToggleVisibility={toggleLayerVisibility}
              onLayerToggleLock={handleLayerToggleLock}
              onLayerRename={handleLayerRename}
              onLayerReorder={handleLayerReorder}
            />

            {/* AI面板 */}
            <AIPanel
              onGenerate={handleAIGenerate}
              isGenerating={isGenerating}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AICanvasTool;
