/**
 * 图层效果处理器
 * 提供图层效果的计算和应用功能
 */

/**
 * 应用模糊效果
 * @param {ImageData} imageData - 图像数据
 * @param {number} radius - 模糊半径
 * @returns {ImageData} 处理后的图像数据
 */
export function applyBlurEffect(imageData, radius) {
  if (radius <= 0) return imageData;
  
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;
  
  // 创建新的图像数据
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const newImageData = ctx.createImageData(width, height);
  const newData = newImageData.data;
  
  // 简化的盒式模糊算法
  const kernelSize = Math.floor(radius) * 2 + 1;
  const halfKernel = Math.floor(kernelSize / 2);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      let count = 0;
      
      for (let ky = -halfKernel; ky <= halfKernel; ky++) {
        for (let kx = -halfKernel; kx <= halfKernel; kx++) {
          const nx = x + kx;
          const ny = y + ky;
          
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const index = (ny * width + nx) * 4;
            r += data[index];
            g += data[index + 1];
            b += data[index + 2];
            a += data[index + 3];
            count++;
          }
        }
      }
      
      const index = (y * width + x) * 4;
      newData[index] = Math.round(r / count);
      newData[index + 1] = Math.round(g / count);
      newData[index + 2] = Math.round(b / count);
      newData[index + 3] = Math.round(a / count);
    }
  }
  
  return newImageData;
}

/**
 * 应用亮度效果
 * @param {ImageData} imageData - 图像数据
 * @param {number} value - 亮度值 (-100 到 100)
 * @returns {ImageData} 处理后的图像数据
 */
export function applyBrightnessEffect(imageData, value) {
  if (value === 0) return imageData;
  
  const data = imageData.data;
  const adjustment = Math.round(255 * (value / 100));
  
  // 创建新的图像数据
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d');
  const newImageData = ctx.createImageData(imageData.width, imageData.height);
  const newData = newImageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    newData[i] = Math.min(255, Math.max(0, data[i] + adjustment));     // R
    newData[i + 1] = Math.min(255, Math.max(0, data[i + 1] + adjustment)); // G
    newData[i + 2] = Math.min(255, Math.max(0, data[i + 2] + adjustment)); // B
    newData[i + 3] = data[i + 3]; // A
  }
  
  return newImageData;
}

/**
 * 应用对比度效果
 * @param {ImageData} imageData - 图像数据
 * @param {number} value - 对比度值 (-100 到 100)
 * @returns {ImageData} 处理后的图像数据
 */
export function applyContrastEffect(imageData, value) {
  if (value === 0) return imageData;
  
  const data = imageData.data;
  const factor = (259 * (value + 255)) / (255 * (259 - value));
  
  // 创建新的图像数据
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d');
  const newImageData = ctx.createImageData(imageData.width, imageData.height);
  const newData = newImageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    newData[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128));     // R
    newData[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 128)); // G
    newData[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 128)); // B
    newData[i + 3] = data[i + 3]; // A
  }
  
  return newImageData;
}

/**
 * 应用色相效果
 * @param {ImageData} imageData - 图像数据
 * @param {number} value - 色相值 (-180 到 180)
 * @returns {ImageData} 处理后的图像数据
 */
export function applyHueEffect(imageData, value) {
  if (value === 0) return imageData;
  
  const data = imageData.data;
  const rad = (value * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  
  // 创建新的图像数据
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d');
  const newImageData = ctx.createImageData(imageData.width, imageData.height);
  const newData = newImageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // 转换到HSV然后调整色相，这里简化为RGB旋转
    const newR = Math.min(255, Math.max(0, 
      (cos + (1 - cos) / 3) * r + 
      ((1 - cos) / 3 - Math.sqrt(1/3) * sin) * g + 
      ((1 - cos) / 3 + Math.sqrt(1/3) * sin) * b
    ));
    
    const newG = Math.min(255, Math.max(0, 
      ((1 - cos) / 3 + Math.sqrt(1/3) * sin) * r + 
      (cos + (1 - cos) / 3) * g + 
      ((1 - cos) / 3 - Math.sqrt(1/3) * sin) * b
    ));
    
    const newB = Math.min(255, Math.max(0, 
      ((1 - cos) / 3 - Math.sqrt(1/3) * sin) * r + 
      ((1 - cos) / 3 + Math.sqrt(1/3) * sin) * g + 
      (cos + (1 - cos) / 3) * b
    ));
    
    newData[i] = newR;
    newData[i + 1] = newG;
    newData[i + 2] = newB;
    newData[i + 3] = data[i + 3];
  }
  
  return newImageData;
}

/**
 * 应用饱和度效果
 * @param {ImageData} imageData - 图像数据
 * @param {number} value - 饱和度值 (-100 到 100)
 * @returns {ImageData} 处理后的图像数据
 */
export function applySaturationEffect(imageData, value) {
  if (value === 0) return imageData;
  
  const data = imageData.data;
  const adjustment = 1 + value / 100;
  
  // 创建新的图像数据
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d');
  const newImageData = ctx.createImageData(imageData.width, imageData.height);
  const newData = newImageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // 计算亮度
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    
    // 调整饱和度
    const newR = Math.min(255, Math.max(0, luminance + adjustment * (r - luminance)));
    const newG = Math.min(255, Math.max(0, luminance + adjustment * (g - luminance)));
    const newB = Math.min(255, Math.max(0, luminance + adjustment * (b - luminance)));
    
    newData[i] = newR;
    newData[i + 1] = newG;
    newData[i + 2] = newB;
    newData[i + 3] = data[i + 3];
  }
  
  return newImageData;
}

/**
 * 应用阴影效果
 * @param {ImageData} imageData - 图像数据
 * @param {Object} params - 阴影参数 {x, y, blur, color, opacity}
 * @returns {ImageData} 处理后的图像数据
 */
export function applyShadowEffect(imageData, params) {
  // 阴影效果通常在渲染时处理，这里返回原图像数据
  return imageData;
}

/**
 * 应用发光效果
 * @param {ImageData} imageData - 图像数据
 * @param {Object} params - 发光参数 {radius, color, opacity}
 * @returns {ImageData} 处理后的图像数据
 */
export function applyGlowEffect(imageData, params) {
  // 发光效果通常在渲染时处理，这里返回原图像数据
  return imageData;
}

/**
 * 应用图层效果
 * @param {ImageData} imageData - 图像数据
 * @param {Array} effects - 效果数组
 * @returns {ImageData} 处理后的图像数据
 */
export function applyLayerEffects(imageData, effects) {
  let result = imageData;
  
  // 按顺序应用启用的效果
  for (const effect of effects) {
    if (!effect.enabled) continue;
    
    switch (effect.type) {
      case 'blur':
        result = applyBlurEffect(result, effect.parameters.radius);
        break;
      case 'brightness':
        result = applyBrightnessEffect(result, effect.parameters.value);
        break;
      case 'contrast':
        result = applyContrastEffect(result, effect.parameters.value);
        break;
      case 'hue':
        result = applyHueEffect(result, effect.parameters.value);
        break;
      case 'saturation':
        result = applySaturationEffect(result, effect.parameters.value);
        break;
      case 'shadow':
        result = applyShadowEffect(result, effect.parameters);
        break;
      case 'glow':
        result = applyGlowEffect(result, effect.parameters);
        break;
    }
  }
  
  return result;
}

export default {
  applyBlurEffect,
  applyBrightnessEffect,
  applyContrastEffect,
  applyHueEffect,
  applySaturationEffect,
  applyShadowEffect,
  applyGlowEffect,
  applyLayerEffects
};