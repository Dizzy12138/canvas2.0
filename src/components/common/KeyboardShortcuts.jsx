import React, { useState, useEffect } from 'react';
import { X, Search, Keyboard } from 'lucide-react';
import clsx from 'clsx';

/**
 * 快捷键配置
 */
export const shortcuts = {
  // 基础操作
  undo: { key: 'Ctrl+Z', label: '撤销', category: '基础' },
  redo: { key: 'Ctrl+Shift+Z', label: '重做', category: '基础' },
  copy: { key: 'Ctrl+C', label: '复制', category: '基础' },
  paste: { key: 'Ctrl+V', label: '粘贴', category: '基础' },
  cut: { key: 'Ctrl+X', label: '剪切', category: '基础' },
  delete: { key: 'Delete', label: '删除', category: '基础' },
  selectAll: { key: 'Ctrl+A', label: '全选', category: '基础' },
  save: { key: 'Ctrl+S', label: '保存', category: '基础' },
  
  // 图层操作
  newLayer: { key: 'Ctrl+Shift+N', label: '新建图层', category: '图层' },
  duplicateLayer: { key: 'Ctrl+J', label: '复制图层', category: '图层' },
  mergeDown: { key: 'Ctrl+E', label: '向下合并', category: '图层' },
  groupLayers: { key: 'Ctrl+G', label: '编组', category: '图层' },
  ungroupLayers: { key: 'Ctrl+Shift+G', label: '解组', category: '图层' },
  prevLayer: { key: '[', label: '切换到上一图层', category: '图层' },
  nextLayer: { key: ']', label: '切换到下一图层', category: '图层' },
  
  // 工具切换
  selectTool: { key: 'V', label: '选择工具', category: '工具' },
  handTool: { key: 'H', label: '手型工具', category: '工具' },
  brushTool: { key: 'B', label: '画笔工具', category: '工具' },
  eraserTool: { key: 'E', label: '橡皮擦', category: '工具' },
  
  // 视图操作
  zoomIn: { key: 'Ctrl++', label: '放大', category: '视图' },
  zoomOut: { key: 'Ctrl+-', label: '缩小', category: '视图' },
  actualSize: { key: 'Ctrl+0', label: '实际大小', category: '视图' },
  fitScreen: { key: 'Ctrl+1', label: '适应窗口', category: '视图' },
  spaceHold: { key: 'Space', label: '临时手型工具（按住）', category: '视图' },
  
  // 面板切换
  toggleLayers: { key: 'F7', label: '切换图层面板', category: '面板' },
  toggleProperties: { key: 'F8', label: '切换属性面板', category: '面板' },
  showHelp: { key: '?', label: '显示快捷键帮助', category: '面板' }
};

/**
 * 快捷键帮助面板
 */
const KeyboardShortcutsHelp = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('全部');

  // 获取所有分类
  const categories = ['全部', ...new Set(Object.values(shortcuts).map(s => s.category))];

  // 过滤快捷键
  const filteredShortcuts = Object.entries(shortcuts).filter(([key, shortcut]) => {
    const matchesSearch = searchQuery === '' || 
      shortcut.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shortcut.key.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === '全部' || shortcut.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // 按分类分组
  const groupedShortcuts = filteredShortcuts.reduce((acc, [key, shortcut]) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push({ key, ...shortcut });
    return acc;
  }, {});

  // ESC 关闭
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Keyboard className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                键盘快捷键
              </h2>
              <p className="text-sm text-gray-500">
                提升您的工作效率
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 搜索和过滤 */}
        <div className="p-6 border-b space-y-4">
          {/* 搜索框 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="搜索快捷键..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 分类标签 */}
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  selectedCategory === category
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* 快捷键列表 */}
        <div className="flex-1 overflow-y-auto p-6">
          {Object.keys(groupedShortcuts).length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>未找到匹配的快捷键</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedShortcuts).map(([category, items]) => (
                <div key={category}>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 sticky top-0 bg-white py-2">
                    {category}
                  </h3>
                  <div className="space-y-2">
                    {items.map((shortcut) => (
                      <div
                        key={shortcut.key}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <span className="text-sm text-gray-700">
                          {shortcut.label}
                        </span>
                        <kbd className="px-3 py-1.5 text-sm font-mono bg-gray-100 text-gray-900 rounded border border-gray-300 shadow-sm">
                          {shortcut.key}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 底部提示 */}
        <div className="p-4 border-t bg-gray-50 text-center">
          <p className="text-xs text-gray-600">
            按 <kbd className="px-2 py-1 text-xs font-mono bg-white rounded border">ESC</kbd> 关闭此窗口 ·
            按 <kbd className="px-2 py-1 text-xs font-mono bg-white rounded border">?</kbd> 随时打开帮助
          </p>
        </div>
      </div>
    </div>
  );
};

/**
 * 快捷键管理 Hook
 */
export const useKeyboardShortcuts = (handlers = {}) => {
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // 如果在输入框中，忽略快捷键（除了 ESC 和 ?）
      const isInputActive = 
        e.target.tagName === 'INPUT' || 
        e.target.tagName === 'TEXTAREA' ||
        e.target.isContentEditable;

      // ? 键显示帮助
      if (e.key === '?' && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        e.preventDefault();
        setHelpOpen(true);
        return;
      }

      if (isInputActive && e.key !== 'Escape') return;

      // 构建快捷键字符串
      const parts = [];
      if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
      if (e.shiftKey) parts.push('Shift');
      if (e.altKey) parts.push('Alt');
      
      let key = e.key;
      if (key === ' ') key = 'Space';
      if (key.length === 1) key = key.toUpperCase();
      parts.push(key);
      
      const shortcutKey = parts.join('+');

      // 查找匹配的快捷键
      const matchedShortcut = Object.entries(shortcuts).find(
        ([_, config]) => config.key === shortcutKey
      );

      if (matchedShortcut) {
        const [handlerKey] = matchedShortcut;
        const handler = handlers[handlerKey];
        
        if (handler) {
          e.preventDefault();
          handler(e);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);

  return {
    helpOpen,
    setHelpOpen
  };
};

/**
 * 快捷键帮助按钮
 */
export const ShortcutHelpButton = ({ onClick }) => (
  <button
    onClick={onClick}
    className="fixed bottom-4 right-4 z-40 p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors group"
    title="显示快捷键帮助 (?)"
  >
    <Keyboard className="w-5 h-5" />
    <span className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
      快捷键 (?)
    </span>
  </button>
);

export default KeyboardShortcutsHelp;

