import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { submitPrompt, resolveEndpoint } from '../api/index.js';
import ServiceManager from './settings/ServiceManager.jsx';
import VisualWorkflowEditor from './VisualWorkflowEditor.jsx';
// 导入新的组件和hooks
import { useEnhancedLayers } from '../hooks/useEnhancedLayers';
import { useLayerHistory } from '../hooks/useLayerHistory';
import FabricCanvas from './FabricCanvasFixed';
import Toolbar from './Toolbar';
import EnhancedLayerPanel from './EnhancedLayerPanel';
import PropertyPanel from './PropertyPanel';
import AIPanel from './AIPanel';
import MaskManager from './MaskManager';
import AlignAssistSystem from './AlignAssistSystem';
import CanvasDebugger from '../utils/CanvasDebugger';
import LayerDiffViewer from './LayerDiffViewer';

const AICanvasToolFabric = () => {
  const fabricCanvasRef = useRef(null);
  const containerRef = useRef(null);

  console.log('AICanvasToolFabric component rendered');

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
    fuseLayers
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

  const [activeTool, setActiveTool] = useState('brush');
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [fillColor, setFillColor] = useState('transparent');
  const [brushSize, setBrushSize] = useState(3);
  const [opacity, setOpacity] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [showMaskPanel, setShowMaskPanel] = useState(false);
  const [showAssistPanel, setShowAssistPanel] = useState(false);
  const [canvasReady, setCanvasReady] = useState(false); // 标记画布是否就绪
  const [showServiceManager, setShowServiceManager] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [workflowParams, setWorkflowParams] = useState({}); // 工作流参数状态
  const [selectedWorkflowData, setSelectedWorkflowData] = useState(null); // 当前选择的工作流数据
  const [diffView, setDiffView] = useState(null); // 差异视图数据
  
  // 辅助系统默认设置
  const [assistSettings, setAssistSettings] = useState({
    showGrid: true,
    showRuler: false,
    showGuidelines: false,
    snapToGrid: false,
    snapToObjects: false,
    gridSize: 20
  });

  // 保存历史记录
  useEffect(() => {
    saveHistory(layers, layerGroups, masks);
  }, [layers, layerGroups, masks, saveHistory]);

  // 更新画布大小
  useEffect(() => {
    const updateCanvasSize = () => {
      const container = containerRef.current;
      if (!container) return;
      
      const rect = container.getBoundingClientRect();
      setCanvasSize({
        width: Math.max(100, Math.floor(rect.width - 40)),
        height: Math.max(100, Math.floor(rect.height - 40))
      });
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    // AI代理提交（MVP）
    return () => {
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, []);

  useEffect(() => {
    console.log('Assist settings changed:', assistSettings);
  }, [assistSettings]);

  // 保存 fabric canvas 实例
  const [fabricCanvas, setFabricCanvas] = useState(null);

  // Canvas 就绪回调
  const handleCanvasReady = useCallback((canvas) => {
    console.log('onCanvasReady called with:', canvas);
    console.log('Canvas debug info:', {
      canvas,
      constructorName: canvas?.constructor?.name,
      hasOnMethod: typeof canvas?.on === 'function',
      hasRenderAll: typeof canvas?.renderAll === 'function',
      width: canvas?.width,
      height: canvas?.height
    });
    
    const isValidFabricCanvas = canvas && 
      typeof canvas === 'object' &&
      (canvas.constructor?.name === 'Canvas' || canvas.constructor?.name === 'klass') &&
      typeof canvas.on === 'function' && 
      typeof canvas.getActiveObjects === 'function' &&
      typeof canvas.renderAll === 'function';
    
    if (isValidFabricCanvas) {
      setFabricCanvas(canvas);
      setCanvasReady(true);
      console.log('Canvas 实例已设置并标记为就绪');
    } else {
      console.warn('Canvas 实例校验未通过，可能不是 Fabric.js Canvas 实例或缺少方法');
      console.log('校验详情:', {
        constructorName: canvas?.constructor?.name,
        hasOn: typeof canvas?.on === 'function',
        hasGetActiveObjects: typeof canvas?.getActiveObjects === 'function',
        hasRenderAll: typeof canvas?.renderAll === 'function'
      });
    }
  }, []);

  // 使用 direct fabricCanvas 时的校验
  useEffect(() => {
    let mounted = true;
    
    if (fabricCanvas) {
      console.log('使用直接提供的 Canvas 实例:', fabricCanvas);
      
      const debugResult = CanvasDebugger.debugCanvas(fabricCanvas, 'Direct Canvas Instance');
      
      if (debugResult.isValid && debugResult.isFabricCanvas) {
        console.log('Direct Canvas 实例校验通过');
        setCanvasReady(true);
      } else {
        console.warn('Direct Canvas 实例校验失败');
        console.log('校验结果:', debugResult);
        setCanvasReady(false);
      }
    } else {
      console.log('没有可用的 Canvas 引用');
      setCanvasReady(false);
    }

    // AI代理提交（MVP）
    return () => {
      mounted = false;
    };
  }, [fabricCanvas]);

  // 对象添加处理
  const handleObjectAdded = (obj, layerId) => {
    console.log('Object added to layer:', layerId, obj);
    const objectData = {
      id: `obj-${Date.now()}`,
      type: obj.type,
      data: typeof obj.toObject === 'function' ? obj.toObject() : null,
      timestamp: Date.now()
    };
    
    setLayers(prev => prev.map(layer =>
      layer.id === layerId 
        ? { ...layer, objects: [...(layer.objects || []), objectData] } 
        : layer
    ));
  };

  // 对象修改处理
  const handleObjectModified = (obj) => {
    console.log('Object modified:', obj);
  };

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
    const canvas = fabricCanvasRef.current;
    
    switch (actionId) {
      case 'undo':
        undoHistory();
        break;
      case 'redo':
        redoHistory();
        break;
      case 'save':
        if (canvas && canvas.exportCanvas) {
          const data = canvas.exportCanvas('json');
          console.log('保存项目数据:', data);
          // TODO: 实现保存到服务器
        }
        break;
      case 'open':
        console.log('打开项目');
        break;
      case 'import':
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
    const canvas = fabricCanvasRef.current;
    if (canvas && canvas.deleteActiveLayer) {
      canvas.deleteActiveLayer(layerId);
    }
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

  const handleLayerReorder = (layerId, newIndex) => {
    reorderLayer(layerId, newIndex);
    
    const canvas = fabricCanvasRef.current;
    if (canvas && canvas.reorderLayerObjects) {
      const direction = newIndex < layers.findIndex(l => l.id === layerId) ? 'up' : 'down';
      canvas.reorderLayerObjects(layerId, direction);
    }
  };

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
    const canvas = fabricCanvasRef.current;
    if (canvas && canvas.removeMaskFromLayerById) {
      canvas.removeMaskFromLayerById(layerId);
    }
    
    setLayers(prev => prev.map(layer =>
      layer.id === layerId 
        ? { ...layer, hasMask: false, maskData: null }
        : layer
    ));
  };

  const handleMaskToggle = (layerId, visible) => {
    const canvas = fabricCanvasRef.current;
    if (canvas && canvas.toggleMaskVisibility) {
      canvas.toggleMaskVisibility(layerId, visible);
    }
    
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
      const canvas = fabricCanvasRef.current;
      if (canvas && canvas.importCanvas) {
        console.log('AI 生成完成，准备导入到画布');
      }
    } catch (error) {
      console.error('AI 生成失败:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAIGenerate2 = async ({ request, preferEndpointId }) => {
    setIsGenerating(true);
    try {
      try { await resolveEndpoint(preferEndpointId); } catch (e) { console.warn('解析服务失败', e?.message); }
      
      // 添加工作流参数到请求中
      const enhancedRequest = {
        ...request,
        workflowParams: workflowParams
      };
      
      const resp = await submitPrompt({ preferEndpointId, payload: enhancedRequest });
      if (resp?.jobId) {
        const socket = io();
        const jobId = resp.jobId;
        setJobs(prev => [{ jobId, status: 'queued', progress: 0 }, ...prev].slice(0, 10));
        socket.on('job:progress', (data) => {
          if (data.jobId === jobId) {
            setJobs(prev => prev.map(j => j.jobId === jobId ? { ...j, progress: data.progress, status: 'processing' } : j));
          }
        });
        socket.on('job:complete', async (data) => {
          if (data.jobId === jobId) {
            setJobs(prev => prev.map(j => j.jobId === jobId ? { ...j, progress: 100, status: 'completed' } : j));
            const url = data?.result?.imageUrl;
            if (url && fabricCanvasRef.current) {
              try {
                const canvas = fabricCanvasRef.current;
                if (canvas && canvas.add && window.fabric?.Image?.fromURL) {
                  window.fabric.Image.fromURL(url, (img) => {
                    if (img) {
                      img.set({ left: 50, top: 50 });
                      canvas.add(img);
                      canvas.requestRenderAll?.();
                    }
                  });
                }
              } catch (e) {
                console.warn('贴回失败', e);
              }
            }
            socket.disconnect();
          }
        });
      } else {
        console.log('直接返回：', resp);
      }
    } catch (error) {
      console.error('AI生成失败:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // 图层组重命名处理
  const handleLayerGroupRename = (groupId, newName) => {
    setLayerGroups(prev => 
      prev.map(group => 
        group.id === groupId ? { ...group, name: newName } : group
      )
    );
  };

  // 图层组切换处理
  const handleLayerGroupToggle = (groupId) => {
    // 这个功能已经在EnhancedLayerPanel中处理了
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
      // TODO: 更新其他状态
    }
  };

  // 历史记录撤销
  const handleHistoryUndo = () => {
    const state = undoHistory();
    if (state) {
      setLayers(state.layers);
      // TODO: 更新其他状态
    }
  };

  // 历史记录重做
  const handleHistoryRedo = () => {
    const state = redoHistory();
    if (state) {
      setLayers(state.layers);
      // TODO: 更新其他状态
    }
  };

  // 历史记录比较
  const handleHistoryCompare = (index1, index2) => {
    const diff = getHistoryDiff(index1, index2);
    setDiffView(diff);
  };

  // 撤销变更
  const handleRevertChange = (type, action, data) => {
    // TODO: 实现撤销变更逻辑
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
              showGrid={assistSettings.showGrid}
              showRuler={assistSettings.showRuler}
              showGuidelines={assistSettings.showGuidelines}
              snapToGrid={assistSettings.snapToGrid}
              snapToObjects={assistSettings.snapToObjects}
              gridSize={assistSettings.gridSize}
              onAssistToggle={handleAssistToggle}
            />
            {jobs.length > 0 && (
              <div className="panel p-3">
                <div className="text-xs text-gray-500 mb-1">任务</div>
                <ul className="space-y-1 max-h-24 overflow-auto">
                  {jobs.map(j => (
                    <li key={j.jobId} className="text-xs text-gray-600">{j.jobId.slice(0,8)} · {j.status} · {j.progress ?? 0}%</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="w-80 h-full border-l bg-white overflow-y-auto">
          <div className="space-y-4 p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-gray-900">配置</div>
              <button onClick={() => setShowServiceManager(true)} className="text-xs underline">AI 服务设置</button>
            </div>

            {showAssistPanel && canvasReady && (
              <AlignAssistSystem
                canvas={fabricCanvas}
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

            {showAssistPanel && !canvasReady && (
              <div className="panel p-3">
                <div className="flex items-center justify-center h-20 flex-col space-y-2">
                  <div className="text-sm text-gray-500">
                    初始化中...
                  </div>
                  <button
                    onClick={() => {
                      console.log('Manual Canvas Debug Check:');
                      const canvas = fabricCanvas || fabricCanvasRef.current;
                      if (canvas) {
                        CanvasDebugger.debugCanvas(canvas, 'Manual Check');
                      } else {
                        console.log('Canvas reference is null');
                      }
                    }}
                    className="px-3 py-1 text-xs bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
                  >
                    手动检测 Canvas
                  </button>
                </div>
              </div>
            )}

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
              // 新增的回调函数
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
              onGenerate={handleAIGenerate2}
              isGenerating={isGenerating}
              onWorkflowChange={setSelectedWorkflowData} // 传递工作流数据给AIPanel
            />
            
            <VisualWorkflowEditor
              workflowData={selectedWorkflowData} // 传递当前选择的工作流数据
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

export default AICanvasToolFabric;