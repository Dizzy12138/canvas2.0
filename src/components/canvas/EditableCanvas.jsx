// React核心
import React, { useRef, useEffect } from 'react';

// 第三方库
import { useEditor, useValue } from 'tldraw';

// 工具
import logger from '../../utils/logger.js';
import { API_ENDPOINTS, DELAYS, IMAGE_SPACING } from '../../utils/constants.js';

/**
 * EditableCanvas组件 - 可编辑的画布组件，暴露编辑器实例
 * 
 * @param {string} activeTool - 当前激活的工具
 * @param {Function} onToolChange - 工具变化回调
 * @param {Function} onObjectAdded - 对象添加回调
 * @param {Function} onObjectModified - 对象修改回调
 * @param {Function} onObjectDeleted - 对象删除回调
 * @param {Array} layers - 图层列表
 * @param {Function} toggleLayerVisibility - 切换图层可见性
 * @param {Function} onEditorReady - 编辑器准备就绪回调
 * @param {Array} generatedImages - 生成的图片列表
 */
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
  // 用于跟踪已手动处理的 shape ID，避免 store 监听器重复处理
  const manuallyProcessedShapesRef = useRef(new Set());
  
  // 添加生成的图片到画布
  useEffect(() => {
    if (!editor || !generatedImages || generatedImages.length === 0) {
      return;
    }
    
    // 如果正在处理，跳过
    if (isProcessingRef.current) {
      logger.debug('[画布] 正在处理中，跳过本次执行');
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
            logger.debug(`[画布] 图片已处理，跳过: ${imageKey}`);
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
            imageUrl = `${baseUrl}${API_ENDPOINTS.COMFY_VIEW}?filename=${encodeURIComponent(imageData.filename)}&subfolder=${encodeURIComponent(subfolder)}&type=${encodeURIComponent(type)}`;
          } else if (imageData.url) {
            imageUrl = imageData.url;
          }
          
          if (!imageUrl) {
            logger.warn(`[画布] 图片URL为空，跳过:`, imageData);
            continue;
          }
          
          // 计算图片位置
          const offsetX = (index % 3) * IMAGE_SPACING; // 每行3个，间隔IMAGE_SPACING
          const offsetY = Math.floor(index / 3) * IMAGE_SPACING; // 每列间隔IMAGE_SPACING
          const targetX = centerX - 200 + offsetX;
          const targetY = centerY - 200 + offsetY;
          
          // 先通过fetch获取图片，转换为File对象
          logger.info(`[画布] 开始添加图片 ${index + 1}: ${imageUrl}`);
          
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
            await new Promise(resolve => setTimeout(resolve, DELAYS.SHAPE_CREATION));
            
            // 获取新添加的shape
            const shapesAfter = editor.getCurrentPageShapes();
            const newShapes = shapesAfter.filter(s => !shapeIdsBefore.has(s.id));
            
            logger.info(`[画布] 成功添加图片 ${index + 1} 到画布位置 (${targetX}, ${targetY})，创建了 ${newShapes.length} 个shape`);
            
            // 将新添加的shape同步到图层系统
            if (newShapes.length > 0 && onObjectAdded) {
              newShapes.forEach(shape => {
                // 标记为已手动处理，避免 store 监听器重复处理
                manuallyProcessedShapesRef.current.add(shape.id);
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
            logger.error(`[画布] 获取或添加图片失败:`, fetchError);
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
              
              logger.info(`[画布] 使用备选方案添加图片: ${imageId}`);
              
              // 同步到图层系统
              if (onObjectAdded) {
                const shape = editor.getShape(imageId);
                if (shape) {
                  // 标记为已手动处理，避免 store 监听器重复处理
                  manuallyProcessedShapesRef.current.add(shape.id);
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
              logger.error(`[画布] 备选方案也失败:`, shapeError);
            }
          }
        } catch (error) {
          logger.error(`[画布] 添加图片到画布失败 (图片 ${index}):`, error);
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
            logger.warn(`[画布] 同步图层状态失败 (shapeId: ${shapeId}):`, error);
          }
        });
    });
  }, [editor, layers]);
  
  // 监听形状创建和删除事件，以及z-index变化
  useEffect(() => {
    if (!editor) return;
    
    // 用于跟踪shape的z-index，检测变化
    const shapeZIndexMap = new Map();
    
    const updateShapeZIndex = () => {
      const allShapes = editor.getCurrentPageShapes();
      allShapes.forEach((shape, index) => {
        const oldIndex = shapeZIndexMap.get(shape.id);
        if (oldIndex !== undefined && oldIndex !== index) {
          // z-index发生了变化，触发排序同步
          logger.debug(`[画布排序] Shape ${shape.id} z-index 从 ${oldIndex} 变为 ${index}`);
          // 通过onObjectModified通知父组件，由父组件处理排序同步
          onObjectModified?.([shape]);
        }
        shapeZIndexMap.set(shape.id, index);
      });
    };
    
    const unsubscribe = editor.store.listen((changes) => {
      // 检查是否有新添加的形状
      if (changes.changes.added) {
      Object.values(changes.changes.added).forEach((record) => {
        if (record.typeName === 'shape') {
          // 检查是否已经手动处理过（避免重复创建图层）
          if (manuallyProcessedShapesRef.current.has(record.id)) {
            logger.debug(`[画布] Shape ${record.id} 已手动处理，跳过 store 监听器`);
            // 从已处理列表中移除，避免内存泄漏
            manuallyProcessedShapesRef.current.delete(record.id);
            return;
          }
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
              logger.info('[画布] Shape deleted:', shapeId);
              shapeZIndexMap.delete(shapeId);
              // 触发对象删除回调
              onObjectDeleted?.(shapeId);
            }
          }
        });
      }
      
      // 检查是否有更新的形状（包括z-index变化）
      if (changes.changes.updated) {
        Object.values(changes.changes.updated).forEach((record) => {
          if (record.typeName === 'shape') {
            // 延迟更新z-index映射，确保顺序已更新
            setTimeout(() => {
              updateShapeZIndex();
            }, 0);
          }
        });
      }
    });
    
    // 初始更新z-index映射
    updateShapeZIndex();
    
    return () => unsubscribe();
  }, [editor, onObjectAdded, onObjectDeleted, onObjectModified]);
  
  return null;
};

export default EditableCanvas;

