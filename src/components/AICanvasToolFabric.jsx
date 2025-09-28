import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLayers } from '../hooks/useLayers';
import { useHistory } from '../hooks/useHistory';
import FabricCanvas from './FabricCanvasFixed';
import Toolbar from './Toolbar';
import LayerPanel from './LayerPanel';
import PropertyPanel from './PropertyPanel';
import AIPanel from './AIPanel';
import MaskManager from './MaskManager';
import AlignAssistSystem from './AlignAssistSystem';
import CanvasDebugger from '../utils/CanvasDebugger';

const AICanvasToolFabric = () => {
  const fabricCanvasRef = useRef(null);
  const containerRef = useRef(null);

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

  const [activeTool, setActiveTool] = useState('brush');
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [fillColor, setFillColor] = useState('transparent');
  const [brushSize, setBrushSize] = useState(3);
  const [opacity, setOpacity] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [showMaskPanel, setShowMaskPanel] = useState(false);
  const [showAssistPanel, setShowAssistPanel] = useState(false);
  const [canvasReady, setCanvasReady] = useState(false); // 追踪画布是否就绪
  
  // 辅助系统状态
  const [assistSettings, setAssistSettings] = useState({
    showGrid: false,
    showRuler: false,
    showGuidelines: false,
    snapToGrid: false,
    snapToObjects: false,
    gridSize: 20
  });

  // 画布尺寸调整
  useEffect(() => {
    const updateCanvasSize = () => {
      const container = containerRef.current;
      if (!container) return;
      
      const rect = container.getBoundingClientRect();
      setCanvasSize({
        width: Math.floor(rect.width - 40), // 留一些边距
        height: Math.floor(rect.height - 40)
      });
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    
    return () => {
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, []);

  // 存储真实的Canvas实例
  const [fabricCanvas, setFabricCanvas] = useState(null);

  // Canvas就绪回调
  const handleCanvasReady = useCallback((canvas) => {
    console.log('🚀 Canvas就绪回调被调用:', canvas);
    console.log('🔍 Canvas检查详情:', {
      canvas,
      constructor: canvas?.constructor?.name,
      hasOnMethod: typeof canvas?.on === 'function',
      hasRenderAll: typeof canvas?.renderAll === 'function',
      width: canvas?.width,
      height: canvas?.height
    });
    
    // 更宽松的Fabric.js Canvas检查
    const isValidFabricCanvas = canvas && 
      typeof canvas === 'object' &&
      (canvas.constructor?.name === 'Canvas' || canvas.constructor?.name === 'klass') &&
      typeof canvas.on === 'function' && 
      typeof canvas.getActiveObjects === 'function' &&
      typeof canvas.renderAll === 'function';
    
    if (isValidFabricCanvas) {
      setFabricCanvas(canvas);  // 直接设置Canvas实例
      setCanvasReady(true);
      console.log('✅ Canvas实例已设置并标记为就绪');
    } else {
      console.warn('❌ Canvas实例无效，缺少必要方法或构造函数不正确');
      console.log('详细检查:', {
        constructorName: canvas?.constructor?.name,
        hasOn: typeof canvas?.on === 'function',
        hasGetActiveObjects: typeof canvas?.getActiveObjects === 'function',
        hasRenderAll: typeof canvas?.renderAll === 'function'
      });
    }
  }, []);

  // 监听画布初始化状态 - 使用直接传递的Canvas实例
  useEffect(() => {
    let mounted = true;
    
    if (fabricCanvas) {
      console.log('✅ 使用直接传递的Canvas实例:', fabricCanvas);
      
      // 立即调试Canvas
      const debugResult = CanvasDebugger.debugCanvas(fabricCanvas, 'Direct Canvas Instance');
      
      // 使用CanvasDebugger的验证结果
      if (debugResult.isValid && debugResult.isFabricCanvas) {
        console.log('✅ Direct Canvas实例验证通过!');
        setCanvasReady(true);
      } else {
        console.warn('❌ Direct Canvas实例验证失败');
        console.log('验证结果:', debugResult);
        setCanvasReady(false);
      }
    } else {
      console.log('⏳ 等待Canvas实例传递...');
      setCanvasReady(false);
    }
    
    return () => {
      mounted = false;
    };
  }, [fabricCanvas]); // 依赖fabricCanvas实例

  // 处理对象添加
  const handleObjectAdded = (obj, layerId) => {
    console.log('Object added to layer:', layerId, obj);
    // 这里可以将对象添加到图层数据中
    const objectData = {
      id: `obj-${Date.now()}`,
      type: obj.type,
      data: obj.toObject(),
      timestamp: Date.now()
    };
    
    setLayers(prev => prev.map(layer =>
      layer.id === layerId 
        ? { ...layer, objects: [...layer.objects, objectData] } 
        : layer
    ));
    
    // 保存到历史记录
    save({ layers: JSON.parse(JSON.stringify(layers)), activeLayerId });
  };

  // 处理对象修改
  const handleObjectModified = (obj) => {
    console.log('Object modified:', obj);
    // 更新图层数据
    save({ layers: JSON.parse(JSON.stringify(layers)), activeLayerId });
  };

  // 工具栏操作处理
  const handleToolChange = (toolId) => {
    setActiveTool(toolId);
    
    // 当选择蒙版工具时显示蒙版面板
    if (toolId === 'mask' || toolId === 'clip') {
      setShowMaskPanel(true);
      setShowAssistPanel(false);
    } 
    // 当选择辅助工具时显示辅助面板
    else if (['grid', 'ruler', 'guideline', 'snap', 'align', 'symmetry'].includes(toolId)) {
      setShowAssistPanel(true);
      setShowMaskPanel(false);
    } else {
      setShowMaskPanel(false);
      setShowAssistPanel(false);
    }
  };

  const handleAction = (actionId) => {
    const canvas = fabricCanvasRef.current;
    
    switch (actionId) {
      case 'undo':
        undo();
        break;
      case 'redo':
        redo();
        break;
      case 'save':
        if (canvas && canvas.exportCanvas) {
          const data = canvas.exportCanvas('json');
          console.log('保存项目数据:', data);
          // TODO: 实现保存到服务器
        }
        break;
      case 'open':
        // TODO: 实现打开功能
        console.log('打开项目');
        break;
      case 'import':
        // 创建文件输入
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
          const file = e.target.files[0];
          if (file && canvas && canvas.importCanvas) {
            const reader = new FileReader();
            reader.onload = (event) => {
              canvas.importCanvas(event.target.result);
            };
            reader.readAsDataURL(file);
          }
        };
        input.click();
        break;
      case 'export':
        if (canvas && canvas.exportCanvas) {
          const dataURL = canvas.exportCanvas('png');
          const link = document.createElement('a');
          link.download = 'canvas-export.png';
          link.href = dataURL;
          link.click();
        }
        break;
      default:
        break;
    }
  };

  const handleLayerDelete = (layerId) => {
    // 使用canvas的图层删除功能
    const canvas = fabricCanvasRef.current;
    if (canvas && canvas.deleteActiveLayer) {
      canvas.deleteActiveLayer(layerId);
    }
    
    // 从状态中删除图层
    deleteLayer(layerId);
  };

  const handleLayerAdd = () => {
    const newLayer = addLayer();
    console.log('New layer added:', newLayer);
  };
  const handleLayerRename = (layerId, newName) => {
    updateLayer(layerId, (layer) => ({ name: newName }));
  };

  const handleLayerToggleLock = (layerId) => {
    updateLayer(layerId, (layer) => ({ locked: !layer.locked }));
  };

  const handleLayerReorder = (layerId, newIndex) => {
    const currentIndex = layers.findIndex(layer => layer.id === layerId);
    if (currentIndex === -1) return;
    
    // 更新图层数组顺序
    const newLayers = [...layers];
    const [movedLayer] = newLayers.splice(currentIndex, 1);
    newLayers.splice(newIndex, 0, movedLayer);
    setLayers(newLayers);
    
    // 同时更新Fabric.js中对象的Z-index
    const canvas = fabricCanvasRef.current;
    if (canvas && canvas.reorderLayerObjects) {
      const direction = newIndex < currentIndex ? 'up' : 'down';
      canvas.reorderLayerObjects(layerId, direction);
    }
  };

  // 蒙版处理函数
  const handleMaskCreate = (layerId, shape) => {
    console.log('Creating mask for layer:', layerId, 'with shape:', shape);
    // 设置当前工具为蒙版工具
    setActiveTool(shape === 'rectangle' ? 'mask' : 'clip');
  };

  const handleMaskCreated = (maskData) => {
    console.log('Mask created:', maskData);
    // 可以在这里更新图层状态，标记该图层已应用蒙版
    setLayers(prev => prev.map(layer =>
      layer.id === maskData.layerId 
        ? { ...layer, hasMask: true, maskData }
        : layer
    ));
  };

  const handleMaskApplied = (maskData) => {
    console.log('Mask applied:', maskData);
    // 保存到历史记录
    save({ layers: JSON.parse(JSON.stringify(layers)), activeLayerId });
  };

  const handleMaskRemove = (layerId) => {
    const canvas = fabricCanvasRef.current;
    if (canvas && canvas.removeMaskFromLayerById) {
      canvas.removeMaskFromLayerById(layerId);
    }
    
    // 更新图层状态
    setLayers(prev => prev.map(layer =>
      layer.id === layerId 
        ? { ...layer, hasMask: false, maskData: null }
        : layer
    ));
    
    save({ layers: JSON.parse(JSON.stringify(layers)), activeLayerId });
  };

  const handleMaskToggle = (layerId, visible) => {
    const canvas = fabricCanvasRef.current;
    if (canvas && canvas.toggleMaskVisibility) {
      canvas.toggleMaskVisibility(layerId, visible);
    }
    
    // 更新图层状态
    setLayers(prev => prev.map(layer =>
      layer.id === layerId && layer.maskData 
        ? { ...layer, maskData: { ...layer.maskData, visible } }
        : layer
    ));
  };

  // 辅助系统处理函数
  const handleAssistToggle = (assistType) => {
    console.log('Assist toggle:', assistType);
    setShowAssistPanel(true);
  };

  const handleToggleGrid = () => {
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
    save({ layers: JSON.parse(JSON.stringify(layers)), activeLayerId });
  };

  const handleDistribute = (distributeType, objects) => {
    console.log('Distribute operation:', distributeType, objects);
    save({ layers: JSON.parse(JSON.stringify(layers)), activeLayerId });
  };

  const handleSymmetry = (symmetryType, objects) => {
    console.log('Symmetry operation:', symmetryType, objects);
    save({ layers: JSON.parse(JSON.stringify(layers)), activeLayerId });
  };

  // AI生成处理
  const handleAIGenerate = async (request) => {
    setIsGenerating(true);
    try {
      console.log('AI生成请求:', request);
      // 模拟异步操作
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // 模拟生成的图像添加到画布
      const canvas = fabricCanvasRef.current;
      if (canvas && canvas.importCanvas) {
        // 这里应该是从AI服务获取的图像
        console.log('AI生成完成，添加到画布...');
      }
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
        activeTool={activeTool}
        onToolChange={handleToolChange}
        onAction={handleAction}
        className="w-16 h-full border-r"
      />

      {/* 主画布区域 */}
      <div className="flex-1 flex">
        <div ref={containerRef} className="flex-1 relative overflow-hidden p-4">
          <div className="w-full h-full flex items-center justify-center">
            <FabricCanvas
              ref={fabricCanvasRef}
              width={canvasSize.width}
              height={canvasSize.height}
              activeTool={activeTool}
              strokeColor={strokeColor}
              fillColor={fillColor}
              strokeWidth={brushSize}
              opacity={opacity}
              layers={layers}
              activeLayerId={activeLayerId}
              onObjectAdded={handleObjectAdded}
              onObjectModified={handleObjectModified}
              onMaskCreated={handleMaskCreated}
              onMaskApplied={handleMaskApplied}
              onCanvasReady={handleCanvasReady}
              // 辅助系统属性
              showGrid={assistSettings.showGrid}
              showRuler={assistSettings.showRuler}
              showGuidelines={assistSettings.showGuidelines}
              snapToGrid={assistSettings.snapToGrid}
              snapToObjects={assistSettings.snapToObjects}
              gridSize={assistSettings.gridSize}
              onAssistToggle={handleAssistToggle}
            />
          </div>
        </div>

        {/* 右侧面板区域 */}
        <div className="w-80 h-full border-l bg-white overflow-y-auto">
          <div className="space-y-4 p-4">
            {/* 辅助面板 (当选择辅助工具时显示) */}
            {showAssistPanel && canvasReady && (
              <AlignAssistSystem
                canvas={fabricCanvas}  // 使用直接传递的Canvas实例
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

            {/* 显示加载提示 */}
            {showAssistPanel && !canvasReady && (
              <div className="panel p-3">
                <div className="flex items-center justify-center h-20 flex-col space-y-2">
                  <div className="text-sm text-gray-500">
                    初始化辅助系统中...
                  </div>
                  <button
                    onClick={() => {
                      console.log('🔍 Manual Canvas Debug Check:');
                      const canvas = fabricCanvas || fabricCanvasRef.current; // 检查两种方式
                      if (canvas) {
                        CanvasDebugger.debugCanvas(canvas, 'Manual Check');
                      } else {
                        console.log('❌ Canvas reference is null');
                      }
                    }}
                    className="px-3 py-1 text-xs bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
                  >
                    手动检查Canvas状态
                  </button>
                </div>
              </div>
            )}

            {/* 蒙版面板 (当选择蒙版工具时显示) */}
            {showMaskPanel && (
              <MaskManager
                layers={layers}
                activeLayerId={activeLayerId}
                onMaskCreate={handleMaskCreate}
                onMaskApply={handleMaskApplied}
                onMaskRemove={handleMaskRemove}
                onMaskToggle={handleMaskToggle}
              />
            )}

            {/* 属性面板 */}
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

            {/* 图层面板 */}
            <LayerPanel
              layers={layers}
              activeLayerId={activeLayerId}
              onLayerSelect={setActiveLayerId}
              onLayerAdd={handleLayerAdd}
              onLayerDelete={handleLayerDelete}
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

export default AICanvasToolFabric;