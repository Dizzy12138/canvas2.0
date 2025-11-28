/**
 * 虚拟化图层列表
 * V2.0 性能优化 - 支持大量图层场景
 */

import React, { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import { Eye, EyeOff, Lock, Unlock } from 'lucide-react';
import clsx from 'clsx';
import { calculateVisibleRange } from '../utils/PerformanceOptimizer';

const ITEM_HEIGHT = 48; // 每个图层项的高度

/**
 * 虚拟化图层项
 */
const LayerItem = React.memo(({ 
  layer, 
  isActive, 
  isSelected,
  onSelect,
  onToggleVisibility,
  onToggleLock,
  style 
}) => {
  return (
    <div
      className={clsx(
        'absolute left-0 right-0 flex items-center px-3 py-2 cursor-pointer',
        'hover:bg-gray-50 transition-colors',
        isActive && 'bg-blue-50 border-l-4 border-blue-500',
        isSelected && !isActive && 'bg-blue-100'
      )}
      style={style}
      onClick={() => onSelect(layer.id)}
    >
      {/* 缩略图 */}
      <div className="w-8 h-8 bg-gray-200 rounded mr-3 overflow-hidden flex-shrink-0">
        {layer.thumbnail ? (
          <img 
            src={layer.thumbnail} 
            alt={layer.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
            图
          </div>
        )}
      </div>

      {/* 图层名称 */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900 truncate">
          {layer.name}
        </div>
        {layer.effects && layer.effects.length > 0 && (
          <div className="text-xs text-gray-500 truncate">
            {layer.effects.length} 个效果
          </div>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center gap-1 ml-2">
        <button
          className="p-1 hover:bg-gray-200 rounded"
          onClick={(e) => {
            e.stopPropagation();
            onToggleVisibility(layer.id);
          }}
          title={layer.visible ? '隐藏' : '显示'}
        >
          {layer.visible ? (
            <Eye className="w-4 h-4 text-gray-600" />
          ) : (
            <EyeOff className="w-4 h-4 text-gray-400" />
          )}
        </button>
        
        <button
          className="p-1 hover:bg-gray-200 rounded"
          onClick={(e) => {
            e.stopPropagation();
            onToggleLock(layer.id);
          }}
          title={layer.locked ? '解锁' : '锁定'}
        >
          {layer.locked ? (
            <Lock className="w-4 h-4 text-gray-600" />
          ) : (
            <Unlock className="w-4 h-4 text-gray-400" />
          )}
        </button>
      </div>

      {/* 不透明度指示 */}
      {layer.opacity < 1 && (
        <div className="ml-2 text-xs text-gray-500">
          {Math.round(layer.opacity * 100)}%
        </div>
      )}
    </div>
  );
});

LayerItem.displayName = 'LayerItem';

/**
 * 虚拟化图层列表组件
 */
export function VirtualizedLayerList({
  layers = [],
  activeLayerId,
  selectedLayerIds = new Set(),
  onLayerSelect,
  onLayerToggleVisibility,
  onLayerToggleLock,
  height = 600
}) {
  const containerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  
  // 处理滚动
  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);

  // 计算可见范围
  const visibleRange = useMemo(() => {
    return calculateVisibleRange(
      scrollTop,
      height,
      ITEM_HEIGHT,
      layers.length
    );
  }, [scrollTop, height, layers.length]);

  // 渲染可见的图层项
  const visibleLayers = useMemo(() => {
    return layers.slice(visibleRange.start, visibleRange.end).map((layer, index) => ({
      layer,
      index: visibleRange.start + index
    }));
  }, [layers, visibleRange]);

  return (
    <div
      ref={containerRef}
      className="relative overflow-y-auto"
      style={{ height }}
      onScroll={handleScroll}
    >
      {/* 总高度占位 */}
      <div style={{ height: visibleRange.totalHeight, position: 'relative' }}>
        {/* 可见项目 */}
        {visibleLayers.map(({ layer, index }) => (
          <LayerItem
            key={layer.id}
            layer={layer}
            isActive={layer.id === activeLayerId}
            isSelected={selectedLayerIds.has(layer.id)}
            onSelect={onLayerSelect}
            onToggleVisibility={onLayerToggleVisibility}
            onToggleLock={onLayerToggleLock}
            style={{
              top: index * ITEM_HEIGHT,
              height: ITEM_HEIGHT
            }}
          />
        ))}
      </div>

      {/* 空状态 */}
      {layers.length === 0 && (
        <div className="flex items-center justify-center h-full text-gray-400">
          <div className="text-center">
            <p className="text-sm">暂无图层</p>
            <p className="text-xs mt-1">点击下方按钮添加图层</p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 带搜索和过滤的虚拟化图层列表
 */
export function EnhancedLayerList({
  layers = [],
  activeLayerId,
  selectedLayerIds = new Set(),
  onLayerSelect,
  onLayerToggleVisibility,
  onLayerToggleLock,
  height = 600
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all'); // all, visible, hidden, locked

  // 过滤图层
  const filteredLayers = useMemo(() => {
    let result = layers;

    // 搜索过滤
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(layer => 
        layer.name.toLowerCase().includes(query)
      );
    }

    // 状态过滤
    switch (filter) {
      case 'visible':
        result = result.filter(layer => layer.visible);
        break;
      case 'hidden':
        result = result.filter(layer => !layer.visible);
        break;
      case 'locked':
        result = result.filter(layer => layer.locked);
        break;
      default:
        break;
    }

    return result;
  }, [layers, searchQuery, filter]);

  return (
    <div className="flex flex-col h-full">
      {/* 搜索和过滤栏 */}
      <div className="p-2 border-b space-y-2">
        <input
          type="text"
          placeholder="搜索图层..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        
        <div className="flex gap-1">
          {[
            { value: 'all', label: '全部' },
            { value: 'visible', label: '可见' },
            { value: 'hidden', label: '隐藏' },
            { value: 'locked', label: '锁定' }
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={clsx(
                'flex-1 px-2 py-1 text-xs rounded transition-colors',
                filter === value
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 结果计数 */}
        {(searchQuery || filter !== 'all') && (
          <div className="text-xs text-gray-500 text-center">
            找到 {filteredLayers.length} 个图层
          </div>
        )}
      </div>

      {/* 虚拟化列表 */}
      <div className="flex-1 overflow-hidden">
        <VirtualizedLayerList
          layers={filteredLayers}
          activeLayerId={activeLayerId}
          selectedLayerIds={selectedLayerIds}
          onLayerSelect={onLayerSelect}
          onLayerToggleVisibility={onLayerToggleVisibility}
          onLayerToggleLock={onLayerToggleLock}
          height={height - 120} // 减去搜索栏高度
        />
      </div>
    </div>
  );
}

/**
 * 图层列表性能统计
 */
export function LayerListStats({ layers }) {
  const stats = useMemo(() => {
    return {
      total: layers.length,
      visible: layers.filter(l => l.visible).length,
      hidden: layers.filter(l => !l.visible).length,
      locked: layers.filter(l => l.locked).length,
      withEffects: layers.filter(l => l.effects && l.effects.length > 0).length
    };
  }, [layers]);

  return (
    <div className="p-2 bg-gray-50 border-t text-xs text-gray-600">
      <div className="flex justify-between">
        <span>总计: {stats.total}</span>
        <span>可见: {stats.visible}</span>
        <span>隐藏: {stats.hidden}</span>
        <span>锁定: {stats.locked}</span>
        {stats.withEffects > 0 && (
          <span>效果: {stats.withEffects}</span>
        )}
      </div>
    </div>
  );
}

export default VirtualizedLayerList;

