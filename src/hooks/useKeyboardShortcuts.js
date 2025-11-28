/**
 * 键盘快捷键 Hook
 * V2.0 增强交互体验
 */

import { useEffect, useCallback, useRef } from 'react';

/**
 * 快捷键配置
 */
export const SHORTCUTS = {
  // 基础操作
  undo: {
    keys: ['ctrl+z', 'meta+z'],
    description: '撤销',
    category: '编辑'
  },
  redo: {
    keys: ['ctrl+shift+z', 'meta+shift+z', 'ctrl+y', 'meta+y'],
    description: '重做',
    category: '编辑'
  },
  copy: {
    keys: ['ctrl+c', 'meta+c'],
    description: '复制',
    category: '编辑'
  },
  paste: {
    keys: ['ctrl+v', 'meta+v'],
    description: '粘贴',
    category: '编辑'
  },
  cut: {
    keys: ['ctrl+x', 'meta+x'],
    description: '剪切',
    category: '编辑'
  },
  delete: {
    keys: ['delete', 'backspace'],
    description: '删除',
    category: '编辑'
  },
  selectAll: {
    keys: ['ctrl+a', 'meta+a'],
    description: '全选',
    category: '选择'
  },
  
  // 工具切换
  selectTool: {
    keys: ['v'],
    description: '选择工具',
    category: '工具'
  },
  handTool: {
    keys: ['h'],
    description: '抓手工具',
    category: '工具'
  },
  brushTool: {
    keys: ['b'],
    description: '画笔工具',
    category: '工具'
  },
  eraserTool: {
    keys: ['e'],
    description: '橡皮擦工具',
    category: '工具'
  },
  rectangleTool: {
    keys: ['r'],
    description: '矩形工具',
    category: '工具'
  },
  ellipseTool: {
    keys: ['o'],
    description: '椭圆工具',
    category: '工具'
  },
  textTool: {
    keys: ['t'],
    description: '文本工具',
    category: '工具'
  },
  
  // 图层操作
  newLayer: {
    keys: ['ctrl+shift+n', 'meta+shift+n'],
    description: '新建图层',
    category: '图层'
  },
  duplicateLayer: {
    keys: ['ctrl+j', 'meta+j'],
    description: '复制图层',
    category: '图层'
  },
  mergeLayer: {
    keys: ['ctrl+e', 'meta+e'],
    description: '合并图层',
    category: '图层'
  },
  groupLayers: {
    keys: ['ctrl+g', 'meta+g'],
    description: '组合图层',
    category: '图层'
  },
  ungroupLayers: {
    keys: ['ctrl+shift+g', 'meta+shift+g'],
    description: '取消组合',
    category: '图层'
  },
  
  // 视图控制
  zoomIn: {
    keys: ['ctrl+=', 'meta+=', 'ctrl++', 'meta++'],
    description: '放大',
    category: '视图'
  },
  zoomOut: {
    keys: ['ctrl+-', 'meta+-'],
    description: '缩小',
    category: '视图'
  },
  zoomReset: {
    keys: ['ctrl+0', 'meta+0'],
    description: '重置缩放',
    category: '视图'
  },
  zoomFit: {
    keys: ['ctrl+1', 'meta+1'],
    description: '适应屏幕',
    category: '视图'
  },
  pan: {
    keys: ['space'],
    description: '平移画布（按住）',
    category: '视图',
    hold: true
  },
  
  // 对齐操作
  alignLeft: {
    keys: ['ctrl+shift+l', 'meta+shift+l'],
    description: '左对齐',
    category: '对齐'
  },
  alignCenter: {
    keys: ['ctrl+shift+c', 'meta+shift+c'],
    description: '居中对齐',
    category: '对齐'
  },
  alignRight: {
    keys: ['ctrl+shift+r', 'meta+shift+r'],
    description: '右对齐',
    category: '对齐'
  },
  alignTop: {
    keys: ['ctrl+shift+t', 'meta+shift+t'],
    description: '顶部对齐',
    category: '对齐'
  },
  alignMiddle: {
    keys: ['ctrl+shift+m', 'meta+shift+m'],
    description: '垂直居中',
    category: '对齐'
  },
  alignBottom: {
    keys: ['ctrl+shift+b', 'meta+shift+b'],
    description: '底部对齐',
    category: '对齐'
  },
  
  // 导出和保存
  save: {
    keys: ['ctrl+s', 'meta+s'],
    description: '保存项目',
    category: '文件'
  },
  export: {
    keys: ['ctrl+shift+e', 'meta+shift+e'],
    description: '导出',
    category: '文件'
  },
  
  // 切换面板
  toggleLayerPanel: {
    keys: ['f7'],
    description: '切换图层面板',
    category: '面板'
  },
  toggleToolPanel: {
    keys: ['f8'],
    description: '切换工具面板',
    category: '面板'
  },
  toggleFullscreen: {
    keys: ['f11'],
    description: '全屏模式',
    category: '视图'
  },
  
  // 快速操作
  escape: {
    keys: ['escape'],
    description: '取消当前操作',
    category: '通用'
  },
  enter: {
    keys: ['enter'],
    description: '确认',
    category: '通用'
  }
};

