import { useState, useCallback } from 'react';
import { 
  validateFile, 
  readFileAsDataURL, 
  createImageElement,
  compressImage,
  exportCanvas 
} from '../utils/fileUtils';

export function useFileHandling({ canvasRef, addObject, onProjectLoad }) {
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);

  // 导入图像到画布
  const importImage = useCallback(async (file, options = {}) => {
    setIsImporting(true);
    
    try {
      // 验证文件
      const validation = validateFile(file);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      // 读取文件
      const dataURL = await readFileAsDataURL(file);
      const img = await createImageElement(dataURL);

      // 计算放置位置
      const canvasSize = canvasRef?.current ? {
        width: canvasRef.current.width,
        height: canvasRef.current.height
      } : { width: 800, height: 600 };

      const scale = Math.min(
        canvasSize.width / img.width,
        canvasSize.height / img.height,
        1 // 最大不超过原始尺寸
      );

      const scaledWidth = img.width * scale;
      const scaledHeight = img.height * scale;

      // 居中放置
      const x = (canvasSize.width - scaledWidth) / 2;
      const y = (canvasSize.height - scaledHeight) / 2;

      // 创建图像对象
      const imageObject = {
        id: `img-${Date.now()}`,
        type: 'image',
        points: [
          { x, y },
          { x: x + scaledWidth, y: y + scaledHeight }
        ],
        image: {
          src: dataURL,
          width: img.width,
          height: img.height,
          scaledWidth,
          scaledHeight
        },
        style: {
          opacity: options.opacity || 1
        },
        timestamp: Date.now()
      };

      addObject(imageObject);
      
      return {
        success: true,
        object: imageObject,
        originalSize: { width: img.width, height: img.height },
        placedSize: { width: scaledWidth, height: scaledHeight }
      };

    } catch (error) {
      console.error('图像导入失败:', error);
      return {
        success: false,
        error: error.message
      };
    } finally {
      setIsImporting(false);
    }
  }, [canvasRef, addObject]);

  // 批量导入图像
  const importMultipleImages = useCallback(async (files, options = {}) => {
    setIsImporting(true);
    const results = [];

    try {
      for (const file of files) {
        const result = await importImage(file, options);
        results.push({ file, ...result });
        
        // 添加延迟避免阻塞
        if (files.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    } finally {
      setIsImporting(false);
    }

    return results;
  }, [importImage]);

  // 导出画布
  const exportCanvasToFile = useCallback(async (format = 'png', options = {}) => {
    if (!canvasRef?.current) {
      throw new Error('画布不可用');
    }

    setIsExporting(true);

    try {
      const canvas = canvasRef.current;
      const {
        quality = 1.0,
        filename = 'canvas-export',
        width,
        height
      } = options;

      // 如果指定了自定义尺寸，创建临时画布
      let exportCanvas = canvas;
      if (width || height) {
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        
        tempCanvas.width = width || canvas.width;
        tempCanvas.height = height || canvas.height;
        
        // 填充背景色（如果不是透明格式）
        if (format !== 'png' || !options.transparent) {
          tempCtx.fillStyle = options.backgroundColor || '#ffffff';
          tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        }
        
        // 缩放绘制原画布
        tempCtx.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height);
        exportCanvas = tempCanvas;
      }

      const result = await exportCanvas(exportCanvas, format, quality, filename);
      
      return {
        success: true,
        ...result
      };

    } catch (error) {
      console.error('导出失败:', error);
      return {
        success: false,
        error: error.message
      };
    } finally {
      setIsExporting(false);
    }
  }, [canvasRef]);

  // 保存项目为JSON
  const saveProject = useCallback((projectData, filename = 'project') => {
    try {
      const dataStr = JSON.stringify(projectData, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.download = `${filename}.json`;
      link.href = url;
      link.click();
      
      setTimeout(() => URL.revokeObjectURL(url), 100);
      
      return { success: true, filename: `${filename}.json` };
      
    } catch (error) {
      console.error('项目保存失败:', error);
      return { success: false, error: error.message };
    }
  }, []);

  // 加载项目文件
  const loadProject = useCallback(async (file) => {
    try {
      const validation = validateFile(file);
      if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
        throw new Error('只支持JSON格式的项目文件');
      }

      const text = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(file);
      });

      const projectData = JSON.parse(text);
      
      // 验证项目数据结构
      if (!projectData.layers || !Array.isArray(projectData.layers)) {
        throw new Error('无效的项目文件格式');
      }

      onProjectLoad?.(projectData);
      
      return { success: true, data: projectData };
      
    } catch (error) {
      console.error('项目加载失败:', error);
      return { success: false, error: error.message };
    }
  }, [onProjectLoad]);

  // 压缩并优化图像
  const optimizeImage = useCallback(async (file, options = {}) => {
    try {
      const {
        maxWidth = 1920,
        maxHeight = 1080,
        quality = 0.8
      } = options;

      const optimizedBlob = await compressImage(file, maxWidth, maxHeight, quality);
      
      return {
        success: true,
        originalSize: file.size,
        optimizedSize: optimizedBlob.size,
        compressionRatio: ((file.size - optimizedBlob.size) / file.size * 100).toFixed(1),
        blob: optimizedBlob
      };
      
    } catch (error) {
      console.error('图像优化失败:', error);
      return { success: false, error: error.message };
    }
  }, []);

  // 显示导出对话框
  const showExport = useCallback(() => {
    setShowExportDialog(true);
  }, []);

  // 隐藏导出对话框
  const hideExport = useCallback(() => {
    setShowExportDialog(false);
  }, []);

  return {
    // 状态
    isImporting,
    isExporting,
    showExportDialog,
    
    // 导入功能
    importImage,
    importMultipleImages,
    
    // 导出功能
    exportCanvasToFile,
    showExport,
    hideExport,
    
    // 项目管理
    saveProject,
    loadProject,
    
    // 图像优化
    optimizeImage
  };
}