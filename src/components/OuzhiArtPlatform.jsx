import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Rocket, 
  Plus, 
  Image, 
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
  MessageSquare,
  User,
  Bell,
  CreditCard,
  FileText,
  Settings,
  Star,
  RefreshCw,
  Send,
  Heart,
  ThumbsUp,
  ThumbsDown,
  // 添加缺失的图标
  MousePointer2,
  Hand,
  Eraser,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  ChevronRight,
  ChevronDown,
  Trash2,
  Crown,
  Minus,
  X,
  Layers,
  Scissors,
  Package
} from 'lucide-react';
import api from '@/api/index.js';
import { Tldraw, useEditor, useValue } from 'tldraw';
import 'tldraw/tldraw.css';
import clsx from 'clsx';
import { useEnhancedLayers } from '../hooks/useEnhancedLayers';
import { useLayerHistory } from '../hooks/useLayerHistory';

// 可编辑的画布组件，暴露编辑器实例
const EditableCanvas = ({ 
  activeTool, 
  onToolChange,
  onObjectAdded,
  onObjectModified,
  onObjectDeleted,
  layers,
  toggleLayerVisibility,
  onEditorReady,
  generatedImages
}) => {
  const editor = useEditor();
  
  // 当编辑器准备好时，通知父组件
  useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(editor);
    }
  }, [editor, onEditorReady]);
  
  // 使用 ref 存储已处理的图片，避免重复处理
  const processedImagesRef = useRef(new Set());
  const isProcessingRef = useRef(false);
  
  // 添加生成的图片到画布
  useEffect(() => {
    if (!editor || !generatedImages || generatedImages.length === 0) {
      return;
    }
    
    // 如果正在处理，跳过
    if (isProcessingRef.current) {
      console.log('[画布] 正在处理中，跳过本次执行');
      return;
    }
    
    // 使用 async 函数处理异步操作
    const addImagesToCanvas = async () => {
      isProcessingRef.current = true;
      
      try {
        for (let index = 0; index < generatedImages.length; index++) {
          const imageData = generatedImages[index];
          
          // 构建唯一标识
          let imageKey = '';
          if (typeof imageData === 'string') {
            imageKey = imageData;
          } else if (imageData.filename) {
            imageKey = `${imageData.filename}_${imageData.subfolder || ''}_${imageData.type || ''}`;
          } else if (imageData.url) {
            imageKey = imageData.url;
          }
          
          // 如果已经处理过，跳过
          if (imageKey && processedImagesRef.current.has(imageKey)) {
            console.log(`[画布] 图片已处理，跳过: ${imageKey}`);
            continue;
          }
          
          // 标记为已处理
          processedImagesRef.current.add(imageKey);
        
        try {
          // 获取画布的视口中心位置
          const viewportPageBounds = editor.getViewportPageBounds();
          const centerX = viewportPageBounds.x + viewportPageBounds.width / 2;
          const centerY = viewportPageBounds.y + viewportPageBounds.height / 2;
          
          // 构建图片URL
          let imageUrl = '';
          if (typeof imageData === 'string') {
            imageUrl = imageData;
          } else if (imageData.filename) {
            // 如果是ComfyUI的输出格式，构建访问URL
            const subfolder = imageData.subfolder || '';
            const type = imageData.type || 'output';
            // 构建完整URL（相对于前端）
            const baseUrl = window.location.origin;
            imageUrl = `${baseUrl}/api/comfy/view?filename=${encodeURIComponent(imageData.filename)}&subfolder=${encodeURIComponent(subfolder)}&type=${encodeURIComponent(type)}`;
          } else if (imageData.url) {
            imageUrl = imageData.url;
          }
          
          if (!imageUrl) {
            console.warn(`[画布] 图片URL为空，跳过:`, imageData);
            continue;
          }
          
          // 计算图片位置
          const offsetX = (index % 3) * 450; // 每行3个，间隔450
          const offsetY = Math.floor(index / 3) * 450; // 每列间隔450
          const targetX = centerX - 200 + offsetX;
          const targetY = centerY - 200 + offsetY;
          
          // 先通过fetch获取图片，转换为File对象
          console.log(`[画布] 开始添加图片 ${index + 1}: ${imageUrl}`);
          
          try {
            const imageResponse = await fetch(imageUrl);
            if (!imageResponse.ok) {
              throw new Error(`获取图片失败: ${imageResponse.status}`);
            }
            
            const imageBlob = await imageResponse.blob();
            const fileName = imageUrl.split('/').pop() || `generated-${index + 1}.jpg`;
            const file = new File([imageBlob], fileName, { type: imageBlob.type || 'image/jpeg' });
            
            // 记录添加前的shape数量
            const shapesBefore = editor.getCurrentPageShapes();
            const shapeIdsBefore = new Set(shapesBefore.map(s => s.id));
            
            // 使用 tldraw 的 putExternalContent 添加图片
            await editor.putExternalContent({
              type: 'files',
              files: [file],
              point: { x: targetX, y: targetY },
            });
            
            // 等待一小段时间让shape创建完成
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // 获取新添加的shape
            const shapesAfter = editor.getCurrentPageShapes();
            const newShapes = shapesAfter.filter(s => !shapeIdsBefore.has(s.id));
            
            console.log(`[画布] 成功添加图片 ${index + 1} 到画布位置 (${targetX}, ${targetY})，创建了 ${newShapes.length} 个shape`);
            
            // 将新添加的shape同步到图层系统
            if (newShapes.length > 0 && onObjectAdded) {
              newShapes.forEach(shape => {
                onObjectAdded({
                  id: shape.id,
                  type: shape.type,
                  data: {
                    ...shape,
                    imageUrl: imageUrl,
                    imageData: imageData
                  }
                });
              });
            }
          } catch (fetchError) {
            console.error(`[画布] 获取或添加图片失败:`, fetchError);
            // 如果fetch失败，尝试直接使用URL创建图片形状
            try {
              // 使用 editor.createShape 直接创建图片形状（如果支持URL）
              // tldraw 要求形状 ID 必须以 "shape:" 开头
              const imageId = `shape:generated-image-${Date.now()}-${index}`;
              
              // 尝试使用 createShape 创建图片
              editor.createShape({
                id: imageId,
                type: 'image',
                x: targetX,
                y: targetY,
                props: {
                  w: 400,
                  h: 400,
                  src: imageUrl,
                },
              });
              
              console.log(`[画布] 使用备选方案添加图片: ${imageId}`);
              
              // 同步到图层系统
              if (onObjectAdded) {
                const shape = editor.getShape(imageId);
                if (shape) {
                  onObjectAdded({
                    id: shape.id,
                    type: shape.type,
                    data: {
                      ...shape,
                      imageUrl: imageUrl,
                      imageData: imageData
                    }
                  });
                }
              }
            } catch (shapeError) {
              console.error(`[画布] 备选方案也失败:`, shapeError);
            }
          }
        } catch (error) {
          console.error(`[画布] 添加图片到画布失败 (图片 ${index}):`, error);
        }
      }
    } finally {
      // 处理完成，重置标志
      isProcessingRef.current = false;
    }
    };
    
    // 执行异步函数
    addImagesToCanvas();
    
    // 清理函数：如果组件卸载或依赖变化，取消处理
    return () => {
      isProcessingRef.current = false;
    };
  }, [editor, generatedImages]); // 移除 onObjectAdded，避免不必要的重复执行
  
  // 监听选中形状的变化
  const selectedShapes = useValue('selected shapes', () => editor?.getSelectedShapes() || [], [editor]);
  
  // 当选中形状变化时触发回调
  useEffect(() => {
    if (selectedShapes.length > 0) {
      // 触发对象修改回调
      onObjectModified?.(selectedShapes);
    }
  }, [selectedShapes, onObjectModified]);
  
  // 监听图层可见性变化并同步到tldraw的shape（改进版，使用shapeIds优先）
  useEffect(() => {
    if (!editor || !layers || layers.length === 0) return;
    
    // 为每个图层同步可见性和锁定状态
    layers.forEach(layer => {
      // 优先使用shapeIds，如果不存在则使用objects中的id
      const shapeIds = layer.shapeIds && layer.shapeIds.length > 0 
        ? layer.shapeIds 
        : layer.objects?.map(obj => obj.id) || [];
      
      shapeIds.forEach(shapeId => {
        try {
          const shape = editor.getShape(shapeId);
          if (shape) {
            // 同步锁定状态
            if (layer.locked !== shape.isLocked) {
              editor.updateShape({ id: shapeId, isLocked: layer.locked });
            }
            
            // 同步可见性：通过opacity控制，0表示隐藏
            // 如果图层不可见，设置opacity为0；否则使用图层的opacity值
            const targetOpacity = layer.visible ? (layer.opacity || 1) : 0;
            const currentOpacity = shape.opacity !== undefined ? shape.opacity : 1;
            
            if (Math.abs(currentOpacity - targetOpacity) > 0.01) {
              editor.updateShape({ 
                id: shapeId, 
                opacity: targetOpacity 
              });
            }
          }
        } catch (error) {
          console.warn(`[画布] 同步图层状态失败 (shapeId: ${shapeId}):`, error);
        }
      });
    });
  }, [editor, layers]);
  
  // 监听形状创建和删除事件
  useEffect(() => {
    if (!editor) return;
    
    const unsubscribe = editor.store.listen((changes) => {
      // 检查是否有新添加的形状
      if (changes.changes.added) {
        Object.values(changes.changes.added).forEach((record) => {
          if (record.typeName === 'shape') {
            // 触发对象添加回调
            onObjectAdded?.(record);
          }
        });
      }
      
      // 检查是否有删除的形状
      if (changes.changes.removed) {
        Object.values(changes.changes.removed).forEach((record) => {
          if (record.typeName === 'shape') {
            // 获取shape ID（可能是record.id或record.id）
            const shapeId = record.id || (typeof record === 'string' ? record : null);
            if (shapeId) {
              console.log('[画布] Shape deleted:', shapeId);
              // 触发对象删除回调
              onObjectDeleted?.(shapeId);
            }
          }
        });
      }
    });
    
    return () => unsubscribe();
  }, [editor, onObjectAdded, onObjectDeleted]);
  
  return null;
};

