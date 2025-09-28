import React, { useState, useCallback } from 'react';
import { Download, Settings, Image, FileText } from 'lucide-react';
import clsx from 'clsx';
import { exportCanvas, EXPORT_FORMATS, formatFileSize } from '../utils/fileUtils';

const ExportDialog = ({ 
  canvasRef, 
  isOpen, 
  onClose, 
  onExport,
  className 
}) => {
  const [exportSettings, setExportSettings] = useState({
    format: 'png',
    quality: 1.0,
    width: null,
    height: null,
    filename: 'canvas-export',
    transparent: true,
    includeBackground: true
  });
  const [isExporting, setIsExporting] = useState(false);

  // 获取画布当前尺寸
  const getCanvasSize = useCallback(() => {
    if (!canvasRef?.current) return { width: 800, height: 600 };
    return {
      width: canvasRef.current.width,
      height: canvasRef.current.height
    };
  }, [canvasRef]);

  // 更新导出设置
  const updateSetting = useCallback((key, value) => {
    setExportSettings(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  // 执行导出
  const handleExport = useCallback(async () => {
    if (!canvasRef?.current) {
      alert('画布不可用');
      return;
    }

    setIsExporting(true);
    
    try {
      const canvas = canvasRef.current;
      const { format, quality, filename } = exportSettings;
      
      // 如果需要自定义尺寸，创建新画布
      let exportCanvas = canvas;
      if (exportSettings.width || exportSettings.height) {
        const originalSize = getCanvasSize();
        const targetWidth = exportSettings.width || originalSize.width;
        const targetHeight = exportSettings.height || originalSize.height;
        
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = targetWidth;
        tempCanvas.height = targetHeight;
        
        // 缩放绘制原画布内容
        tempCtx.drawImage(canvas, 0, 0, targetWidth, targetHeight);
        exportCanvas = tempCanvas;
      }
      
      const result = await exportCanvas(exportCanvas, format, quality, filename);
      
      onExport?.(result);
      onClose?.();
      
      // 显示成功消息
      alert(`导出成功！文件大小: ${formatFileSize(result.size)}`);
      
    } catch (error) {
      console.error('导出失败:', error);
      alert(`导出失败: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  }, [canvasRef, exportSettings, getCanvasSize, onExport, onClose]);

  if (!isOpen) return null;

  const currentSize = getCanvasSize();
  const selectedFormat = EXPORT_FORMATS.find(f => f.value === exportSettings.format);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={clsx('bg-white rounded-lg p-6 max-w-md w-full mx-4', className)}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">导出画布</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          {/* 文件名 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              文件名
            </label>
            <input
              type="text"
              value={exportSettings.filename}
              onChange={(e) => updateSetting('filename', e.target.value)}
              className="input w-full"
              placeholder="canvas-export"
            />
          </div>

          {/* 导出格式 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              导出格式
            </label>
            <div className="grid grid-cols-2 gap-2">
              {EXPORT_FORMATS.map((format) => (
                <button
                  key={format.value}
                  onClick={() => updateSetting('format', format.value)}
                  className={clsx(
                    'p-3 text-left border rounded-lg transition-colors',
                    {
                      'bg-primary-50 border-primary-500 text-primary-700': 
                        exportSettings.format === format.value,
                      'bg-white border-gray-300 hover:bg-gray-50': 
                        exportSettings.format !== format.value,
                    }
                  )}
                >
                  <div className="flex items-center space-x-2">
                    {format.value === 'pdf' ? (
                      <FileText size={16} />
                    ) : (
                      <Image size={16} />
                    )}
                    <div>
                      <div className="font-medium">{format.label}</div>
                      <div className="text-xs text-gray-500">
                        {format.value === 'png' && '无损压缩，支持透明'}
                        {format.value === 'jpeg' && '有损压缩，文件较小'}
                        {format.value === 'webp' && '现代格式，压缩率高'}
                        {format.value === 'svg' && '矢量格式，可缩放'}
                        {format.value === 'pdf' && '文档格式，可打印'}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 图像质量 */}
          {['jpeg', 'webp'].includes(exportSettings.format) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                图像质量: {Math.round(exportSettings.quality * 100)}%
              </label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={exportSettings.quality}
                onChange={(e) => updateSetting('quality', Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>低质量</span>
                <span>高质量</span>
              </div>
            </div>
          )}

          {/* 自定义尺寸 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              导出尺寸
            </label>
            <div className="space-y-2">
              <div className="text-xs text-gray-500">
                当前画布: {currentSize.width} × {currentSize.height}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500">宽度</label>
                  <input
                    type="number"
                    value={exportSettings.width || currentSize.width}
                    onChange={(e) => updateSetting('width', e.target.value ? Number(e.target.value) : null)}
                    className="input w-full text-sm"
                    placeholder={currentSize.width.toString()}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">高度</label>
                  <input
                    type="number"
                    value={exportSettings.height || currentSize.height}
                    onChange={(e) => updateSetting('height', e.target.value ? Number(e.target.value) : null)}
                    className="input w-full text-sm"
                    placeholder={currentSize.height.toString()}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 其他选项 */}
          {exportSettings.format === 'png' && (
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={exportSettings.transparent}
                  onChange={(e) => updateSetting('transparent', e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">透明背景</span>
              </label>
            </div>
          )}

          <div className="space-y-2">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={exportSettings.includeBackground}
                onChange={(e) => updateSetting('includeBackground', e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-gray-700">包含背景图层</span>
            </label>
          </div>

          {/* 预览信息 */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-600 space-y-1">
              <div>格式: {selectedFormat?.label}</div>
              <div>
                尺寸: {exportSettings.width || currentSize.width} × {exportSettings.height || currentSize.height}
              </div>
              {exportSettings.quality < 1 && (
                <div>质量: {Math.round(exportSettings.quality * 100)}%</div>
              )}
            </div>
          </div>
        </div>

        {/* 按钮 */}
        <div className="flex space-x-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 btn btn-secondary"
          >
            取消
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex-1 btn btn-primary"
          >
            {isExporting ? (
              <>导出中...</>
            ) : (
              <>
                <Download size={16} className="mr-1" />
                导出
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportDialog;