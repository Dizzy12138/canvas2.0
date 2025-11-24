// React核心
import React, { useState, useRef, useEffect, useCallback } from 'react';

// 第三方库
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
  Package
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


// AI设计师对话面板组件
const AIDesignerPanel = ({ 
  messages, 
  inputMessage, 
  setInputMessage, 
  onSendMessage,
  quickQuestions,
  onRefreshQuestions,
  isSending,
  isCollapsed,
  onToggleCollapse
}) => {
  const messagesEndRef = useRef(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  return (
    <div className={clsx(
      "h-full border-l bg-white flex flex-col transition-all duration-300",
      isCollapsed ? "w-12" : "w-80"
    )}>
      <div className="p-4 border-b flex items-center justify-between">
        {!isCollapsed && (
        <h2 className="text-lg font-semibold text-gray-900">AI 设计师</h2>
        )}
        <button
          onClick={onToggleCollapse}
          className={clsx(
            "p-1 rounded-md hover:bg-gray-100 transition-colors",
            isCollapsed && "mx-auto"
          )}
          title={isCollapsed ? "展开" : "收起"}
        >
          {isCollapsed ? (
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-600" />
          )}
        </button>
      </div>
      
      {!isCollapsed && (
        <>
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
        </>
      )}
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
  const [isEditorInitialized, setIsEditorInitialized] = useState(false);
  const [generatedImages, setGeneratedImages] = useState([]);
  // 用于跟踪生成过程中创建的图层ID，在所有图片添加完成后清除多选状态
  const generatedLayerIdsRef = useRef(new Set());
  // 用于保存最新的layers状态，避免闭包问题（先初始化为null，稍后更新）
  const layersRef = useRef(null);
  // 用于保存 assetId 到文件名的映射（用于图层命名）
  const assetFileNameMapRef = useRef(new Map());
  // 记录 assetId -> 图层ID 列表映射
  const assetLayerMapRef = useRef(new Map());
  
  // 画布状态
  const [activeTool, setActiveTool] = useState('select');
  const [zoomLevel, setZoomLevel] = useState(1);
  
  // 边栏收起状态
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);
  const [isLayerPanelCollapsed, setIsLayerPanelCollapsed] = useState(false);
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false);
  
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
    renameLayerGroup,
    mergeMultipleLayers
  } = useEnhancedLayers([]);
  
  // 更新 layersRef，确保始终使用最新的 layers
  layersRef.current = layers;
  
  // 多选图层状态
  const [selectedLayerIds, setSelectedLayerIds] = useState(new Set());
  
  // 使用图层历史hook
  const { 
    history, 
    currentIndex: historyIndex,
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
      console.info('[LayerNameDebug] updateLayerNamesForAsset: 无关联图层', assetId);
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
        console.info('[LayerNameDebug] updateLayerNamesForAsset: rename layer', layer.id, layer.name, '->', uniqueName);
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
      console.info('[LayerNameDebug] shape added', obj);
      
      // 1. 首先检查文件名映射（如果之前保存过）
      if (assetId && assetFileNameMapRef.current.has(assetId)) {
        fileName = assetFileNameMapRef.current.get(assetId);
        logger.debug(`[图层创建] 从文件名映射获取:`, fileName);
        console.info('[LayerNameDebug] filename from map', fileName);
      }
      
      // 2. 尝试从 asset 中获取文件名（立即尝试，不等待延迟）
      if (!fileName && assetId && editorRef.current) {
        try {
          let asset = null;
          // 先尝试从映射中获取（如果之前已经保存过）
          if (assetFileNameMapRef.current.has(assetId)) {
            fileName = assetFileNameMapRef.current.get(assetId);
            console.info('[LayerNameDebug] filename from map (immediate)', fileName);
          } else {
            // 尝试从 store 中获取 asset
            if (editorRef.current.getAsset) {
              asset = editorRef.current.getAsset(assetId);
              logger.debug(`[图层创建] 通过 getAsset 获取 asset:`, asset);
              console.info('[LayerNameDebug] asset via getAsset', asset);
            } else if (editorRef.current.store) {
              const store = editorRef.current.store;
              if (store.get) {
                asset = store.get(assetId);
              } else if (store.queryRecords) {
                const records = store.queryRecords('asset', () => true);
                asset = records.find(r => r.id === assetId);
              }
              logger.debug(`[图层创建] 通过 store 获取 asset:`, asset);
              console.info('[LayerNameDebug] asset via store', asset);
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
              console.info('[LayerNameDebug] asset debug info', assetDebugInfo);
              
              // 优先使用 asset.props.name（tldraw 可能保存文件名）
              if (asset.props?.name) {
                fileName = asset.props.name;
                logger.debug(`[图层创建] 从 asset.props.name 获取文件名:`, fileName);
                console.info('[LayerNameDebug] filename from asset.props.name', fileName);
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
                    console.info('[LayerNameDebug] filename from asset.props.src', fileName);
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
                console.info('[LayerNameDebug] filename from asset.meta.name', fileName);
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
          console.info('[LayerNameDebug] final layer name from file', layerName);
        } else {
          layerName = '';
          logger.debug(`[图层创建] 文件名无效，使用默认命名`);
          console.info('[LayerNameDebug] filename invalid, fallback to default');
        }
      } else {
        // 如果找不到文件名但有 assetId，延迟检查（asset 监听器可能稍后才保存映射）
        if (assetId) {
          logger.debug(`[图层创建] 未找到文件名，但有 assetId，延迟检查:`, assetId);
          console.info('[LayerNameDebug] no filename but has assetId, will retry', assetId);
          // 延迟检查映射和 asset（asset 监听器可能在 shape 创建之后才触发）
          setTimeout(() => {
            let delayedFileName = null;
            
            // 再次检查映射
            if (assetFileNameMapRef.current.has(assetId)) {
              delayedFileName = assetFileNameMapRef.current.get(assetId);
              console.info('[LayerNameDebug] delayed check: filename from map', delayedFileName);
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
              console.info('[LayerNameDebug] delayed check: no valid filename found', delayedFileName);
            }
          }, 500); // 延迟 500ms，等待 asset 监听器处理（同时上传多个文件时需要更长时间）
        }
        
        // 使用默认命名（addLayer 会自动处理递增编号）
        layerName = '';
        logger.debug(`[图层创建] 未提取到文件名，使用默认命名`);
        console.info('[LayerNameDebug] no filename found, fallback to default');
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
        console.info('[LayerNameDebug] 记录 asset 与图层映射', assetId, newLayer.id, 'total layers:', layerIds.length + 1);
      }
      // 如果已经拿到文件名，立刻尝试命名（延迟一点确保图层已创建）
      const knownName = assetFileNameMapRef.current.get(assetId);
      if (knownName) {
        console.info('[LayerNameDebug] 图层创建后立即更新名称', assetId, knownName, newLayer.id);
        setTimeout(() => {
          updateLayerNamesForAsset(assetId, knownName);
        }, 50);
      } else {
        // 即使没有文件名，也延迟检查一次（asset 监听器可能稍后才保存）
        setTimeout(() => {
          const delayedKnownName = assetFileNameMapRef.current.get(assetId);
          if (delayedKnownName) {
            console.info('[LayerNameDebug] 延迟检查发现文件名，更新图层名称', assetId, delayedKnownName);
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
  
  // 存储编辑器实例的引用（需要在handleObjectModified之前定义）
  const editorRef = useRef(null);
  
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
    
    // 查找包含该shapeId的图层
    const layerToDelete = layers.find(layer => {
      // 检查shapeIds或objects中是否包含该shapeId
      const hasInShapeIds = layer.shapeIds && layer.shapeIds.includes(shapeId);
      const hasInObjects = layer.objects && layer.objects.some(obj => obj.id === shapeId);
      return hasInShapeIds || hasInObjects;
    });
    
    if (layerToDelete) {
      logger.debug('Deleting layer:', layerToDelete.id, 'for shape:', shapeId);
      deleteLayer(layerToDelete.id);
    } else {
      logger.warn('No layer found for deleted shape:', shapeId);
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
      
      logger.debug('应用运行结果:', result);
      
      // 如果有 prompt_id，需要轮询获取结果
      const promptId = result?.prompt_id || result?.promptId;
      
      if (promptId) {
        // 轮询获取结果
        const pollResult = async () => {
          const maxAttempts = 30; // 最多轮询30次
          const basePollInterval = 2000; // 基础轮询间隔：2秒
          const serverErrorInterval = 5000; // 服务器错误时的轮询间隔：5秒
          const maxConsecutiveErrors = 5; // 最大连续错误次数
          
          let consecutiveErrors = 0; // 连续错误计数
          let lastErrorStatus = null; // 最后一次错误的状态码
          
          for (let attempt = 0; attempt < maxAttempts; attempt++) {
            try {
              // 根据错误情况调整轮询间隔
              const pollInterval = (lastErrorStatus && [502, 503, 504].includes(lastErrorStatus)) 
                ? serverErrorInterval 
                : basePollInterval;
              
              await new Promise(resolve => setTimeout(resolve, pollInterval));
              
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
              
              if (!historyData) {
                logger.debug(`[轮询] 尝试 ${attempt + 1}: 无数据，继续轮询...`);
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
                return; // 成功获取结果，停止轮询
              }
              
              logger.debug(`[轮询] 尝试 ${attempt + 1}: 暂无图片输出，继续轮询...`);
            } catch (error) {
              const status = error.response?.status;
              const isServerError = status && [502, 503, 504].includes(status);
              const isNotFound = status === 404;
              
              consecutiveErrors++;
              lastErrorStatus = status;
              
              if (isNotFound) {
                // 404 是正常的，说明任务还没完成，继续轮询
                logger.debug(`[轮询] promptId ${promptId} 尚未存在，继续轮询...`);
                consecutiveErrors = 0; // 404 不算错误
                continue;
              } else if (isServerError) {
                // 服务器错误（502/503/504），可能是服务器繁忙，增加延迟后继续
                logger.warn(`[轮询] 尝试 ${attempt + 1} 遇到服务器错误 ${status}，可能是服务器繁忙，将在 ${serverErrorInterval/1000} 秒后重试...`);
                
                // 如果连续多次遇到服务器错误，提前终止
                if (consecutiveErrors >= maxConsecutiveErrors) {
                  logger.error(`[轮询] 连续 ${consecutiveErrors} 次遇到服务器错误，提前终止轮询`);
                  setIsGenerating(false);
                  errorHandler.showWarning(`服务器繁忙（错误 ${status}），请稍后重试或查看历史记录`);
                  return;
                }
                continue;
              } else {
                // 其他错误
                logger.error(`[轮询] 尝试 ${attempt + 1} 失败:`, error);
                
                // 如果连续多次遇到错误，提前终止
                if (consecutiveErrors >= maxConsecutiveErrors) {
                  logger.error(`[轮询] 连续 ${consecutiveErrors} 次遇到错误，提前终止轮询`);
                  setIsGenerating(false);
                  errorHandler.showWarning('获取生成结果时遇到错误，请稍后查看历史记录');
                  return;
                }
                continue;
              }
            }
          }
          
          // 超时
          logger.error(`[轮询] 超时：已尝试 ${maxAttempts} 次，仍未获取到结果`);
          logger.error(`[轮询] promptId: ${promptId}`);
          setIsGenerating(false);
          errorHandler.showWarning('获取生成结果超时，请稍后查看历史记录');
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
      logger.error('发送消息失败:', error);
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
    logger.debug('添加新图层:', newLayer);
    // 设置新添加的图层为激活状态
    setActiveLayerId(newLayer.id);
    
    // 调试信息
    logger.debug('New layer added, setting active layer to:', newLayer.id);
  };
  
  const handleEditorReady = useCallback((editor) => {
    editorRef.current = editor;
    logger.debug('[主组件] Editor ready:', editor);
    console.info('[LayerNameDebug] Editor ready, instance captured');
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
          logger.warn(`[图层选择] 有 ${invalidShapeIds.length} 个无效的 shapeId:`, invalidShapeIds);
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
          logger.warn(`[图层选择] 图层 ${activeLayerId} 没有有效的 shape`);
        }
      } else {
        logger.warn(`[图层选择] 图层 ${activeLayerId} 没有 shapeIds`);
      }
    } else {
      logger.warn(`[图层选择] 图层不存在:`, activeLayerId);
    }
  }, [activeLayerId, layers]);
  
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
                console.info('[LayerNameDebug] asset filename mapped', assetId, fileName);
                
                // 检查是否有对应的图层需要更新名称
                if (fileName && !/^\d+$/.test(fileName)) {
                  const currentLayers = layersRef.current || [];
                  console.info('[LayerNameDebug] asset listener: checking layers', {
                    assetId,
                    fileName,
                    layersCount: currentLayers.length,
                    layers: currentLayers.map(l => ({ id: l.id, name: l.name, shapeIdsCount: l.shapeIds?.length || 0 }))
                  });
                  
                  // 查找包含该 assetId 的图层
                  const targetLayer = currentLayers.find(layer => {
                    if (!layer.shapeIds || layer.shapeIds.length === 0) {
                      console.info('[LayerNameDebug] asset listener: layer has no shapeIds', layer.id);
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
                          console.info('[LayerNameDebug] asset listener: found matching shape', {
                            layerId: layer.id,
                            layerName: layer.name,
                            shapeId,
                            shapeAssetId,
                            assetId
                          });
                        }
                        return matches;
                      } catch (error) {
                        console.info('[LayerNameDebug] asset listener: error getting shape', shapeId, error);
                        return false;
                      }
                    });
                    return found;
                  });
                  
                  console.info('[LayerNameDebug] asset listener: targetLayer found', targetLayer ? {
                    id: targetLayer.id,
                    name: targetLayer.name,
                    shapeIds: targetLayer.shapeIds
                  } : null);
                  
                  if (targetLayer) {
                    // 如果图层名称还是默认的"图层 X"格式（包括 "图层 X (N)" 格式），更新为文件名
                    const isDefaultName = /^图层 \d+/.test(targetLayer.name);
                    console.info('[LayerNameDebug] asset listener: checking default name', {
                      layerName: targetLayer.name,
                      isDefaultName,
                      pattern: /^图层 \d+/.test(targetLayer.name)
                    });
                    // 强制更新：如果图层名称是默认格式，或者图层名称与文件名不同，都更新
                    if (isDefaultName || targetLayer.name !== fileName) {
                      logger.debug(`[Asset监听] 更新图层名称: ${targetLayer.id} (${targetLayer.name}) -> ${fileName}`);
                      console.info('[LayerNameDebug] asset listener: update layer name', targetLayer.id, targetLayer.name, '->', fileName);
                      renameLayer(targetLayer.id, fileName);
                    } else {
                      console.info('[LayerNameDebug] asset listener: layer name already matches filename, skip update', targetLayer.name);
                    }
                  } else {
                    console.info('[LayerNameDebug] asset listener: no target layer found for assetId', assetId);
                    // 如果没找到图层，可能是图层还没创建，延迟再试一次
                    setTimeout(() => {
                      console.info('[LayerNameDebug] asset listener: retry updateLayerNamesForAsset', assetId, fileName);
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
          <div className="flex-1 relative bg-gray-200 overflow-hidden" style={{ zIndex: 1 }}>
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
        <div className="relative z-[100]">
          <LayerPanel
            layers={layers}
            activeLayerId={activeLayerId}
            selectedLayerIds={selectedLayerIds}
            layerGroups={layerGroups}
            onLayerSelect={handleLayerSelectWithSync}
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
            onGroupSelectedLayers={handleGroupSelectedLayers}
            onMergeSelectedLayers={handleMergeSelectedLayers}
            onClearSelection={handleClearSelection}
            isCollapsed={isLayerPanelCollapsed}
            onToggleCollapse={() => setIsLayerPanelCollapsed(!isLayerPanelCollapsed)}
            editorRef={editorRef}
          />
        </div>
        
        {/* AI设计师对话面板 */}
        <AIDesignerPanel
          messages={messages}
          inputMessage={inputMessage}
          setInputMessage={setInputMessage}
          onSendMessage={handleSendMessage}
          quickQuestions={quickQuestions}
          onRefreshQuestions={handleRefreshQuestions}
          isSending={isSending}
          isCollapsed={isRightPanelCollapsed}
          onToggleCollapse={() => setIsRightPanelCollapsed(!isRightPanelCollapsed)}
        />
      </div>
    </div>
  );
};

export default OuzhiArtPlatform;