// 生成器面板组件
const GeneratorPanel = ({ 
  onGenerate,
  isGenerating
}) => {
  // 应用选择相关状态
  const [apps, setApps] = useState([]);
  const [selectedAppId, setSelectedAppId] = useState('');
  const [selectedApp, setSelectedApp] = useState(null);
  const [loadingApps, setLoadingApps] = useState(false);
  const [loadingApp, setLoadingApp] = useState(false);
  
  // 组件输入值状态
  const [inputValues, setInputValues] = useState({});
  
  // 加载应用列表
  useEffect(() => {
    const loadApps = async () => {
      setLoadingApps(true);
      try {
        const response = await api.get('/apps');
        const appsList = response.data?.data || [];
        setApps(appsList);
      } catch (error) {
        console.error('加载应用列表失败:', error);
      } finally {
        setLoadingApps(false);
      }
    };
    loadApps();
  }, []);
  
  // 当选择应用时，加载该应用的详细信息
  useEffect(() => {
    if (selectedAppId) {
      const loadAppDetails = async () => {
        setLoadingApp(true);
        try {
          const response = await api.get(`/apps/${selectedAppId}`);
          const appData = response.data?.data;
          setSelectedApp(appData);
          // 初始化输入值
          const initialValues = {};
          if (appData.components && appData.uiBindings) {
            appData.components.forEach(comp => {
              const binding = appData.uiBindings.find(b => b.componentId === comp.id);
              if (binding && binding.bindTo) {
                initialValues[binding.bindTo] = binding.default || '';
              }
            });
          }
          setInputValues(initialValues);
        } catch (error) {
          console.error('加载应用详情失败:', error);
          setSelectedApp(null);
        } finally {
          setLoadingApp(false);
        }
      };
      loadAppDetails();
    } else {
      setSelectedApp(null);
      setInputValues({});
    }
  }, [selectedAppId]);
  
  // 渲染组件输入控件（类似 AppRunner 的逻辑）
  const renderComponentControl = (comp) => {
    const binding = selectedApp?.uiBindings?.find(b => b.componentId === comp.id);
    const path = binding?.bindTo;
    const value = path ? inputValues[path] : undefined;

    const setVal = (v) => {
      if (!path) return;
      setInputValues((prev) => ({ ...prev, [path]: v }));
    };

    const type = comp.type;
    
    // 文本输入
    if (type === 'text' || type === 'textarea') {
      return (
        <textarea
          value={value ?? ''}
          onChange={(e) => setVal(e.target.value)}
          placeholder={comp.properties?.placeholder || '请输入'}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          rows={type === 'textarea' ? 4 : 2}
        />
      );
    }
    
    // 数字输入
    if (type === 'number' || type === 'width' || type === 'height') {
      return (
        <input
          type="number"
          value={value ?? ''}
          onChange={(e) => setVal(Number(e.target.value))}
          placeholder={comp.properties?.placeholder || '请输入数字'}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          min={comp.properties?.min}
          max={comp.properties?.max}
        />
      );
    }
    
    // 文件上传
    if (type === 'upload_image' || type === 'upload_single_image' || type === 'upload_multiple_images' || type === 'upload_multi_media') {
      const multiple = type === 'upload_multiple_images' || (comp.properties?.multiple === true);
      return (
        <input
          type="file"
          accept={comp.properties?.acceptedTypes || 'image/*'}
          multiple={multiple}
          className="w-full text-sm"
          onChange={(e) => setVal(multiple ? Array.from(e.target.files) : e.target.files?.[0] || null)}
        />
      );
    }
    
    // 选择框
    if (type === 'select') {
      const options = comp.properties?.options || [];
      return (
        <select
          value={value ?? ''}
          onChange={(e) => setVal(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">请选择</option>
          {options.map((opt, idx) => (
            <option key={idx} value={typeof opt === 'string' ? opt : opt.value}>
              {typeof opt === 'string' ? opt : opt.label}
            </option>
          ))}
        </select>
      );
    }
    
    // 默认文本输入
    return (
      <input
        type="text"
        value={value ?? ''}
        onChange={(e) => setVal(e.target.value)}
        placeholder={comp.properties?.placeholder || '请输入'}
        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
    );
  };
  
  // 处理生成
  const handleGenerate = async () => {
    if (!selectedAppId || !selectedApp) return;
    
    // 先处理文件上传（如果有）
    const processedInputValues = { ...inputValues };
    for (const [paramPath, value] of Object.entries(inputValues)) {
      if (value instanceof File || (Array.isArray(value) && value[0] instanceof File)) {
        try {
          const formData = new FormData();
          if (Array.isArray(value)) {
            value.forEach((file, idx) => {
              formData.append('file', file);
            });
          } else {
            formData.append('file', value);
          }
          
          const uploadResponse = await api.post('/uploads', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          
          const fileUrl = uploadResponse.data?.data?.url || uploadResponse.data?.url;
          if (fileUrl) {
            processedInputValues[paramPath] = fileUrl;
          }
        } catch (error) {
          console.error(`文件上传失败 (${paramPath}):`, error);
          alert(`文件上传失败: ${error.message}`);
          return;
        }
      }
    }
    
    // 构建 uiInputs（componentId -> value 的映射）
    const uiInputs = {};
    if (selectedApp.components && selectedApp.uiBindings) {
      selectedApp.components.forEach(comp => {
        const binding = selectedApp.uiBindings.find(b => b.componentId === comp.id);
        if (binding && binding.bindTo && processedInputValues[binding.bindTo] !== undefined) {
          uiInputs[comp.id] = processedInputValues[binding.bindTo];
        }
      });
    }
    
    // 调用生成函数
    if (onGenerate) {
      onGenerate(selectedAppId, uiInputs);
    }
  };
  
  const components = selectedApp?.components || [];
  const uiBindings = selectedApp?.uiBindings || [];
  
  return (
    <div className="w-80 h-full border-r bg-white flex flex-col">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold text-gray-900">生成器</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* 应用选择下拉 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <Package className="w-4 h-4" />
            工作流应用
          </label>
          <select
            value={selectedAppId}
            onChange={(e) => setSelectedAppId(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={loadingApps}
          >
            <option value="">-- 请选择应用 --</option>
            {apps.map(app => (
              <option key={app._id} value={app._id}>
                {app.name || app.title || `应用 ${app._id}`}
              </option>
            ))}
          </select>
          {loadingApps && (
            <p className="mt-1 text-xs text-gray-500">加载中...</p>
          )}
          {loadingApp && selectedAppId && (
            <p className="mt-1 text-xs text-gray-500">加载应用详情...</p>
          )}
        </div>
        
        {/* 动态渲染应用的组件 */}
        {selectedAppId && components.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              应用组件 ({components.length})
            </label>
            <div className="space-y-4">
              {components.map((comp, index) => {
                const binding = uiBindings.find(b => b.componentId === comp.id);
                return (
                  <div key={comp.id || index} className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      {comp.label || comp.type || `组件 ${index + 1}`}
                      {binding?.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    {comp.properties?.description && (
                      <p className="text-xs text-gray-500">{comp.properties.description}</p>
                    )}
                    {renderComponentControl(comp)}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {selectedAppId && components.length === 0 && (
          <div className="text-center py-4 text-gray-500 text-sm border border-gray-200 rounded-md">
            该应用暂无可用组件
          </div>
        )}
        
        {!selectedAppId && (
          <div className="text-center py-4 text-gray-500 text-sm border border-gray-200 rounded-md">
            请先选择一个工作流应用
          </div>
        )}
        
        {/* 生成按钮 */}
        {selectedAppId && components.length > 0 && (
          <div className="border-t pt-4">
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !selectedAppId}
              className={clsx(
                'w-full flex items-center justify-center gap-2 p-3 rounded-md font-medium transition-colors',
                isGenerating || !selectedAppId
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700'
              )}
            >
              <Rocket className="w-4 h-4" />
              {isGenerating ? '生成中...' : '开始生成'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// 工具栏组件
const CanvasToolbar = ({ 
  activeTool, 
  setActiveTool,
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onUndo,
  onRedo,
  canUndo,
  canRedo
}) => {
  // 只保留基本的画布工具
  const tools = [
    { id: 'select', icon: <MousePointer2 className="w-4 h-4" />, label: '选择' },
    { id: 'hand', icon: <Hand className="w-4 h-4" />, label: '抓手' },
    { id: 'rectangle', icon: <Square className="w-4 h-4" />, label: '矩形' },
    { id: 'ellipse', icon: <Circle className="w-4 h-4" />, label: '圆形' },
    { id: 'draw', icon: <Pen className="w-4 h-4" />, label: '画笔' },
    { id: 'eraser', icon: <Eraser className="w-4 h-4" />, label: '橡皮擦' }
  ];
  
  return (
    <div className="flex items-center gap-2 p-2 border-b bg-white">
      {/* 工具选择 */}
      <div className="flex gap-1">
        {tools.map(tool => (
          <button
            key={tool.id}
            onClick={() => setActiveTool(tool.id)}
            className={clsx(
              'p-2 rounded-md transition-colors',
              activeTool === tool.id
                ? 'bg-blue-100 text-blue-600'
                : 'text-gray-600 hover:bg-gray-100'
            )}
            title={tool.label}
          >
            {tool.icon}
          </button>
        ))}
      </div>
      
      <div className="w-px h-6 bg-gray-200 mx-2"></div>
      
      {/* 编辑操作 */}
      <button
        onClick={onUndo}
        disabled={!canUndo}
        className={clsx(
          'p-2 rounded-md transition-colors',
          canUndo ? 'text-gray-600 hover:bg-gray-100' : 'text-gray-300 cursor-not-allowed'
        )}
        title="撤销"
      >
        <Undo className="w-4 h-4" />
      </button>
      <button
        onClick={onRedo}
        disabled={!canRedo}
        className={clsx(
          'p-2 rounded-md transition-colors',
          canRedo ? 'text-gray-600 hover:bg-gray-100' : 'text-gray-300 cursor-not-allowed'
        )}
        title="重做"
      >
        <Redo className="w-4 h-4" />
      </button>
      
      <div className="w-px h-6 bg-gray-200 mx-2"></div>
      
      {/* 对齐工具 */}
      <div className="flex gap-1">
        <button className="p-2 rounded-md text-gray-600 hover:bg-gray-100" title="左对齐">
          <AlignLeft className="w-4 h-4" />
        </button>
        <button className="p-2 rounded-md text-gray-600 hover:bg-gray-100" title="居中对齐">
          <AlignCenter className="w-4 h-4" />
        </button>
        <button className="p-2 rounded-md text-gray-600 hover:bg-gray-100" title="右对齐">
          <AlignRight className="w-4 h-4" />
        </button>
      </div>
      
      <div className="flex-1"></div>
      
      {/* 缩放控制 */}
      <div className="flex items-center gap-2">
        <button
          onClick={onZoomOut}
          className="p-1 rounded-md text-gray-600 hover:bg-gray-100"
          title="缩小"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="text-sm text-gray-600 min-w-12 text-center">{Math.round(zoomLevel * 100)}%</span>
        <button
          onClick={onZoomIn}
          className="p-1 rounded-md text-gray-600 hover:bg-gray-100"
          title="放大"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button className="p-1 rounded-md text-gray-600 hover:bg-gray-100" title="适应屏幕">
          <Maximize className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// 图层管理面板组件
const LayerPanel = ({ 
  layers, 
  activeLayerId, 
  layerGroups,
  onLayerSelect,
  onLayerAdd,
  onLayerDelete,
  onLayerToggleVisibility,
  onLayerToggleLock,
  onLayerRename,
  onLayerReorder,
  onLayerSetOpacity,
  onLayerSetBlendMode,
  onLayerGroupCreate,
  onLayerGroupDelete,
  onLayerGroupRename
}) => {
  const [editingLayerId, setEditingLayerId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  
  const blendModes = [
    { value: 'normal', label: '正常' },
    { value: 'multiply', label: '正片叠底' },
    { value: 'screen', label: '滤色' },
    { value: 'overlay', label: '叠加' },
    { value: 'darken', label: '变暗' },
    { value: 'lighten', label: '变亮' }
  ];
  
  const handleNameEdit = (layer) => {
    setEditingLayerId(layer.id);
    setEditingName(layer.name);
  };
  
  const handleNameSave = () => {
    if (editingLayerId && editingName.trim()) {
      onLayerRename(editingLayerId, editingName.trim());
    }
    setEditingLayerId(null);
    setEditingName('');
  };
  
  const toggleGroup = (groupId) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };
  
  const renderLayer = (layer, depth = 0) => {
    return (
      <div
        key={layer.id}
        className={clsx(
          'group flex items-center p-2 rounded cursor-pointer transition-colors',
          activeLayerId === layer.id ? 'bg-blue-100' : 'hover:bg-gray-100'
        )}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={() => onLayerSelect(layer.id)}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onLayerToggleVisibility(layer.id);
          }}
          className="p-1 text-gray-400 hover:text-gray-600"
        >
          {layer.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>
        
        <div className="flex-1 min-w-0 ml-2">
          {editingLayerId === layer.id ? (
            <input
              type="text"
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onBlur={handleNameSave}
              onKeyDown={(e) => e.key === 'Enter' && handleNameSave()}
              className="w-full px-1 py-0.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
          ) : (
            <div
              className="text-sm text-gray-900 truncate"
              onDoubleClick={() => handleNameEdit(layer)}
            >
              {layer.name}
              {/* 显示图层中的对象数量 */}
              {layer.objects && layer.objects.length > 0 && (
                <span className="text-xs text-gray-500 ml-2">({layer.objects.length})</span>
              )}
            </div>
          )}
        </div>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            onLayerToggleLock(layer.id);
          }}
          className="p-1 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100"
        >
          {layer.locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
        </button>
      </div>
    );
  };
  
  const renderLayerGroup = (group) => {
    const isExpanded = expandedGroups.has(group.id);
    const groupLayers = layers.filter(layer => layer.parentId === group.id);
    
    return (
      <div key={group.id} className="mb-1">
        <div
          className="group flex items-center p-2 rounded cursor-pointer hover:bg-gray-100"
          onClick={() => toggleGroup(group.id)}
        >
          <button className="p-1 text-gray-400">
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          <div className="flex-1 min-w-0 ml-2">
            <div className="text-sm font-medium text-gray-900 truncate">{group.name}</div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onLayerGroupDelete(group.id);
            }}
            className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        
        {isExpanded && (
          <div className="ml-4">
            {groupLayers.map(layer => renderLayer(layer, 1))}
          </div>
        )}
      </div>
    );
  };
  
  // 按orderIndex排序图层
  const sortedLayers = [...layers].sort((a, b) => a.orderIndex - b.orderIndex);
  // 分离根图层（没有parentId的图层）
  const rootLayers = sortedLayers.filter(layer => !layer.parentId);
  
  return (
    <div className="w-64 h-full border-l bg-white flex flex-col">
      <div className="p-3 border-b">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900">图层</h3>
          <button
            onClick={onLayerAdd}
            className="p-1 text-gray-400 hover:text-gray-600"
            title="添加图层"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2">
        {layerGroups.map(group => renderLayerGroup(group))}
        {[...rootLayers].reverse().map(layer => renderLayer(layer))}
      </div>
      
      {/* 图层属性 */}
      {activeLayerId && (
        <div className="border-t p-3 space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">不透明度</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={layers.find(l => l.id === activeLayerId)?.opacity || 1}
              onChange={(e) => onLayerSetOpacity(activeLayerId, parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
          
          <div>
            <label className="block text-xs text-gray-500 mb-1">混合模式</label>
            <select
              value={layers.find(l => l.id === activeLayerId)?.blendMode || 'normal'}
              onChange={(e) => onLayerSetBlendMode(activeLayerId, e.target.value)}
              className="w-full text-sm p-1 border border-gray-300 rounded"
            >
              {blendModes.map(mode => (
                <option key={mode.value} value={mode.value}>{mode.label}</option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

// AI设计师对话面板组件
const AIDesignerPanel = ({ 
  messages, 
  inputMessage, 
  setInputMessage, 
  onSendMessage,
  quickQuestions,
  onRefreshQuestions,
  isSending
}) => {
  const messagesEndRef = useRef(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  return (
    <div className="w-80 h-full border-l bg-white flex flex-col">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold text-gray-900">AI 设计师</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 欢迎语 */}
        <div className="bg-blue-50 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="font-medium text-gray-900">AI 设计师</div>
              <p className="text-sm text-gray-600 mt-1">我是你的 AI 设计师，让我们开始今天的创作吧！</p>
            </div>
          </div>
        </div>
        
        {/* 快捷问题 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">快捷提问</span>
            <button
              onClick={onRefreshQuestions}
              className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              换一换
            </button>
          </div>
          <div className="space-y-2">
            {quickQuestions.map((question, index) => (
              <button
                key={index}
                onClick={() => {
                  setInputMessage(question);
                  onSendMessage(question);
                }}
                className="w-full text-left p-2 text-sm bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
        
        {/* 消息对话 */}
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={clsx(
                'flex gap-2',
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {message.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-4 h-4 text-white" />
                </div>
              )}
              <div
                className={clsx(
                  'max-w-[80%] rounded-lg p-3',
                  message.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-900'
                )}
              >
                <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                {message.role === 'assistant' && (
                  <div className="flex items-center gap-2 mt-2">
                    <button className="text-xs text-gray-500 hover:text-gray-700 flex items-center">
                      <ThumbsUp className="w-3 h-3 mr-1" />
                      有用
                    </button>
                    <button className="text-xs text-gray-500 hover:text-gray-700 flex items-center">
                      <ThumbsDown className="w-3 h-3 mr-1" />
                      没用
                    </button>
                  </div>
                )}
              </div>
              {message.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-gray-600" />
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      {/* 消息输入 */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSendMessage()}
            placeholder="向 AI 设计师提问..."
            className="flex-1 p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            onClick={() => onSendMessage()}
            disabled={isSending || !inputMessage.trim()}
            className={clsx(
              'p-2 rounded-md transition-colors',
              isSending || !inputMessage.trim()
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            )}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// 顶部导航栏组件
const TopNavbar = ({ 
  projectName, 
  setProjectName,
  isEditingName,
  setIsEditingName,
  points,
  memberStatus,
  onOpenMember,
  onNotificationClick,
  onProfileClick
}) => {
  return (
    <div className="flex items-center justify-between p-3 border-b bg-white">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-bold text-gray-900">欧智艺术平台</h1>
        <div className="flex items-center gap-2">
          {isEditingName ? (
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              onBlur={() => setIsEditingName(false)}
              onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
              className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          ) : (
            <div
              className="text-sm font-medium text-gray-900 cursor-text hover:bg-gray-100 px-2 py-1 rounded"
              onDoubleClick={() => setIsEditingName(true)}
            >
              {projectName}
            </div>
          )}
          <button className="text-xs text-blue-600 hover:text-blue-800">+ 新页面</button>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        {/* 积分与会员 */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-sm">
            <Star className="w-4 h-4 text-yellow-500" />
            <span className="font-medium">{points}</span>
          </div>
          <div className="flex items-center gap-1 text-sm">
            <Crown className="w-4 h-4 text-orange-500" />
            <span className="font-medium">{memberStatus}</span>
          </div>
          <button
            onClick={onOpenMember}
            className="px-3 py-1 text-sm bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-md hover:from-orange-600 hover:to-red-600"
          >
            开通会员
          </button>
        </div>
        
        {/* 通知与个人中心 */}
        <div className="flex items-center gap-2">
          <button
            onClick={onNotificationClick}
            className="p-2 text-gray-600 hover:text-gray-900 relative"
          >
            <Bell className="w-5 h-5" />
            <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></div>
          </button>
          <button
            onClick={onProfileClick}
            className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center"
          >
            <User className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>
    </div>
  );
};

// 主组件
const OuzhiArtPlatform = () => {
  // 项目状态
  const [projectName, setProjectName] = useState('未命名项目');
  const [isEditingName, setIsEditingName] = useState(false);
  
  // 生成器状态
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState([]);
  
  // 画布状态
  const [activeTool, setActiveTool] = useState('select');
  const [zoomLevel, setZoomLevel] = useState(1);
  
  // AI对话状态
  const [messages, setMessages] = useState([
    { role: 'assistant', content: '你好！我是你的 AI 设计师，有什么我可以帮助你的吗？' }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [quickQuestions, setQuickQuestions] = useState([
    '你能为我做什么？',
    '科技公司品牌 Logo',
    '游戏图标设计',
    '海报设计建议'
  ]);
  const [isSending, setIsSending] = useState(false);
  
  // 系统状态
  const [points, setPoints] = useState(1280);
  const [memberStatus, setMemberStatus] = useState('高级会员');
  
  // 使用增强的图层hook
  const { 
    layers, 
    activeLayerId, 
    layerGroups,
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
    renameLayerGroup
  } = useEnhancedLayers([
    { id: 'layer-1', name: '图层 1', visible: true, locked: false, opacity: 1, blendMode: 'normal', objects: [], orderIndex: 0 }
  ]);
  
  // 使用图层历史hook
  const { 
    history, 
    currentIndex: historyIndex,
    undo: undoHistory,
    redo: redoHistory,
    canUndo,
    canRedo
  } = useLayerHistory(50);
  
  // 对象添加处理 - 为每个内容创建独立图层（像PS一样）
  const handleObjectAdded = useCallback((obj) => {
    console.log('Object added:', obj);
    
    const objectData = {
      id: obj.id,
      type: obj.type,
      data: obj,
      timestamp: Date.now()
    };
    
    // 为每个内容创建独立图层
    const layerName = obj.data?.imageData?.filename 
      ? `生成图片 ${obj.data.imageData.filename}` 
      : obj.type === 'image' 
        ? '图片图层' 
        : `${obj.type}图层`;
    
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
    
    console.log('Created new layer for object:', newLayer.id, 'object:', objectData);
    
    // 激活新创建的图层
    setActiveLayerId(newLayer.id);
  }, [addLayer, setActiveLayerId]);
  
  // 对象修改处理
  const handleObjectModified = (objs) => {
    console.log('Objects modified:', objs);
  };
  
  // 对象删除处理 - 同步删除对应的图层
  const handleObjectDeleted = useCallback((shapeId) => {
    console.log('Object deleted:', shapeId);
    
    // 查找包含该shapeId的图层
    const layerToDelete = layers.find(layer => {
      // 检查shapeIds或objects中是否包含该shapeId
      const hasInShapeIds = layer.shapeIds && layer.shapeIds.includes(shapeId);
      const hasInObjects = layer.objects && layer.objects.some(obj => obj.id === shapeId);
      return hasInShapeIds || hasInObjects;
    });
    
    if (layerToDelete) {
      console.log('Deleting layer:', layerToDelete.id, 'for shape:', shapeId);
      deleteLayer(layerToDelete.id);
    } else {
      console.warn('No layer found for deleted shape:', shapeId);
    }
  }, [layers, deleteLayer]);
  
  // 生成器功能 - 运行应用
  const handleGenerate = async (appId, uiInputs) => {
    if (!appId || !uiInputs) return;
    
    setIsGenerating(true);
    setGeneratedImages([]); // 清空之前的图片
    
    try {
      // 调用应用运行接口
      const response = await api.post(`/comfy/apps/${appId}/run`, { uiInputs });
      const result = response.data?.data;
      
      console.log('应用运行结果:', result);
      
      // 如果有 prompt_id，需要轮询获取结果
      const promptId = result?.prompt_id || result?.promptId;
      
      if (promptId) {
        // 轮询获取结果
        const pollResult = async () => {
          const maxAttempts = 30; // 最多轮询30次
          const pollInterval = 2000; // 每2秒轮询一次
          
          for (let attempt = 0; attempt < maxAttempts; attempt++) {
            try {
              await new Promise(resolve => setTimeout(resolve, pollInterval));
              
              console.log(`[轮询] 尝试 ${attempt + 1}/${maxAttempts}, promptId: ${promptId}`);
              const historyResponse = await api.get(`/comfy/history/${promptId}`, {
                // 禁用304缓存，强制获取最新数据
                headers: {
                  'Cache-Control': 'no-cache',
                  'Pragma': 'no-cache'
                }
              });
              
              console.log(`[轮询] 响应状态: ${historyResponse.status}, 完整响应:`, historyResponse);
              console.log(`[轮询] 响应数据:`, JSON.stringify(historyResponse.data, null, 2));
              
              // 处理不同的响应格式
              // ComfyUI history 直接返回: { promptId: { outputs: {...} } }
              // 后端可能包装为: { data: { promptId: { outputs: {...} } } }
              let historyData = historyResponse.data;
              
              // 如果后端包装在 data 中，提取出来
              if (historyData && typeof historyData === 'object' && 'data' in historyData && !historyData[promptId]) {
                historyData = historyData.data;
              }
              
              if (!historyData) {
                console.log(`[轮询] 尝试 ${attempt + 1}: 无数据，继续轮询...`);
                continue;
              }
              
              // 检查是否有该promptId的数据
              const promptData = historyData[promptId];
              
              if (!promptData) {
                console.log(`[轮询] 尝试 ${attempt + 1}: promptId ${promptId} 不在历史中，继续轮询...`);
                continue;
              }
              
              console.log(`[轮询] 找到 prompt 数据:`, promptData);
              
              const promptOutputs = promptData.outputs;
              
              if (!promptOutputs) {
                console.log(`[轮询] 尝试 ${attempt + 1}: 无输出数据，继续轮询...`);
                continue;
              }
              
              console.log(`[轮询] 找到输出数据:`, promptOutputs);
              
              // 提取所有图片
              const imageOutputs = [];
              Object.values(promptOutputs).forEach((output, nodeId) => {
                console.log(`[轮询] 检查节点 ${nodeId} 的输出:`, output);
                if (output.images && Array.isArray(output.images)) {
                  output.images.forEach(img => {
                    console.log(`[轮询] 找到图片:`, img);
                    imageOutputs.push(img);
                  });
                }
              });
              
              console.log(`[轮询] 提取到 ${imageOutputs.length} 张图片`);
              
              if (imageOutputs.length > 0) {
                console.log(`[轮询] 成功！设置生成图片:`, imageOutputs);
                setGeneratedImages(imageOutputs);
                setIsGenerating(false);
                return;
              }
              
              console.log(`[轮询] 尝试 ${attempt + 1}: 暂无图片输出，继续轮询...`);
            } catch (error) {
              console.error(`[轮询] 尝试 ${attempt + 1} 失败:`, error);
              // 如果是404，说明promptId还不存在，继续轮询
              if (error.response?.status === 404) {
                console.log(`[轮询] promptId ${promptId} 尚未存在，继续轮询...`);
                continue;
              }
            }
          }
          
          // 超时
          setIsGenerating(false);
          alert('获取生成结果超时，请稍后查看历史记录');
        };
        
        pollResult();
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
          setGeneratedImages(imageOutputs);
        }
        setIsGenerating(false);
      } else {
        setIsGenerating(false);
        alert('生成任务已提交，但暂无输出结果');
      }
    } catch (error) {
      console.error('生成失败:', error);
      alert(`生成失败: ${error.response?.data?.message || error.message}`);
      setIsGenerating(false);
    }
  };
  
  // AI对话功能
  const handleSendMessage = async (message = inputMessage) => {
    if (!message.trim()) return;
    
    // 添加用户消息
    const userMessage = { role: 'user', content: message };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsSending(true);
    
    try {
      // 模拟AI回复
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 添加AI回复
      const aiResponses = [
        '这是一个很好的想法！我可以为你生成一些相关的视觉元素。',
        '根据你的描述，我建议使用对比鲜明的色彩搭配来突出主题。',
        '让我为你创建一个符合要求的设计方案。',
        '这个设计方向很棒！我会为你提供几个不同的版本供选择。'
      ];
      const randomResponse = aiResponses[Math.floor(Math.random() * aiResponses.length)];
      const aiMessage = { role: 'assistant', content: randomResponse };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('发送消息失败:', error);
    } finally {
      setIsSending(false);
    }
  };
  
  const handleRefreshQuestions = () => {
    const newQuestions = [
      '如何设计吸引人的海报？',
      'Logo设计有哪些原则？',
      '配色方案推荐',
      '字体选择建议'
    ];
    setQuickQuestions(newQuestions);
  };
  
  // 图层操作功能
  const handleLayerAdd = () => {
    const newLayer = addLayer();
    console.log('添加新图层:', newLayer);
    // 设置新添加的图层为激活状态
    setActiveLayerId(newLayer.id);
    
    // 调试信息
    console.log('New layer added, setting active layer to:', newLayer.id);
  };
  
  // 存储编辑器实例的引用
  const editorRef = useRef(null);
  
  const handleEditorReady = useCallback((editor) => {
    editorRef.current = editor;
    console.log('[主组件] Editor ready:', editor);
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
            console.log('[图层删除] 删除shape:', shapeId);
            editorRef.current.deleteShape(shapeId);
          }
        } catch (error) {
          console.warn('[图层删除] 删除shape失败:', shapeId, error);
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
    console.log('Toggling visibility for layer:', layerId);
    
    // 更新图层可见性状态
    toggleLayerVisibility(layerId);
  };
  
  const handleLayerToggleLock = (layerId) => {
    toggleLayerLock(layerId);
  };
  
  const handleLayerReorder = (layerId, newIndex) => {
    reorderLayer(layerId, newIndex);
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
  
  // 系统功能
  const handleOpenMember = () => {
    console.log('打开会员页面');
  };
  
  const handleNotificationClick = () => {
    console.log('查看通知');
  };
  
  const handleProfileClick = () => {
    console.log('打开个人中心');
  };
  
  return (
    <div className="w-full h-screen bg-gray-100 flex flex-col">
      {/* 顶部导航栏 */}
      <TopNavbar
        projectName={projectName}
        setProjectName={setProjectName}
        isEditingName={isEditingName}
        setIsEditingName={setIsEditingName}
        points={points}
        memberStatus={memberStatus}
        onOpenMember={handleOpenMember}
        onNotificationClick={handleNotificationClick}
        onProfileClick={handleProfileClick}
      />
      
      <div className="flex-1 flex overflow-hidden">
        {/* 生成器面板 */}
        <GeneratorPanel
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
        />
        
        {/* 画布区域 */}
        <div className="flex-1 flex flex-col">
          {/* tldraw画布 */}
          <div className="flex-1 relative bg-gray-200 overflow-hidden">
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
          </div>
        </div>
        
        {/* 图层管理面板 */}
        <LayerPanel
          layers={layers}
          activeLayerId={activeLayerId}
          layerGroups={layerGroups}
          onLayerSelect={setActiveLayerId}
          onLayerAdd={handleLayerAdd}
          onLayerDelete={handleLayerDelete}
          onLayerToggleVisibility={toggleLayerVisibility}
          onLayerToggleLock={handleLayerToggleLock}
          onLayerRename={handleLayerRename}
          onLayerReorder={handleLayerReorder}
          onLayerSetOpacity={handleLayerSetOpacity}
          onLayerSetBlendMode={handleLayerSetBlendMode}
          onLayerGroupCreate={handleLayerGroupCreate}
          onLayerGroupDelete={handleLayerGroupDelete}
          onLayerGroupRename={handleLayerGroupRename}
        />
        
        {/* AI设计师对话面板 */}
        <AIDesignerPanel
          messages={messages}
          inputMessage={inputMessage}
          setInputMessage={setInputMessage}
          onSendMessage={handleSendMessage}
          quickQuestions={quickQuestions}
          onRefreshQuestions={handleRefreshQuestions}
          isSending={isSending}
        />
      </div>
    </div>
  );
};

export default OuzhiArtPlatform;