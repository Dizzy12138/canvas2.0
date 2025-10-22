/**
 * 蒙版工具函数
 * 提供蒙版创建、应用和处理功能
 */

/**
 * 创建矩形蒙版
 * @param {Object} bounds - 蒙版边界 {x, y, width, height}
 * @param {number} width - 画布宽度
 * @param {number} height - 画布高度
 * @returns {ImageData} 蒙版图像数据
 */
export function createRectangleMask(bounds, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  // 创建黑色背景（完全透明）
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, width, height);
  
  // 创建白色矩形区域（完全不透明）
  ctx.fillStyle = 'white';
  ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
  
  return ctx.getImageData(0, 0, width, height);
}

/**
 * 创建圆形蒙版
 * @param {Object} bounds - 蒙版边界 {x, y, width, height}
 * @param {number} width - 画布宽度
 * @param {number} height - 画布高度
 * @returns {ImageData} 蒙版图像数据
 */
export function createCircleMask(bounds, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  // 创建黑色背景（完全透明）
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, width, height);
  
  // 创建白色圆形区域（完全不透明）
  ctx.fillStyle = 'white';
  const radius = Math.min(bounds.width, bounds.height) / 2;
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
  ctx.fill();
  
  return ctx.getImageData(0, 0, width, height);
}

/**
 * 创建渐变蒙版
 * @param {Object} bounds - 蒙版边界 {x, y, width, height}
 * @param {string} gradientType - 渐变类型 'linear' 或 'radial'
 * @param {Array} stops - 渐变停止点数组 [{position, color}]
 * @param {number} width - 画布宽度
 * @param {number} height - 画布高度
 * @returns {ImageData} 蒙版图像数据
 */
export function createGradientMask(bounds, gradientType, stops, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  let gradient;
  if (gradientType === 'linear') {
    gradient = ctx.createLinearGradient(bounds.x, bounds.y, bounds.x + bounds.width, bounds.y + bounds.height);
  } else {
    const radius = Math.min(bounds.width, bounds.height) / 2;
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;
    gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
  }
  
  // 添加渐变停止点
  stops.forEach(stop => {
    gradient.addColorStop(stop.position, stop.color);
  });
  
  ctx.fillStyle = gradient;
  ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
  
  return ctx.getImageData(0, 0, width, height);
}

/**
 * 应用蒙版到图像数据
 * @param {ImageData} imageData - 原始图像数据
 * @param {ImageData} maskData - 蒙版数据
 * @param {boolean} invert - 是否反相蒙版
 * @param {number} density - 蒙版密度 (0-1)
 * @param {number} feather - 羽化半径
 * @returns {ImageData} 应用蒙版后的图像数据
 */
export function applyMaskToImageData(imageData, maskData, invert = false, density = 1, feather = 0) {
  const data = imageData.data;
  const mask = maskData.data;
  const width = imageData.width;
  const height = imageData.height;
  
  // 创建新的图像数据
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const newImageData = ctx.createImageData(width, height);
  const newData = newImageData.data;
  
  // 应用蒙版
  for (let i = 0; i < data.length; i += 4) {
    // 获取蒙版值（使用红色通道）
    let maskValue = mask[i];
    
    // 反相处理
    if (invert) {
      maskValue = 255 - maskValue;
    }
    
    // 密度调整
    maskValue = Math.round(maskValue * density);
    
    // 羽化处理（简化版本）
    if (feather > 0) {
      const x = (i / 4) % width;
      const y = Math.floor((i / 4) / width);
      
      // 检查是否在蒙版边缘
      let isEdge = false;
      for (let dx = -feather; dx <= feather; dx++) {
        for (let dy = -feather; dy <= feather; dy++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const nIndex = (ny * width + nx) * 4;
            const neighborMaskValue = mask[nIndex];
            if (Math.abs(neighborMaskValue - maskValue) > 50) {
              isEdge = true;
              break;
            }
          }
        }
        if (isEdge) break;
      }
      
      // 在边缘应用羽化
      if (isEdge) {
        maskValue = Math.max(0, maskValue - (Math.random() * 255 * (feather / 10)));
      }
    }
    
    // 应用蒙版到Alpha通道
    newData[i] = data[i];     // R
    newData[i + 1] = data[i + 1]; // G
    newData[i + 2] = data[i + 2]; // B
    newData[i + 3] = Math.round((data[i + 3] * maskValue) / 255); // A
  }
  
  return newImageData;
}

/**
 * 创建蒙版预览Canvas
 * @param {ImageData} maskData - 蒙版数据
 * @param {number} width - 显示宽度
 * @param {number} height - 显示高度
 * @returns {HTMLCanvasElement} 蒙版预览Canvas
 */
export function createMaskPreview(maskData, width = 200, height = 150) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  // 创建临时Canvas来缩放蒙版数据
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = maskData.width;
  tempCanvas.height = maskData.height;
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.putImageData(maskData, 0, 0);
  
  // 绘制缩放后的蒙版
  ctx.drawImage(tempCanvas, 0, 0, width, height);
  
  return canvas;
}

export default {
  createRectangleMask,
  createCircleMask,
  createGradientMask,
  applyMaskToImageData,
  createMaskPreview
};