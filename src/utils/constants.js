/**
 * 应用常量配置
 */

// 画布工具类型
export const TOOL_TYPES = {
  SELECT: 'select',
  HAND: 'hand',
  RECTANGLE: 'rectangle',
  ELLIPSE: 'ellipse',
  DRAW: 'draw',
  ERASER: 'eraser',
};

// 默认配置
export const DEFAULT_CONFIG = {
  PROJECT_NAME: '未命名项目',
  ZOOM_LEVEL: 1,
  POINTS: 1280,
  MEMBER_STATUS: '高级会员',
  MAX_POLL_ATTEMPTS: 30,
  POLL_INTERVAL: 2000,
  IMAGE_SPACING: 450,
  CANVAS_MARGIN: 40,
  DEFAULT_CANVAS_WIDTH: 800,
  DEFAULT_CANVAS_HEIGHT: 600,
};

// API端点
export const API_ENDPOINTS = {
  COMFY_VIEW: '/api/comfy/view',
  COMFY_APPS_RUN: '/comfy/apps',
  COMFY_HISTORY: '/comfy/history',
  UPLOADS: '/uploads',
};

// 图层混合模式
export const BLEND_MODES = [
  { value: 'normal', label: '正常' },
  { value: 'multiply', label: '正片叠底' },
  { value: 'screen', label: '滤色' },
  { value: 'overlay', label: '叠加' },
  { value: 'darken', label: '变暗' },
  { value: 'lighten', label: '变亮' },
];

// 快捷问题模板
export const QUICK_QUESTIONS_TEMPLATES = [
  [
    '你能为我做什么？',
    '科技公司品牌 Logo',
    '游戏图标设计',
    '海报设计建议'
  ],
  [
    '如何设计吸引人的海报？',
    'Logo设计有哪些原则？',
    '配色方案推荐',
    '字体选择建议'
  ],
];

// AI回复模板
export const AI_RESPONSES = [
  '这是一个很好的想法！我可以为你生成一些相关的视觉元素。',
  '根据你的描述，我建议使用对比鲜明的色彩搭配来突出主题。',
  '让我为你创建一个符合要求的设计方案。',
  '这个设计方向很棒！我会为你提供几个不同的版本供选择。'
];

// 拖拽数据类型
export const DRAG_DATA_TYPES = {
  LAYER_ID: 'application/x-layer-id',
};

// 文件类型
export const FILE_TYPES = {
  IMAGE: 'image/*',
  PNG: 'image/png',
  JPEG: 'image/jpeg',
};

// 延迟时间（毫秒）
export const DELAYS = {
  SHAPE_CREATION: 100,
  SELECTION_SYNC: 200,
  GENERATION_COMPLETE: 500,
  STATE_UPDATE: 300,
};

// 图片间距
export const IMAGE_SPACING = 450;

