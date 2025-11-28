// React核心
import React, { useState, useRef, useEffect } from 'react';

// 第三方库
import { Rocket, ChevronRight, ChevronLeft, Package, Image } from 'lucide-react';
import clsx from 'clsx';

// API和工具
import api from '@/api/index.js';
import logger, { createLogger } from '../../utils/logger.js';
import errorHandler from '../../utils/errorHandler.js';

/**
 * GeneratorPanel组件 - 生成器面板，用于选择应用和配置生成参数
 * 
 * @param {Function} onGenerate - 生成回调函数
 * @param {boolean} isGenerating - 是否正在生成
 * @param {boolean} isCollapsed - 是否折叠
 * @param {Function} onToggleCollapse - 切换折叠状态回调
 * @param {Array} layers - 图层列表
 * @param {Object} editorRef - 编辑器引用
 */
const GeneratorPanel = ({ 
  onGenerate,
  isGenerating,
  isCollapsed,
  onToggleCollapse,
  layers = [],
  editorRef = null
}) => {
  // 应用选择相关状态
  const [apps, setApps] = useState([]);
  const [selectedAppId, setSelectedAppId] = useState('');
  const [selectedApp, setSelectedApp] = useState(null);
  const [loadingApps, setLoadingApps] = useState(false);
  const [loadingApp, setLoadingApp] = useState(false);
  
  // 组件输入值状态
  const [inputValues, setInputValues] = useState({});
  const [wasGenerating, setWasGenerating] = useState(false);
  
  // 注：已移除前端可配置的轮询超时，使用平台/后端默认值以简化体验
  
  // 监听生成状态，生成完成后清空上传组件
  useEffect(() => {
    // 如果从生成中变为非生成中，说明生成完成
    if (wasGenerating && !isGenerating) {
      logger.debug(`[GeneratorPanel] 生成完成，清空上传组件值`);
      setInputValues((prev) => {
        const newValues = { ...prev };
        // 清空所有上传组件的值
        Object.keys(newValues).forEach(key => {
          const value = newValues[key];
          if (value instanceof File || (Array.isArray(value) && value.some(v => v instanceof File)) || 
              (typeof value === 'string' && (value.startsWith('data:') || value.includes('/uploads/')))) {
            logger.debug(`[GeneratorPanel] 清空上传组件值: ${key}`);
            newValues[key] = null;
          }
        });
        return newValues;
      });
    }
    setWasGenerating(isGenerating);
  }, [isGenerating, wasGenerating]);
  
  // 加载应用列表
  useEffect(() => {
    const loadApps = async () => {
      setLoadingApps(true);
      try {
        const response = await api.get('/apps');
        const appsList = response.data?.data || [];
        setApps(appsList);
      } catch (error) {
        const errorMessage = errorHandler.handleError(error, 'GeneratorPanel.loadApps');
        logger.error('加载应用列表失败:', errorMessage);
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
          // 初始化输入值（保留已有的值，只设置新组件的默认值）
          setInputValues((prev) => {
            const initialValues = { ...prev }; // 保留已有值
            if (appData.components && appData.uiBindings) {
              appData.components.forEach(comp => {
                const binding = appData.uiBindings.find(b => b.componentId === comp.id);
                if (binding && binding.bindTo) {
                  // 只有当该路径没有值时才设置默认值
                  if (!(binding.bindTo in initialValues)) {
                    initialValues[binding.bindTo] = binding.default || '';
                  }
                }
              });
            }
            logger.debug(`[GeneratorPanel] Initialized inputValues:`, Object.keys(initialValues));
            return initialValues;
          });
        } catch (error) {
          const errorMessage = errorHandler.handleError(error, 'GeneratorPanel.loadAppDetails');
          logger.error('加载应用详情失败:', errorMessage);
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
  
  // 上传组件（支持拖拽图层）
  const UploadComponent = ({ comp, value, setVal, multiple }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [selectedLayerId, setSelectedLayerId] = useState(null);
    const lastValueRef = useRef(null); // 跟踪上一次的 value，避免重复处理
    
    // 当 value 变化时，如果 value 是 File 对象，尝试根据文件名找到对应的图层
    // File 对象的名字格式通常是 "layer-{layerName}-{timestamp}.png"
    useEffect(() => {
      // 如果 value 没有变化，跳过
      if (value === lastValueRef.current) {
        return;
      }
      
      logger.debug(`[UploadComponent] useEffect triggered, value:`, value instanceof File ? value.name : value, `selectedLayerId:`, selectedLayerId);
      lastValueRef.current = value;
      
      if (value instanceof File) {
        // 尝试从文件名中提取图层名称
        // 文件名格式: "layer-{layerName}-{timestamp}.png"
        const match = value.name.match(/^layer-(.+?)-(\d+)\./);
        if (match) {
          const layerName = match[1];
          logger.debug(`[UploadComponent] Extracted layer name from filename: ${layerName}`);
          
          // 尝试根据图层名称找到对应的图层
          const matchingLayer = layers.find(l => l.name === layerName);
          if (matchingLayer) {
            logger.debug(`[UploadComponent] Found matching layer: ${matchingLayer.id}, current selectedLayerId: ${selectedLayerId}`);
            if (matchingLayer.id !== selectedLayerId) {
              logger.debug(`[UploadComponent] Updating selectedLayerId from ${selectedLayerId} to ${matchingLayer.id}`);
              setSelectedLayerId(matchingLayer.id);
            } else {
              logger.debug(`[UploadComponent] Layer already selected: ${selectedLayerId}`);
            }
          } else {
            logger.debug(`[UploadComponent] No exact match for layer name "${layerName}", available layers:`, layers.map(l => l.name));
          }
        } else {
          logger.debug(`[UploadComponent] File name doesn't match expected pattern: ${value.name}`);
        }
      } else if ((value === null || value === '') && selectedLayerId) {
        // 只有在值明确被清空时才清除选中的图层，避免异步加载期间闪动
        logger.debug(`[UploadComponent] Value cleared, clearing selectedLayerId`);
        setSelectedLayerId(null);
      }
    }, [value, layers]); // 移除 selectedLayerId 从依赖项，避免循环更新
    
    // 将单个形状转换为图片
    const convertShapeToImage = async (shape, layerName) => {
      if (!editorRef?.current) {
        logger.warn('[convertShapeToImage] Editor not available');
        return null;
      }
      const convertLogger = createLogger('convertShapeToImage');
      convertLogger.info(`开始转换 shape=${shape.id}, type=${shape.type}`);
      
      try {
        const shapeExistsInEditor = !!editorRef.current.getShape?.(shape.id);
        if (!shapeExistsInEditor) {
          convertLogger.info(`shape=${shape.id} 不存在于 tldraw store，直接使用 canvas 渲染`);
          return await renderShapesToCanvas([shape], layerName);
        }

        if (editorRef.current.getSvg) {
          try {
            convertLogger.info('尝试通过 getSvg 导出单个 shape');
            const svg = await editorRef.current.getSvg([shape.id]);
            if (svg) {
              convertLogger.info('getSvg 成功，返回 SVG 字符串长度:', svg.length);
              return await svgToFile(svg, layerName);
            } else {
              convertLogger.info('getSvg 返回空结果');
            }
          } catch (svgError) {
            convertLogger.warn('getSvg 失败:', svgError);
          }
        }
        
        if (editorRef.current.exportImage) {
          try {
            convertLogger.info('尝试通过 exportImage 导出单个 shape');
            const imageData = await editorRef.current.exportImage([shape.id], { format: 'png' });
            if (imageData) {
              convertLogger.info('exportImage 成功，生成 Blob 大小:', imageData.size || (imageData.length ?? '未知'));
              return new File([imageData], `layer-${layerName}-${Date.now()}.png`, { type: 'image/png' });
            } else {
              convertLogger.info('exportImage 返回空结果');
            }
          } catch (exportError) {
            convertLogger.warn('exportImage 失败:', exportError);
          }
        }
        
        convertLogger.info('回退到 canvas 渲染单个 shape');
        return await renderShapesToCanvas([shape], layerName);
      } catch (error) {
        convertLogger.error('转换 shape 过程中出现错误:', error);
        return null;
      }
    };
    
    // 将多个形状转换为图片
    const convertShapesToImage = async (shapes, layerName) => {
      if (!editorRef?.current || shapes.length === 0) {
        logger.warn('[convertShapesToImage] Editor not available 或 shapes 为空');
        return null;
      }
      const convertLogger = createLogger('convertShapesToImage');
      convertLogger.info(`开始转换 ${shapes.length} 个 shape`);
      
      try {
        const shapeIds = shapes.map(s => s.id).filter(Boolean);
        const storeHasAllShapes = shapeIds.every(id => editorRef.current.getShape?.(id));
        if (!storeHasAllShapes) {
          convertLogger.info('tldraw store 中缺少部分 shape，跳过 getSvg/exportImage，直接使用 canvas');
        }
        
        if (storeHasAllShapes && editorRef.current.getSvg) {
          try {
            convertLogger.info('尝试通过 getSvg 导出多个 shape');
            const svg = await editorRef.current.getSvg(shapeIds);
            if (svg) {
              convertLogger.info('getSvg 成功，返回 SVG 字符串长度:', svg.length);
              return await svgToFile(svg, layerName);
            } else {
              convertLogger.info('getSvg 返回空结果');
            }
          } catch (svgError) {
            convertLogger.warn('getSvg 失败:', svgError);
          }
        }
        
        if (storeHasAllShapes && editorRef.current.exportImage) {
          try {
            convertLogger.info('尝试通过 exportImage 导出多个 shape');
            const imageData = await editorRef.current.exportImage(shapeIds, { format: 'png' });
            if (imageData) {
              convertLogger.info('exportImage 成功，生成 Blob 大小:', imageData.size || (imageData.length ?? '未知'));
              return new File([imageData], `layer-${layerName}-${Date.now()}.png`, { type: 'image/png' });
            } else {
              convertLogger.info('exportImage 返回空结果');
            }
          } catch (exportError) {
            convertLogger.warn('exportImage 失败:', exportError);
          }
        }
        
        convertLogger.info('回退到 canvas 渲染多个 shape');
        return await renderShapesToCanvas(shapes, layerName);
      } catch (error) {
        convertLogger.error('转换 shapes 过程中出现错误:', error);
        return null;
      }
    };
    
    // 将 SVG 转换为图片文件
    const svgToFile = async (svg, layerName) => {
      const svgLogger = createLogger('svgToFile');
      svgLogger.info('开始将 SVG 转换为 PNG，SVG 长度:', svg?.length);
      return new Promise((resolve, reject) => {
        try {
          const img = new Image();
          const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
          const url = URL.createObjectURL(svgBlob);
          
          img.onload = () => {
            try {
              svgLogger.info('SVG 加载成功，尺寸:', img.width, img.height);
              const canvas = document.createElement('canvas');
              canvas.width = img.width || 800;
              canvas.height = img.height || 600;
              const ctx = canvas.getContext('2d');
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, 0);
              canvas.toBlob((blob) => {
                URL.revokeObjectURL(url);
                if (blob) {
                  svgLogger.info('Canvas 转换成功，Blob 大小:', blob.size);
                  resolve(new File([blob], `layer-${layerName}-${Date.now()}.png`, { type: 'image/png' }));
                } else {
                  svgLogger.error('Canvas toBlob 返回 null，可能是跨域导致画布被污染');
                  reject(new Error('Failed to convert canvas to blob'));
                }
              }, 'image/png');
            } catch (canvasError) {
              URL.revokeObjectURL(url);
              svgLogger.error('绘制 SVG 到 Canvas 失败:', canvasError);
              reject(canvasError);
            }
          };
          
          img.onerror = (event) => {
            URL.revokeObjectURL(url);
            svgLogger.error('SVG 图片加载失败:', event);
            reject(new Error('Failed to load SVG image'));
          };
          
          img.src = url;
        } catch (error) {
          svgLogger.error('svgToFile 异常:', error);
          reject(error);
        }
      });
    };
    
    // 使用 canvas 渲染形状（备用方案）
    const renderShapesToCanvas = async (shapes, layerName) => {
      const renderLogger = createLogger('renderShapesToCanvas');
      return new Promise(async (resolve, reject) => {
        try {
          if (!shapes || shapes.length === 0) {
            reject(new Error('No shapes provided for rendering'));
            return;
          }

          const padding = 20;
          let minX = Infinity;
          let minY = Infinity;
          let maxX = -Infinity;
          let maxY = -Infinity;

          // 计算所有形状的边界框
          for (const shape of shapes) {
            if (shape?.x !== undefined && shape?.y !== undefined) {
              const w = shape.props?.w || shape.w || 0;
              const h = shape.props?.h || shape.h || 0;
              minX = Math.min(minX, shape.x);
              minY = Math.min(minY, shape.y);
              maxX = Math.max(maxX, shape.x + w);
              maxY = Math.max(maxY, shape.y + h);
            }

            if (shape?.type === 'draw') {
              let points = [];
              if (shape.props?.segments && Array.isArray(shape.props.segments)) {
                shape.props.segments.forEach((segment) => {
                  if (segment.points && Array.isArray(segment.points)) {
                    points = points.concat(segment.points);
                  }
                });
              }
              if (shape.props?.points && Array.isArray(shape.props.points)) {
                points = shape.props.points;
              }

              points.forEach((point) => {
                let px;
                let py;
                if (typeof point === 'object') {
                  px = point.x !== undefined ? point.x : (Array.isArray(point) ? point[0] : 0);
                  py = point.y !== undefined ? point.y : (Array.isArray(point) ? point[1] : 0);
                } else if (Array.isArray(point)) {
                  px = point[0] || 0;
                  py = point[1] || 0;
                } else {
                  return;
                }

                const offsetX = shape.x !== undefined ? shape.x : 0;
                const offsetY = shape.y !== undefined ? shape.y : 0;
                const realX = px + offsetX;
                const realY = py + offsetY;

                minX = Math.min(minX, realX);
                minY = Math.min(minY, realY);
                maxX = Math.max(maxX, realX);
                maxY = Math.max(maxY, realY);
              });
            }
          }

          if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
            minX = 0;
            minY = 0;
            maxX = 800;
            maxY = 600;
          }

          if (maxX - minX < 10) {
            maxX = minX + 10;
          }
          if (maxY - minY < 10) {
            maxY = minY + 10;
          }

          const width = maxX - minX + padding * 2;
          const height = maxY - minY + padding * 2;

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, width, height);

          const hasImageShape = shapes.some(shape => shape.type === 'image');
          if (!hasImageShape) {
            renderLogger.info('当前图层不包含图片形状，填充白色背景以保持非透明绘制');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
          }

          const resolveImageSource = async (shape) => {
            if (shape.props?.src) {
              return shape.props.src;
            }

            if (shape.props?.assetId && editorRef?.current) {
              if (editorRef.current.getAsset) {
                try {
                  const asset = editorRef.current.getAsset(shape.props.assetId);
                  if (asset?.props?.src) {
                    return asset.props.src;
                  }
                } catch (assetError) {
                  renderLogger.warn(`Failed to resolve asset via getAsset:`, assetError);
                }
              }

              if (editorRef.current.store) {
                try {
                  const store = editorRef.current.store;
                  let assetRecord = null;
                  if (store.get) {
                    assetRecord = store.get(shape.props.assetId);
                  } else if (store.queryRecords) {
                    const records = store.queryRecords('asset', () => true);
                    assetRecord = records.find(r => r.id === shape.props.assetId);
                  }
                  if (assetRecord?.props?.src) {
                    return assetRecord.props.src;
                  }
                } catch (storeError) {
                  renderLogger.warn(`Failed to resolve asset via store:`, storeError);
                }
              }
            }

            return null;
          };

          const loadImage = async (src) => {
            try {
              // 如果是 data URL，直接使用，不需要 fetch
              const isDataUrl = typeof src === 'string' && (src.startsWith('data:') || src.startsWith('blob:'));
              
              let objectUrl = null;
              let finalSrc = src;
              
              if (!isDataUrl) {
                // 对于非 data URL，尝试通过 fetch 获取并转换为 blob
                try {
                  const response = await fetch(src);
                  const blob = await response.blob();
                  objectUrl = URL.createObjectURL(blob);
                  finalSrc = objectUrl;
                } catch (fetchError) {
                  renderLogger.warn(`Failed to fetch image, using src directly:`, fetchError);
                  // 如果 fetch 失败，直接使用原始 src
                  finalSrc = src;
                }
              }
              
              return await new Promise((resolveImage, rejectImage) => {
                // 使用 document.createElement 代替 new Image() 以确保兼容性
                const img = document.createElement('img');
                img.crossOrigin = 'anonymous';
                
                const cleanup = () => {
                  if (objectUrl) {
                    URL.revokeObjectURL(objectUrl);
                  }
                };
                
                img.onload = () => {
                  resolveImage({ img, objectUrl: objectUrl || src });
                };
                
                img.onerror = (event) => {
                  cleanup();
                  renderLogger.error(`Failed to load image from src: ${src.substring(0, 100)}...`, event);
                  rejectImage(event);
                };
                
                img.src = finalSrc;
              });
            } catch (error) {
              renderLogger.error(`Failed to load image from src: ${src}`, error);
              return null;
            }
          };

          for (const shape of shapes) {
            renderLogger.info(`Processing shape:`, {
              id: shape.id,
              type: shape.type,
              props: shape.props,
              x: shape.x,
              y: shape.y
            });

            if (shape.type === 'draw') {
              const color = shape.props?.color || shape.props?.stroke || '#000000';
              const strokeWidth = shape.props?.strokeWidth || shape.props?.size || 2;
              ctx.strokeStyle = color;
              ctx.lineWidth = strokeWidth;
              ctx.lineCap = 'round';
              ctx.lineJoin = 'round';

              let points = [];
              if (shape.props?.segments && Array.isArray(shape.props.segments)) {
                shape.props.segments.forEach((segment) => {
                  if (segment.points && Array.isArray(segment.points)) {
                    points = points.concat(segment.points);
                  }
                });
              }
              if (shape.props?.points && Array.isArray(shape.props.points)) {
                points = shape.props.points;
              }

              if (points.length === 0) {
                continue;
              }

              ctx.beginPath();
              const offsetX = (shape.x !== undefined ? shape.x : 0) - minX + padding;
              const offsetY = (shape.y !== undefined ? shape.y : 0) - minY + padding;

              const firstPoint = points[0];
              const parsePoint = (point) => {
                if (Array.isArray(point)) {
                  return { x: point[0] + offsetX, y: point[1] + offsetY };
                }
                if (typeof point === 'object') {
                  const px = point.x !== undefined ? point.x : (Array.isArray(point) ? point[0] : 0);
                  const py = point.y !== undefined ? point.y : (Array.isArray(point) ? point[1] : 0);
                  return { x: px + offsetX, y: py + offsetY };
                }
                return null;
              };

              const start = parsePoint(firstPoint);
              if (!start) {
                continue;
              }
              ctx.moveTo(start.x, start.y);

              for (let i = 1; i < points.length; i++) {
                const parsed = parsePoint(points[i]);
                if (parsed) {
                  ctx.lineTo(parsed.x, parsed.y);
                }
              }

              ctx.stroke();
            } else if (shape.type === 'geo' || shape.type === 'rectangle' || shape.type === 'ellipse') {
              const x = (shape.x || shape.props?.x || 0) - minX + padding;
              const y = (shape.y || shape.props?.y || 0) - minY + padding;
              const w = shape.props?.w || shape.w || 0;
              const h = shape.props?.h || shape.h || 0;

              const strokeColor = shape.props?.color || shape.props?.stroke || '#000000';
              const rawFill = shape.props?.fill || shape.style?.fill;
              const hasFill = rawFill && rawFill !== 'none' && rawFill !== 'transparent';

              ctx.strokeStyle = strokeColor;
              ctx.lineWidth = shape.props?.strokeWidth || 2;

              if (shape.type === 'ellipse' || shape.type === 'geo') {
                ctx.beginPath();
                ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, 2 * Math.PI);
                if (hasFill) {
                  ctx.fillStyle = rawFill;
                  ctx.fill();
                }
                ctx.stroke();
              } else {
                if (hasFill) {
                  ctx.fillStyle = rawFill;
                  ctx.fillRect(x, y, w, h);
                }
                ctx.strokeRect(x, y, w, h);
              }
            } else if (shape.type === 'image') {
              const x = (shape.x || shape.props?.x || 0) - minX + padding;
              const y = (shape.y || shape.props?.y || 0) - minY + padding;
              const w = shape.props?.w || shape.w || 0;
              const h = shape.props?.h || shape.h || 0;

              const imageSrc = await resolveImageSource(shape);
              if (!imageSrc) {
                renderLogger.warn(`Image shape ${shape.id} has no src, skipping.`);
                continue;
              }

              const loaded = await loadImage(imageSrc);
              if (!loaded) {
                renderLogger.error(`加载图片失败，无法绘制 shape ${shape.id}`);
                continue;
              }

              const { img, objectUrl } = loaded;
              ctx.save();
              const rotation = shape.rotation ?? shape.props?.rotation ?? 0;
              if (rotation) {
                const centerX = x + w / 2;
                const centerY = y + h / 2;
                ctx.translate(centerX, centerY);
                ctx.rotate(rotation);
                ctx.translate(-centerX, -centerY);
              }
              ctx.drawImage(img, x, y, w, h);
              ctx.restore();
              // 只在 objectUrl 是有效的 blob URL 时才清理（不是 data URL 或原始 URL）
              if (objectUrl && objectUrl.startsWith('blob:')) {
                URL.revokeObjectURL(objectUrl);
              }
            } else {
              renderLogger.info(`Unsupported shape type during render: ${shape.type}`);
            }
          }

          canvas.toBlob((blob) => {
            if (blob) {
              renderLogger.info('canvas.toBlob 成功，Blob 大小:', blob.size);
              const file = new File([blob], `layer-${layerName}-${Date.now()}.png`, { type: 'image/png' });
              resolve(file);
            } else {
              renderLogger.error('canvas.toBlob 返回 null（可能是跨域图片导致）');
              reject(new Error('Failed to convert canvas to blob'));
            }
          }, 'image/png');
        } catch (error) {
          renderLogger.error('renderShapesToCanvas 异常:', error);
          reject(error);
        }
      });
    };
    
    // 从图层中提取图片数据
    const extractImageFromLayer = async (layerId) => {
      logger.debug(`[extractImageFromLayer] Starting extraction for layerId: ${layerId}`);
      
      if (!editorRef?.current) {
        logger.warn('[extractImageFromLayer] Editor not available');
        return null;
      }
      
      const layer = layers.find(l => l.id === layerId);
      if (!layer) {
        logger.warn(`[extractImageFromLayer] Layer not found: ${layerId}`);
        logger.debug(`[extractImageFromLayer] Available layers:`, layers.map(l => ({ id: l.id, name: l.name })));
        return null;
      }
      
      logger.debug(`[extractImageFromLayer] Found layer:`, { id: layer.id, name: layer.name, shapeIds: layer.shapeIds, objects: layer.objects });
      
      try {
        // 获取图层关联的shape
        const shapeIds = layer.shapeIds || layer.objects?.map(obj => obj.id) || [];
        logger.debug(`[extractImageFromLayer] Shape IDs:`, shapeIds);
        
        if (shapeIds.length === 0) {
          logger.warn('[extractImageFromLayer] No shapes in layer');
          return null;
        }
        
        // 如果图层包含多个 shape，需要将所有 shape 合并成一个图片
        if (shapeIds.length > 1) {
          logger.debug(`[extractImageFromLayer] 图层包含 ${shapeIds.length} 个 shape，需要合并`);
          try {
            const allShapes = shapeIds.map(id => editorRef.current.getShape(id)).filter(Boolean);
            const shapeMap = new Map(allShapes.map(shape => [shape.id, shape]));

            if (layer.objects && layer.objects.length > 0) {
              logger.debug(`[extractImageFromLayer] 从 layer.objects 补充 shape 数据: ${layer.objects.length} 项`);
              layer.objects.forEach(obj => {
                const storedShape = obj?.data || obj;
                if (!storedShape?.id) {
                  return;
                }
                if (!shapeMap.has(storedShape.id)) {
                  logger.debug(`[extractImageFromLayer] 追加缺失的 shape: ${storedShape.id}, type=${storedShape.type}`);
                  shapeMap.set(storedShape.id, storedShape);
                  allShapes.push(storedShape);
                }
              });
            }

            const missingIds = shapeIds.filter(id => !shapeMap.has(id));
            if (missingIds.length > 0) {
              logger.warn(`[extractImageFromLayer] 仍有 ${missingIds.length} 个 shapeId 未找到:`, missingIds);
            }

            if (allShapes.length > 0) {
              // 优先尝试将所有 shape 合并成一个图片
              const imageFile = await convertShapesToImage(allShapes, layer.name);
              if (imageFile) {
                logger.debug(`[extractImageFromLayer] 成功将所有 ${allShapes.length} 个 shape 合并为图片`);
                return imageFile;
              }
            }
          } catch (conversionError) {
            logger.warn(`[extractImageFromLayer] 合并所有 shape 失败，尝试单独处理:`, conversionError);
          }
        }
        
        // 如果只有一个 shape 或合并失败，尝试单独处理每个 shape
        for (const shapeId of shapeIds) {
          logger.debug(`[extractImageFromLayer] Trying shapeId: ${shapeId}`);
          const shape = editorRef.current.getShape(shapeId);
          
          if (!shape) {
            logger.warn(`[extractImageFromLayer] Shape not found: ${shapeId}`);
            const fallbackObject = layer.objects?.find(obj => obj.id === shapeId);
            if (fallbackObject?.data) {
              logger.debug(`[extractImageFromLayer] 使用 layer.objects 中的数据作为备用 shape: ${shapeId}`);
              const storedShape = fallbackObject.data;
              if (storedShape) {
                const imageFile = await convertShapeToImage(storedShape, layer.name);
                if (imageFile) {
                  return imageFile;
                }
              }
            }
            continue;
          }
          
          logger.debug(`[extractImageFromLayer] Found shape:`, { 
            id: shape.id, 
            type: shape.type, 
            hasProps: !!shape.props,
            propsKeys: shape.props ? Object.keys(shape.props) : [],
            src: shape.props?.src,
            assetId: shape.props?.assetId,
            w: shape.props?.w,
            h: shape.props?.h
          });
        
          // 如果是图片shape，尝试多种方式提取图片URL
          if (shape.type === 'image') {
            let imageUrl = null;
            
            // 方式1: 直接从 props.src 获取
            if (shape.props?.src) {
              imageUrl = shape.props.src;
              logger.debug(`[extractImageFromLayer] Found image URL from props.src:`, imageUrl.substring(0, 100) + '...');
            }
            // 方式2: 从 assetId 获取（tldraw 可能使用 asset 存储图片）
            else if (shape.props?.assetId) {
              // 尝试通过 getAsset 方法获取
              if (editorRef.current.getAsset) {
                try {
                  const asset = editorRef.current.getAsset(shape.props.assetId);
                  logger.debug(`[extractImageFromLayer] Found asset via getAsset:`, asset);
                  if (asset && asset.props?.src) {
                    imageUrl = asset.props.src;
                    logger.debug(`[extractImageFromLayer] Found image URL from asset:`, imageUrl.substring(0, 100) + '...');
                  }
                } catch (assetError) {
                  logger.warn(`[extractImageFromLayer] Failed to get asset via getAsset:`, assetError);
                }
              }
              
              // 如果 getAsset 失败，尝试通过 store 获取
              if (!imageUrl && editorRef.current.store) {
                try {
                  const store = editorRef.current.store;
                  // tldraw store 可能使用不同的方法，尝试多种方式
                  let assetRecord = null;
                  if (store.get) {
                    assetRecord = store.get(shape.props.assetId);
                  } else if (store.queryRecords) {
                    const records = store.queryRecords('asset', () => true);
                    assetRecord = records.find(r => r.id === shape.props.assetId);
                  }
                  
                  logger.debug(`[extractImageFromLayer] Found asset record from store:`, assetRecord);
                  if (assetRecord && assetRecord.props?.src) {
                    imageUrl = assetRecord.props.src;
                    logger.debug(`[extractImageFromLayer] Found image URL from asset record:`, imageUrl.substring(0, 100) + '...');
                  }
                } catch (storeError) {
                  logger.warn(`[extractImageFromLayer] Failed to get asset from store:`, storeError);
                }
              }
            }
            
            if (imageUrl) {
              // 如果是数据URL，直接转换为File
              if (imageUrl.startsWith('data:')) {
                try {
                  const response = await fetch(imageUrl);
                  const blob = await response.blob();
                  const file = new File([blob], `layer-${layer.name}-${Date.now()}.png`, { type: 'image/png' });
                  logger.debug(`[extractImageFromLayer] Successfully converted data URL to File`);
                  return file;
                } catch (error) {
                  logger.warn('[extractImageFromLayer] Failed to convert data URL to File, returning URL:', error);
                  // 如果转换失败，返回 URL 字符串，让后端处理
                  return imageUrl;
                }
              }
              
              // 如果是URL，尝试获取
              try {
                const response = await fetch(imageUrl);
                const blob = await response.blob();
                const file = new File([blob], `layer-${layer.name}-${Date.now()}.png`, { type: blob.type || 'image/png' });
                logger.debug(`[extractImageFromLayer] Successfully fetched image and converted to File`);
                return file;
              } catch (fetchError) {
                // 如果 fetch 失败（可能是跨域问题），返回 URL 字符串，让后端处理
                logger.warn(`[extractImageFromLayer] Failed to fetch image from URL (可能跨域问题), returning URL string:`, fetchError);
                return imageUrl;
              }
            } else {
              logger.debug(`[extractImageFromLayer] Shape ${shapeId} is image type but has no src or assetId`);
            }
          } else {
            logger.debug(`[extractImageFromLayer] Shape ${shapeId} is not an image type. Type: ${shape.type}`);
            // 对于非图片类型的形状（如 draw、geo、line 等），尝试将其转换为图片
            try {
              const imageFile = await convertShapeToImage(shape, layer.name);
              if (imageFile) {
                logger.debug(`[extractImageFromLayer] Successfully converted shape to image`);
                return imageFile;
              }
            } catch (conversionError) {
              logger.warn(`[extractImageFromLayer] Failed to convert shape to image:`, conversionError);
            }
          }
        }
        
        // 尝试从layer的objects中获取图片数据
        if (layer.objects && layer.objects.length > 0) {
          logger.debug(`[extractImageFromLayer] Trying to extract from layer.objects:`, layer.objects);
          const obj = layer.objects[0];
          if (obj.data?.imageUrl || obj.data?.imageData) {
            const imageUrl = obj.data.imageUrl || obj.data.imageData;
            logger.debug(`[extractImageFromLayer] Found image URL in objects:`, imageUrl.substring(0, 100) + '...');
            try {
              const response = await fetch(imageUrl);
              const blob = await response.blob();
              const file = new File([blob], `layer-${layer.name}-${Date.now()}.png`, { type: blob.type || 'image/png' });
              logger.debug(`[extractImageFromLayer] Successfully extracted from objects and converted to File`);
              return file;
            } catch (fetchError) {
              // 如果 fetch 失败，返回 URL 字符串，让后端处理
              logger.warn(`[extractImageFromLayer] Failed to fetch image from URL in objects, returning URL string:`, fetchError);
              return imageUrl;
            }
          }
        }
        
        // 如果所有形状都是非图片类型，尝试将整个图层转换为图片
        if (shapeIds.length > 0) {
          logger.debug(`[extractImageFromLayer] Attempting to convert all shapes in layer to image`);
          try {
            const allShapes = shapeIds.map(id => editorRef.current.getShape(id)).filter(Boolean);
            if (allShapes.length > 0) {
              const imageFile = await convertShapesToImage(allShapes, layer.name);
              if (imageFile) {
                logger.debug(`[extractImageFromLayer] Successfully converted all shapes to image`);
                return imageFile;
              }
            }
          } catch (conversionError) {
            logger.warn(`[extractImageFromLayer] Failed to convert all shapes to image:`, conversionError);
          }
        }
        
        logger.warn('[extractImageFromLayer] No image data found in layer');
        return null;
      } catch (error) {
        logger.error('Error extracting image from layer:', error);
        return null;
      }
    };
    
    // 处理图层选择
    const handleLayerSelect = async (layerId) => {
      logger.debug(`[UploadComponent] handleLayerSelect called with layerId: ${layerId}`);
      // selectedLayerId 已经在 onChange 中设置了，这里不需要再次设置
      
      logger.debug(`[UploadComponent] Extracting image from layer: ${layerId}`);
      const file = await extractImageFromLayer(layerId);
      if (file) {
        logger.debug(`[UploadComponent] Successfully extracted file from layer:`, file instanceof File ? file.name : file);
        logger.debug(`[UploadComponent] Setting value to file:`, file);
        
        if (multiple) {
          setVal(prev => {
            const files = Array.isArray(prev) ? prev : (prev ? [prev] : []);
            const newFiles = [...files, file];
            logger.debug(`[UploadComponent] Multiple files after adding:`, newFiles.length);
            return newFiles;
          });
        } else {
          logger.debug(`[UploadComponent] Setting single file value`);
          setVal(file);
        }
        
        // 确保 selectedLayerId 保持设置（即使已经设置，这里再次确认）
        setSelectedLayerId(layerId);
        logger.debug(`[UploadComponent] Value set successfully, selectedLayerId: ${layerId}`);
      } else {
        logger.error(`[UploadComponent] Failed to extract image from layer: ${layerId}`);
        // 如果提取失败，清除选中状态和文件值
        setSelectedLayerId(null);
        if (!multiple) {
          setVal(null);
        }
        errorHandler.showError('无法从图层中提取图片，请确保图层包含图片内容');
      }
    };
    
    // 处理拖拽
    const handleDragOver = (e) => {
      e.preventDefault();
      setIsDragging(true);
    };
    
    const handleDragLeave = (e) => {
      e.preventDefault();
      setIsDragging(false);
    };
    
    const handleDrop = async (e) => {
      e.preventDefault();
      setIsDragging(false);
      
      logger.debug(`[UploadComponent] Drop event, dataTransfer types:`, Array.from(e.dataTransfer.types));
      
      // 检查是否是图层拖拽（优先检查）
      // 注意：在某些浏览器中，需要在 dragstart 时设置数据，drop 时才能读取
      let layerId = e.dataTransfer.getData('application/x-layer-id');
      
      // 如果直接获取失败，尝试从 types 中检查
      if (!layerId && e.dataTransfer.types.includes('application/x-layer-id')) {
        // 尝试使用不同的方法获取
        try {
          layerId = e.dataTransfer.getData('text/plain'); // 某些浏览器可能转换为 text/plain
        } catch (err) {
          logger.debug(`[UploadComponent] 无法从 dataTransfer 获取数据:`, err);
        }
      }
      
      logger.debug(`[UploadComponent] Layer ID from dataTransfer:`, layerId);
      
      if (layerId) {
        logger.debug(`[UploadComponent] Dropped layer: ${layerId}`);
        // 先设置 selectedLayerId，确保下拉框显示正确的值
        setSelectedLayerId(layerId);
        await handleLayerSelect(layerId);
        return;
      }
      
      // 处理文件拖拽
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        logger.debug(`[UploadComponent] Dropped files:`, files.length);
        if (multiple) {
          setVal(prev => {
            const existingFiles = Array.isArray(prev) ? prev : (prev ? [prev] : []);
            return [...existingFiles, ...files];
          });
        } else {
          setVal(files[0]);
        }
      } else {
        logger.warn(`[UploadComponent] No layer ID or files found in drop event`);
        logger.debug(`[UploadComponent] dataTransfer.types:`, Array.from(e.dataTransfer.types));
        logger.debug(`[UploadComponent] dataTransfer.items:`, Array.from(e.dataTransfer.items || []));
      }
    };
    
    return (
            <div className="space-y-2">
        {/* 拖拽区域 */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
            className={clsx(
            'border-2 border-dashed rounded-lg p-4 transition-colors text-center',
            isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'
          )}
        >
          <input
            type="file"
            accept={comp.properties?.acceptedTypes || 'image/*'}
            multiple={multiple}
            className="hidden"
            id={`upload-${comp.id}`}
            onChange={(e) => setVal(multiple ? Array.from(e.target.files) : e.target.files?.[0] || null)}
          />
          <label
            htmlFor={`upload-${comp.id}`}
            className="cursor-pointer block"
          >
            <div className="flex flex-col items-center gap-2">
              <Image className="w-8 h-8 text-gray-400" />
              <span className="text-sm text-gray-600">
                {value ? (multiple && Array.isArray(value) ? `${value.length} 个文件已选择` : '文件已选择') : '点击或拖拽文件/图层到这里'}
              </span>
              <span className="text-xs text-gray-500">
                支持图片、音频与视频，或从图层面板拖拽图层
              </span>
                </div>
          </label>
          {value && (
            <div className="mt-2 text-xs text-gray-500">
              {multiple && Array.isArray(value) 
                ? `${value.length} 个文件`
                : typeof value === 'string' ? value : value.name || '已选择文件'}
            </div>
          )}
        </div>
        
        {/* 图层选择下拉 */}
        {layers.length > 0 && (
        <div>
            <label className="block text-xs text-gray-500 mb-1">或选择图层</label>
            <select
              value={selectedLayerId || ''}
              onChange={async (e) => {
                const newLayerId = e.target.value;
                logger.debug(`[UploadComponent] Dropdown onChange: ${newLayerId}`);
                
                // 立即更新 selectedLayerId，确保下拉菜单显示正确的值
                if (newLayerId) {
                  setSelectedLayerId(newLayerId);
                  // 然后异步处理图层选择
                  await handleLayerSelect(newLayerId);
                } else {
                  // 如果选择空选项，清除选中状态但不清除文件值
                  logger.debug(`[UploadComponent] Clearing selected layer`);
                  setSelectedLayerId(null);
                }
              }}
              className="w-full text-sm p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">-- 选择图层 --</option>
              {layers
                .filter(layer => {
                  // 只显示包含图片的图层
                  const shapeIds = layer.shapeIds || layer.objects?.map(obj => obj.id) || [];
                  return shapeIds.length > 0;
                })
                .map(layer => (
                  <option key={layer.id} value={layer.id}>
                    {layer.name} ({layer.objects?.length || 0})
                  </option>
                ))}
            </select>
            </div>
          )}
        </div>
    );
  };
  
  // 渲染组件输入控件（类似 AppRunner 的逻辑）
  const renderComponentControl = (comp) => {
    const binding = selectedApp?.uiBindings?.find(b => b.componentId === comp.id);
    const path = binding?.bindTo;
    const value = path ? inputValues[path] : undefined;

    const setVal = (v) => {
      if (!path) {
        logger.warn(`[renderComponentControl] No path for component ${comp.id}`);
        return;
      }
      logger.debug(`[renderComponentControl] Setting value for path=${path}, component=${comp.id}, value=`, v instanceof File ? v.name : v);
      setInputValues((prev) => {
        const newValues = { ...prev, [path]: v };
        logger.debug(`[renderComponentControl] Updated inputValues for path=${path}:`, newValues[path] instanceof File ? newValues[path].name : newValues[path]);
        return newValues;
      });
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
    
    // 滑块输入
    if (type === 'slider') {
      const min = comp.properties?.min ?? 0;
      const max = comp.properties?.max ?? 100;
      const step = comp.properties?.step ?? 1;
      const currentValue = Number(value ?? min);
      
      return (
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={currentValue}
              onChange={(e) => setVal(Number(e.target.value))}
              className="flex-1"
            />
            <input
              type="number"
              min={min}
              max={max}
              step={step}
              value={currentValue}
              onChange={(e) => setVal(Number(e.target.value))}
              className="w-20 p-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>{min}</span>
            <span>{max}</span>
          </div>
        </div>
      );
    }
    
    // 文件上传（支持拖拽图层）
    if (type === 'upload_image' || type === 'upload_single_image' || type === 'upload_multiple_images' || type === 'upload_multi_media') {
      const multiple = type === 'upload_multiple_images' || (comp.properties?.multiple === true);
      return (
        <UploadComponent
          comp={comp}
          value={value}
          setVal={setVal}
          multiple={multiple}
        />
      );
    }
    
    // 选择框
    if (type === 'select' || type === 'dropdown_text' || type === 'dropdown_number') {
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
      // 跳过空值、null、undefined 和空字符串
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        logger.debug(`[Generate] Skipping empty value for ${paramPath}`);
        continue;
      }
      
      // 处理 File 对象
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
            logger.info(`[Generate] Uploaded file for ${paramPath}: ${fileUrl}`);
          } else {
            logger.error(`[Generate] File upload returned no URL for ${paramPath}`);
            errorHandler.showError(`文件上传失败: 未返回文件URL`);
            return;
          }
        } catch (error) {
          const errorMessage = errorHandler.handleError(error, `文件上传(${paramPath})`);
          logger.error(`文件上传失败 (${paramPath}):`, error);
          errorHandler.showError(errorMessage, error);
          return;
        }
      }
      // 如果是 URL 字符串（HTTP/HTTPS 或 data URL），直接保留，让后端处理
      // 后端现在可以处理外部 URL 和数据 URL
      else if (typeof value === 'string' && (
        value.startsWith('http://') || 
        value.startsWith('https://') || 
        value.startsWith('data:') ||
        value.startsWith('/uploads/')
      )) {
        // 保留 URL 字符串，后端会处理
        logger.debug(`[Generate] Keeping URL string for ${paramPath}: ${value}`);
        processedInputValues[paramPath] = value;
      } else {
        // 其他类型的值，保留原值
        logger.debug(`[Generate] Keeping original value for ${paramPath}:`, value);
        processedInputValues[paramPath] = value;
      }
    }
    
    // 构建 uiInputs（componentId -> value 的映射）
    const uiInputs = {};
    if (selectedApp.components && selectedApp.uiBindings) {
      selectedApp.components.forEach(comp => {
        const binding = selectedApp.uiBindings.find(b => b.componentId === comp.id);
        if (binding && binding.bindTo && processedInputValues[binding.bindTo] !== undefined) {
          const value = processedInputValues[binding.bindTo];
          // 只添加非空值
          if (value !== null && value !== undefined && value !== '' && 
              !(typeof value === 'string' && value.trim() === '')) {
            uiInputs[comp.id] = value;
            logger.debug(`[Generate] Added uiInput for ${comp.id}:`, value instanceof File ? value.name : value);
          } else {
            logger.debug(`[Generate] Skipping empty uiInput for ${comp.id}`);
          }
        }
      });
    }
    
    logger.debug(`[Generate] Final uiInputs:`, uiInputs);
    
    // 检查是否有任何输入
    if (Object.keys(uiInputs).length === 0) {
      errorHandler.showWarning('请至少填写一个输入项');
      return;
    }
    
    // 调用生成函数（不再传入前端可配置的超时时间，由平台/后端决定）
    if (onGenerate) {
      onGenerate(selectedAppId, uiInputs);
    }
  };
  
  const components = selectedApp?.components || [];
  const uiBindings = selectedApp?.uiBindings || [];
  
  return (
    <div className={clsx(
      "h-full border-r bg-white flex flex-col transition-all duration-300",
      isCollapsed ? "w-12" : "w-80"
    )}>
      <div className="p-4 border-b flex items-center justify-between">
        {!isCollapsed && (
          <h2 className="text-lg font-semibold text-gray-900">生成器</h2>
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
            <ChevronRight className="w-5 h-5 text-gray-600" />
          ) : (
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          )}
          </button>
        </div>
        
      {!isCollapsed && (
      
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
        
        {/* 轮询超时配置已移除（用户体验原因） */}
        
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
      )}
    </div>
  );
};

export default GeneratorPanel;

