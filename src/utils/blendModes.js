/**
 * 图层混合模式工具函数
 * 实现各种图层混合模式的计算逻辑
 */

// 混合模式枚举
export const BlendMode = {
  NORMAL: 'normal',
  MULTIPLY: 'multiply',
  SCREEN: 'screen',
  OVERLAY: 'overlay',
  DARKEN: 'darken',
  LIGHTEN: 'lighten',
  COLOR_DODGE: 'color-dodge',
  COLOR_BURN: 'color-burn',
  HARD_LIGHT: 'hard-light',
  SOFT_LIGHT: 'soft-light',
  DIFFERENCE: 'difference',
  EXCLUSION: 'exclusion',
  HUE: 'hue',
  SATURATION: 'saturation',
  COLOR: 'color',
  LUMINOSITY: 'luminosity'
};

/**
 * 将十六进制颜色转换为RGB数组
 * @param {string} hex - 十六进制颜色值
 * @returns {Array<number>} RGB数组 [r, g, b]
 */
export function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ] : [0, 0, 0];
}

/**
 * 将RGB数组转换为十六进制颜色
 * @param {Array<number>} rgb - RGB数组 [r, g, b]
 * @returns {string} 十六进制颜色值
 */
export function rgbToHex(rgb) {
  return "#" + ((1 << 24) + (rgb[0] << 16) + (rgb[1] << 8) + rgb[2]).toString(16).slice(1);
}

/**
 * 应用混合模式到两个颜色值
 * @param {Array<number>} base - 基础颜色RGB数组
 * @param {Array<number>} blend - 混合颜色RGB数组
 * @param {string} mode - 混合模式
 * @param {number} opacity - 混合颜色不透明度 (0-1)
 * @returns {Array<number>} 混合后的RGB数组
 */
export function applyBlendMode(base, blend, mode, opacity = 1) {
  // 应用不透明度到混合颜色
  const blended = blend.map((c, i) => Math.round(base[i] + (c - base[i]) * opacity));
  
  switch (mode) {
    case BlendMode.NORMAL:
      return blended;
      
    case BlendMode.MULTIPLY:
      return [
        Math.round((base[0] * blended[0]) / 255),
        Math.round((base[1] * blended[1]) / 255),
        Math.round((base[2] * blended[2]) / 255)
      ];
      
    case BlendMode.SCREEN:
      return [
        255 - Math.round(((255 - base[0]) * (255 - blended[0])) / 255),
        255 - Math.round(((255 - base[1]) * (255 - blended[1])) / 255),
        255 - Math.round(((255 - base[2]) * (255 - blended[2])) / 255)
      ];
      
    case BlendMode.OVERLAY:
      return [
        base[0] < 128 
          ? Math.round((2 * base[0] * blended[0]) / 255)
          : 255 - Math.round((2 * (255 - base[0]) * (255 - blended[0])) / 255),
        base[1] < 128 
          ? Math.round((2 * base[1] * blended[1]) / 255)
          : 255 - Math.round((2 * (255 - base[1]) * (255 - blended[1])) / 255),
        base[2] < 128 
          ? Math.round((2 * base[2] * blended[2]) / 255)
          : 255 - Math.round((2 * (255 - base[2]) * (255 - blended[2])) / 255)
      ];
      
    case BlendMode.DARKEN:
      return [
        Math.min(base[0], blended[0]),
        Math.min(base[1], blended[1]),
        Math.min(base[2], blended[2])
      ];
      
    case BlendMode.LIGHTEN:
      return [
        Math.max(base[0], blended[0]),
        Math.max(base[1], blended[1]),
        Math.max(base[2], blended[2])
      ];
      
    case BlendMode.DIFFERENCE:
      return [
        Math.abs(base[0] - blended[0]),
        Math.abs(base[1] - blended[1]),
        Math.abs(base[2] - blended[2])
      ];
      
    case BlendMode.EXCLUSION:
      return [
        base[0] + blended[0] - (2 * base[0] * blended[0]) / 255,
        base[1] + blended[1] - (2 * base[1] * blended[1]) / 255,
        base[2] + blended[2] - (2 * base[2] * blended[2]) / 255
      ];
      
    default:
      return blended;
  }
}

/**
 * 在Canvas上应用混合模式
 * @param {CanvasRenderingContext2D} ctx - Canvas上下文
 * @param {string} mode - 混合模式
 */
export function setCanvasBlendMode(ctx, mode) {
  switch (mode) {
    case BlendMode.MULTIPLY:
      ctx.globalCompositeOperation = 'multiply';
      break;
    case BlendMode.SCREEN:
      ctx.globalCompositeOperation = 'screen';
      break;
    case BlendMode.OVERLAY:
      ctx.globalCompositeOperation = 'overlay';
      break;
    case BlendMode.DARKEN:
      ctx.globalCompositeOperation = 'darken';
      break;
    case BlendMode.LIGHTEN:
      ctx.globalCompositeOperation = 'lighten';
      break;
    case BlendMode.DIFFERENCE:
      ctx.globalCompositeOperation = 'difference';
      break;
    case BlendMode.EXCLUSION:
      ctx.globalCompositeOperation = 'exclusion';
      break;
    case BlendMode.HARD_LIGHT:
      ctx.globalCompositeOperation = 'hard-light';
      break;
    case BlendMode.SOFT_LIGHT:
      ctx.globalCompositeOperation = 'soft-light';
      break;
    case BlendMode.COLOR_DODGE:
      ctx.globalCompositeOperation = 'color-dodge';
      break;
    case BlendMode.COLOR_BURN:
      ctx.globalCompositeOperation = 'color-burn';
      break;
    case BlendMode.HUE:
      ctx.globalCompositeOperation = 'hue';
      break;
    case BlendMode.SATURATION:
      ctx.globalCompositeOperation = 'saturation';
      break;
    case BlendMode.COLOR:
      ctx.globalCompositeOperation = 'color';
      break;
    case BlendMode.LUMINOSITY:
      ctx.globalCompositeOperation = 'luminosity';
      break;
    default:
      ctx.globalCompositeOperation = 'source-over';
  }
}

export default {
  BlendMode,
  hexToRgb,
  rgbToHex,
  applyBlendMode,
  setCanvasBlendMode
};