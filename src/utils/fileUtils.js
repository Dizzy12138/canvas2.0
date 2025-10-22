// 支持的图像格式
export const SUPPORTED_IMAGE_FORMATS = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/svg+xml'
];

// 支持的导出格式
export const EXPORT_FORMATS = [
  { value: 'png', label: 'PNG', mimeType: 'image/png' },
  { value: 'jpeg', label: 'JPEG', mimeType: 'image/jpeg' },
  { value: 'webp', label: 'WebP', mimeType: 'image/webp' },
  { value: 'svg', label: 'SVG', mimeType: 'image/svg+xml' },
  { value: 'pdf', label: 'PDF', mimeType: 'application/pdf' }
];

// 最大文件大小 (10MB)
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * 验证文件格式和大小
 */
export function validateFile(file) {
  const errors = [];

  if (!file) {
    errors.push('请选择文件');
    return { isValid: false, errors };
  }

  // 检查文件大小
  if (file.size > MAX_FILE_SIZE) {
    errors.push(`文件大小不能超过 ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
  }

  // 检查文件格式
  if (!SUPPORTED_IMAGE_FORMATS.includes(file.type)) {
    errors.push('不支持的文件格式');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * 读取文件为 Data URL
 */
export function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * 读取文件为 ArrayBuffer
 */
export function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

/**
 * 创建图像元素
 */
export function createImageElement(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * 压缩图像
 */
export function compressImage(file, maxWidth = 1920, maxHeight = 1080, quality = 0.8) {
  return new Promise((resolve, reject) => {
    readFileAsDataURL(file)
      .then(dataURL => createImageElement(dataURL))
      .then(img => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // 计算新尺寸
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // 绘制并压缩
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(resolve, file.type, quality);
      })
      .catch(error => reject(error));
  });
}

/**
 * 导出画布为文件
 */
export function exportCanvas(canvas, format = 'png', quality = 1.0, filename = 'canvas') {
  return new Promise((resolve, reject) => {
    try {
      const formatInfo = EXPORT_FORMATS.find(f => f.value === format);
      if (!formatInfo) {
        reject(new Error('不支持的导出格式'));
        return;
      }

      const mimeType = formatInfo.mimeType;
      
      if (format === 'svg') {
        // SVG 导出需要特殊处理
        exportCanvasAsSVG(canvas, filename).then(resolve).catch(reject);
        return;
      }

      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('导出失败'));
          return;
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `${filename}.${format}`;
        link.href = url;
        link.click();
        
        // 清理资源
        setTimeout(() => URL.revokeObjectURL(url), 100);
        
        resolve({
          blob,
          filename: `${filename}.${format}`,
          size: blob.size
        });
      }, mimeType, quality);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * 导出画布为 SVG
 */
function exportCanvasAsSVG(canvas, filename) {
  return new Promise((resolve, reject) => {
    try {
      // 获取画布数据
      const dataURL = canvas.toDataURL('image/png');
      
      // 创建 SVG 内容
      const svgContent = `
        <svg xmlns="http://www.w3.org/2000/svg" 
             xmlns:xlink="http://www.w3.org/1999/xlink"
             width="${canvas.width}" 
             height="${canvas.height}">
          <image width="${canvas.width}" 
                 height="${canvas.height}" 
                 xlink:href="${dataURL}"/>
        </svg>
      `;
      
      const blob = new Blob([svgContent], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `${filename}.svg`;
      link.href = url;
      link.click();
      
      setTimeout(() => URL.revokeObjectURL(url), 100);
      
      resolve({
        blob,
        filename: `${filename}.svg`,
        size: blob.size
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * 生成缩略图
 */
export function generateThumbnail(file, maxSize = 200) {
  return new Promise((resolve, reject) => {
    readFileAsDataURL(file)
      .then(dataURL => createImageElement(dataURL))
      .then(img => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // 计算缩略图尺寸
        const ratio = Math.min(maxSize / img.width, maxSize / img.height);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob(resolve, 'image/jpeg', 0.7);
      })
      .catch(error => reject(error));
  });
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 获取文件扩展名
 */
export function getFileExtension(filename) {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
}

/**
 * 批量处理文件
 */
export async function processFiles(files, processor) {
  const results = [];
  
  for (const file of files) {
    try {
      const result = await processor(file);
      results.push({ success: true, file, result });
    } catch (error) {
      results.push({ success: false, file, error });
    }
  }
  
  return results;
}