import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, FileImage, AlertCircle, CheckCircle } from 'lucide-react';
import clsx from 'clsx';
import { 
  validateFile, 
  readFileAsDataURL, 
  compressImage, 
  generateThumbnail,
  formatFileSize,
  SUPPORTED_IMAGE_FORMATS 
} from '../utils/fileUtils';

const FileUpload = ({
  onFileSelect,
  onFileUpload,
  multiple = false,
  accept = SUPPORTED_IMAGE_FORMATS.join(','),
  maxFiles = 10,
  className
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  // 处理文件选择
  const handleFiles = useCallback(async (fileList) => {
    const newFiles = Array.from(fileList);
    
    if (!multiple && newFiles.length > 1) {
      alert('只能选择一个文件');
      return;
    }
    
    if (files.length + newFiles.length > maxFiles) {
      alert(`最多只能选择 ${maxFiles} 个文件`);
      return;
    }

    const processedFiles = [];
    
    for (const file of newFiles) {
      const validation = validateFile(file);
      if (!validation.isValid) {
        alert(`文件 ${file.name} 验证失败: ${validation.errors.join(', ')}`);
        continue;
      }

      try {
        // 生成预览
        const preview = await readFileAsDataURL(file);
        
        // 生成缩略图
        const thumbnail = await generateThumbnail(file);
        const thumbnailURL = URL.createObjectURL(thumbnail);
        
        const fileData = {
          id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          preview,
          thumbnail: thumbnailURL,
          status: 'ready', // ready, uploading, success, error
          progress: 0,
          error: null
        };
        
        processedFiles.push(fileData);
        onFileSelect?.(fileData);
      } catch (error) {
        console.error('文件处理失败:', error);
        alert(`文件 ${file.name} 处理失败`);
      }
    }
    
    setFiles(prev => [...prev, ...processedFiles]);
  }, [files.length, maxFiles, multiple, onFileSelect]);

  // 拖拽事件处理
  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  // 文件输入变化
  const handleInputChange = useCallback((e) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  }, [handleFiles]);

  // 移除文件
  const removeFile = useCallback((fileId) => {
    setFiles(prev => {
      const newFiles = prev.filter(f => f.id !== fileId);
      // 清理 URL
      const removedFile = prev.find(f => f.id === fileId);
      if (removedFile?.thumbnail) {
        URL.revokeObjectURL(removedFile.thumbnail);
      }
      return newFiles;
    });
  }, []);

  // 上传文件
  const uploadFiles = useCallback(async () => {
    if (!onFileUpload || files.length === 0) return;
    
    setUploading(true);
    
    for (const fileData of files) {
      if (fileData.status !== 'ready') continue;
      
      try {
        // 更新状态为上传中
        setFiles(prev => prev.map(f => 
          f.id === fileData.id 
            ? { ...f, status: 'uploading', progress: 0 }
            : f
        ));
        
        // 模拟上传进度
        const progressInterval = setInterval(() => {
          setFiles(prev => prev.map(f => 
            f.id === fileData.id && f.status === 'uploading'
              ? { ...f, progress: Math.min(f.progress + 10, 90) }
              : f
          ));
        }, 200);
        
        // 执行上传
        await onFileUpload(fileData);
        
        clearInterval(progressInterval);
        
        // 更新状态为成功
        setFiles(prev => prev.map(f => 
          f.id === fileData.id 
            ? { ...f, status: 'success', progress: 100 }
            : f
        ));
        
      } catch (error) {
        // 更新状态为失败
        setFiles(prev => prev.map(f => 
          f.id === fileData.id 
            ? { ...f, status: 'error', error: error.message }
            : f
        ));
      }
    }
    
    setUploading(false);
  }, [files, onFileUpload]);

  // 清空所有文件
  const clearFiles = useCallback(() => {
    files.forEach(file => {
      if (file.thumbnail) {
        URL.revokeObjectURL(file.thumbnail);
      }
    });
    setFiles([]);
  }, [files]);

  return (
    <div className={clsx('space-y-4', className)}>
      {/* 拖拽上传区域 */}
      <div
        className={clsx(
          'relative border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer',
          {
            'border-primary-400 bg-primary-50': dragActive,
            'border-gray-300 hover:border-gray-400': !dragActive,
          }
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={accept}
          multiple={multiple}
          onChange={handleInputChange}
        />
        
        <Upload size={48} className="mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          上传图像文件
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          拖拽文件到此处或点击选择文件
        </p>
        <p className="text-xs text-gray-400">
          支持 PNG, JPG, WebP 等格式，单个文件不超过 10MB
        </p>
      </div>

      {/* 文件列表 */}
      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-900">
              已选择文件 ({files.length})
            </h4>
            <div className="space-x-2">
              {onFileUpload && (
                <button
                  onClick={uploadFiles}
                  disabled={uploading || files.every(f => f.status !== 'ready')}
                  className="btn btn-primary text-xs"
                >
                  {uploading ? '上传中...' : '开始上传'}
                </button>
              )}
              <button
                onClick={clearFiles}
                className="btn btn-secondary text-xs"
              >
                清空
              </button>
            </div>
          </div>
          
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {files.map((fileData) => (
              <div
                key={fileData.id}
                className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
              >
                {/* 缩略图 */}
                <div className="w-12 h-12 flex-shrink-0">
                  {fileData.thumbnail ? (
                    <img
                      src={fileData.thumbnail}
                      alt={fileData.name}
                      className="w-full h-full object-cover rounded"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 rounded flex items-center justify-center">
                      <FileImage size={16} className="text-gray-400" />
                    </div>
                  )}
                </div>
                
                {/* 文件信息 */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {fileData.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(fileData.size)}
                  </p>
                  
                  {/* 进度条 */}
                  {fileData.status === 'uploading' && (
                    <div className="mt-1">
                      <div className="w-full bg-gray-200 rounded-full h-1">
                        <div
                          className="bg-primary-500 h-1 rounded-full transition-all duration-300"
                          style={{ width: `${fileData.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* 错误信息 */}
                  {fileData.error && (
                    <p className="text-xs text-red-500 mt-1">
                      {fileData.error}
                    </p>
                  )}
                </div>
                
                {/* 状态图标 */}
                <div className="flex-shrink-0">
                  {fileData.status === 'success' && (
                    <CheckCircle size={16} className="text-green-500" />
                  )}
                  {fileData.status === 'error' && (
                    <AlertCircle size={16} className="text-red-500" />
                  )}
                </div>
                
                {/* 删除按钮 */}
                <button
                  onClick={() => removeFile(fileData.id)}
                  className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;