/**
 * 解析快捷键字符串
 */
function parseShortcut(shortcut) {
  const keys = shortcut.toLowerCase().split('+');
  return {
    ctrl: keys.includes('ctrl'),
    meta: keys.includes('meta'),
    shift: keys.includes('shift'),
    alt: keys.includes('alt'),
    key: keys[keys.length - 1]
  };
}

/**
 * 检查事件是否匹配快捷键
 */
function matchesShortcut(event, shortcut) {
  const parsed = parseShortcut(shortcut);
  
  return (
    event.key.toLowerCase() === parsed.key &&
    event.ctrlKey === parsed.ctrl &&
    event.metaKey === parsed.meta &&
    event.shiftKey === parsed.shift &&
    event.altKey === parsed.alt
  );
}

/**
 * 使用键盘快捷键
 * 
 * @param {Object} handlers - 快捷键处理器映射
 * @param {Object} options - 选项
 */
export function useKeyboardShortcuts(handlers = {}, options = {}) {
  const {
    enabled = true,
    preventDefault = true,
    excludeInputs = true
  } = options;
  
  const handlersRef = useRef(handlers);
  
  // 更新 handlers ref
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);
  
  const handleKeyDown = useCallback((event) => {
    if (!enabled) return;
    
    // 排除输入框等元素
    if (excludeInputs && isInputElement(event.target)) {
      return;
    }
    
    // 检查每个快捷键
    for (const [action, config] of Object.entries(SHORTCUTS)) {
      for (const shortcut of config.keys) {
        if (matchesShortcut(event, shortcut)) {
          const handler = handlersRef.current[action];
          if (handler) {
            if (preventDefault) {
              event.preventDefault();
            }
            handler(event);
            return;
          }
        }
      }
    }
  }, [enabled, preventDefault, excludeInputs]);
  
  useEffect(() => {
    if (enabled) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [enabled, handleKeyDown]);
}

/**
 * 检查是否是输入元素
 */
function isInputElement(element) {
  const tagName = element.tagName.toLowerCase();
  return (
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select' ||
    element.isContentEditable
  );
}

/**
 * 格式化快捷键显示
 */
export function formatShortcut(shortcut) {
  const isMac = navigator.platform.toLowerCase().includes('mac');
  
  return shortcut
    .split('+')
    .map(key => {
      if (key === 'ctrl') return isMac ? '⌃' : 'Ctrl';
      if (key === 'meta') return isMac ? '⌘' : 'Win';
      if (key === 'shift') return isMac ? '⇧' : 'Shift';
      if (key === 'alt') return isMac ? '⌥' : 'Alt';
      if (key === 'enter') return '↵';
      if (key === 'escape') return 'Esc';
      if (key === 'backspace') return '⌫';
      if (key === 'delete') return 'Del';
      return key.toUpperCase();
    })
    .join(isMac ? '' : '+');
}

/**
 * 获取按类别分组的快捷键
 */
export function getShortcutsByCategory() {
  const grouped = {};
  
  for (const [action, config] of Object.entries(SHORTCUTS)) {
    const category = config.category || '其他';
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push({
      action,
      ...config,
      displayKeys: config.keys.map(formatShortcut)
    });
  }
  
  return grouped;
}

/**
 * 快捷键帮助面板组件
 */
export function ShortcutHelp({ onClose }) {
  const shortcuts = getShortcutsByCategory();
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-2xl font-bold">键盘快捷键</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-100px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(shortcuts).map(([category, items]) => (
              <div key={category}>
                <h3 className="text-lg font-semibold mb-3 text-gray-700">
                  {category}
                </h3>
                <div className="space-y-2">
                  {items.map((item) => (
                    <div
                      key={item.action}
                      className="flex justify-between items-center"
                    >
                      <span className="text-gray-600">{item.description}</span>
                      <div className="flex gap-2">
                        {item.displayKeys.map((key, i) => (
                          <kbd
                            key={i}
                            className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono"
                          >
                            {key}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="p-4 border-t bg-gray-50 text-center text-sm text-gray-600">
          按 <kbd className="px-2 py-1 bg-white border border-gray-300 rounded">?</kbd> 
          {' '}随时查看快捷键
        </div>
      </div>
    </div>
  );
}

export default useKeyboardShortcuts;

