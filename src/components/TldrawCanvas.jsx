import React, { useRef, useState, useEffect } from 'react';
import { Tldraw, useEditor, useValue } from 'tldraw';
// 注意：我们不直接导入CSS文件，而是通过Vite处理
import Toolbar from './Toolbar';
import EnhancedLayerPanel from './EnhancedLayerPanel';
import PropertyPanel from './PropertyPanel';
import AIPanel from './AIPanel';
import ServiceManager from './settings/ServiceManager';
import VisualWorkflowEditor from './VisualWorkflowEditor';
import MaskManager from './MaskManager';
import AlignAssistSystem from './AlignAssistSystem';
import LayerDiffViewer from './LayerDiffViewer';
import { useEnhancedLayers } from '../hooks/useEnhancedLayers';
import { useLayerHistory } from '../hooks/useLayerHistory';

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
  onObjectModified
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
      // 检查是否有新添加的形状
      Object.values(changes.changes.added).forEach((record) => {
        if (record.typeName === 'shape') {
          // 触发对象添加回调
          onObjectAdded?.(record);
        }
      });
    });
    
    return () => unsubscribe();
  }, [editor, onObjectAdded]);
  
  return null;
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
  
  // 保存历史记录
  useEffect(() => {
    saveHistory(layers, layerGroups, masks);
  }, [layers, layerGroups, masks, saveHistory]);
  
  // 对象添加处理
  const handleObjectAdded = (obj) => {
    console.log('Object added:', obj);
    const objectData = {
      id: `obj-${Date.now()}`,
      type: obj.type,
      data: obj,
      timestamp: Date.now()
    };
    
    setLayers(prev => prev.map(layer =>
      layer.id === activeLayerId 
        ? { ...layer, objects: [...(layer.objects || []), objectData] } 
        : layer
    ));
  };
  
  // 对象修改处理
  const handleObjectModified = (objs) => {
    console.log('Objects modified:', objs);
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
  
  const handleLayerReorder = (layerId, newIndex) => {
    reorderLayer(layerId, newIndex);
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
            <Tldraw>
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
              />
            </Tldraw>
          </div>
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