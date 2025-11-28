/**
 * 性能优化工具集
 * V2.0 核心优化模块
 */

/**
 * 增量渲染引擎
 * 只重新渲染变化的图层，大幅提升性能
 */
export class IncrementalRenderEngine {
  constructor() {
    this.layerCache = new Map(); // 图层渲染缓存
    this.dirtyLayers = new Set(); // 脏图层追踪
    this.compositeCache = null;   // 合成缓存
    this.lastRenderTime = 0;
  }

  /**
   * 标记图层为脏
   */
  markDirty(layerId) {
    this.dirtyLayers.add(layerId);
    this.invalidateComposite();
  }

  /**
   * 标记所有图层为脏
   */
  markAllDirty() {
    this.dirtyLayers.clear();
    this.layerCache.clear();
    this.invalidateComposite();
  }

  /**
   * 使合成缓存无效
   */
  invalidateComposite() {
    this.compositeCache = null;
  }

  /**
   * 检查是否需要重新渲染
   */
  needsRender() {
    return this.dirtyLayers.size > 0 || this.compositeCache === null;
  }

  /**
   * 清理缓存
   */
  clearCache() {
    this.layerCache.clear();
    this.dirtyLayers.clear();
    this.compositeCache = null;
  }

  /**
   * 获取渲染统计信息
   */
  getStats() {
    return {
      cachedLayers: this.layerCache.size,
      dirtyLayers: this.dirtyLayers.size,
      hasComposite: this.compositeCache !== null,
      lastRenderTime: this.lastRenderTime
    };
  }
}

/**
 * 图像资源池
 * 管理图像资源的加载和释放，避免重复加载
 */
export class ImageResourcePool {
  constructor(options = {}) {
    this.pool = new Map();
    this.refCount = new Map();
    this.loadingPromises = new Map();
    this.cleanupDelay = options.cleanupDelay || 60000; // 默认1分钟后清理
    this.maxPoolSize = options.maxPoolSize || 100; // 最大缓存数量
  }

  /**
   * 获取图像资源
   */
  async acquire(url) {
    // 如果正在加载，等待加载完成
    if (this.loadingPromises.has(url)) {
      return await this.loadingPromises.get(url);
    }

    // 如果已在池中，增加引用计数
    if (this.pool.has(url)) {
      this.refCount.set(url, this.refCount.get(url) + 1);
      return this.pool.get(url);
    }

    // 加载新图像
    const loadPromise = this._loadImage(url);
    this.loadingPromises.set(url, loadPromise);

    try {
      const image = await loadPromise;
      this.pool.set(url, image);
      this.refCount.set(url, 1);
      this.loadingPromises.delete(url);
      
      // 检查池大小
      this._checkPoolSize();
      
      return image;
    } catch (error) {
      this.loadingPromises.delete(url);
      throw error;
    }
  }

  /**
   * 释放图像资源
   */
  release(url) {
    if (!this.refCount.has(url)) return;

    const count = this.refCount.get(url) - 1;
    this.refCount.set(url, count);

    if (count === 0) {
      // 延迟删除，避免频繁加载
      setTimeout(() => {
        if (this.refCount.get(url) === 0) {
          this.pool.delete(url);
          this.refCount.delete(url);
        }
      }, this.cleanupDelay);
    }
  }

  /**
   * 加载图像
   */
  _loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  }

  /**
   * 检查池大小，如果超过限制则清理最少使用的资源
   */
  _checkPoolSize() {
    if (this.pool.size > this.maxPoolSize) {
      // 找到引用计数最小的资源并删除
      let minUrl = null;
      let minCount = Infinity;
      
      for (const [url, count] of this.refCount.entries()) {
        if (count < minCount) {
          minCount = count;
          minUrl = url;
        }
      }
      
      if (minUrl) {
        this.pool.delete(minUrl);
        this.refCount.delete(minUrl);
      }
    }
  }

  /**
   * 清空资源池
   */
  clear() {
    this.pool.clear();
    this.refCount.clear();
    this.loadingPromises.clear();
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      poolSize: this.pool.size,
      loading: this.loadingPromises.size,
      totalReferences: Array.from(this.refCount.values()).reduce((a, b) => a + b, 0)
    };
  }
}

/**
 * 防抖函数
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * 节流函数
 */
export function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * 请求动画帧节流
 */
export function rafThrottle(func) {
  let rafId = null;
  return function(...args) {
    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        func.apply(this, args);
        rafId = null;
      });
    }
  };
}

/**
 * 批量更新工具
 * 将多个状态更新合并为一次
 */
export class BatchUpdater {
  constructor(applyFn, delay = 16) {
    this.applyFn = applyFn;
    this.delay = delay;
    this.pending = new Map();
    this.timeoutId = null;
  }

  /**
   * 添加更新
   */
  add(key, value) {
    this.pending.set(key, value);
    this._scheduleApply();
  }

  /**
   * 立即应用所有更新
   */
  flush() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this._apply();
  }

  /**
   * 计划应用更新
   */
  _scheduleApply() {
    if (this.timeoutId) return;
    
    this.timeoutId = setTimeout(() => {
      this._apply();
      this.timeoutId = null;
    }, this.delay);
  }

  /**
   * 应用所有待处理的更新
   */
  _apply() {
    if (this.pending.size === 0) return;
    
    const updates = new Map(this.pending);
    this.pending.clear();
    this.applyFn(updates);
  }
}

/**
 * 虚拟化列表帮助函数
 * 计算可见范围内的项目
 */
export function calculateVisibleRange(scrollTop, containerHeight, itemHeight, totalItems) {
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(
    Math.ceil((scrollTop + containerHeight) / itemHeight),
    totalItems
  );
  
  // 添加缓冲区，提前加载上下各5个项目
  const buffer = 5;
  return {
    start: Math.max(0, startIndex - buffer),
    end: Math.min(totalItems, endIndex + buffer),
    startOffset: Math.max(0, startIndex - buffer) * itemHeight,
    totalHeight: totalItems * itemHeight
  };
}

/**
 * 性能监控器
 */
export class PerformanceMonitor {
  constructor() {
    this.metrics = {
      renderTime: [],
      interactionTime: [],
      memoryUsage: []
    };
    this.maxSamples = 100;
  }

  /**
   * 记录渲染时间
   */
  recordRenderTime(time) {
    this._addSample('renderTime', time);
  }

  /**
   * 记录交互时间
   */
  recordInteractionTime(time) {
    this._addSample('interactionTime', time);
  }

  /**
   * 记录内存使用
   */
  recordMemoryUsage() {
    if (performance.memory) {
      this._addSample('memoryUsage', performance.memory.usedJSHeapSize / 1048576); // MB
    }
  }

  /**
   * 添加样本
   */
  _addSample(metric, value) {
    this.metrics[metric].push(value);
    if (this.metrics[metric].length > this.maxSamples) {
      this.metrics[metric].shift();
    }
  }

  /**
   * 获取统计信息
   */
  getStats() {
    const stats = {};
    for (const [metric, samples] of Object.entries(this.metrics)) {
      if (samples.length === 0) continue;
      
      const sorted = [...samples].sort((a, b) => a - b);
      stats[metric] = {
        avg: samples.reduce((a, b) => a + b, 0) / samples.length,
        min: sorted[0],
        max: sorted[sorted.length - 1],
        p50: sorted[Math.floor(sorted.length * 0.5)],
        p95: sorted[Math.floor(sorted.length * 0.95)],
        p99: sorted[Math.floor(sorted.length * 0.99)]
      };
    }
    return stats;
  }

  /**
   * 重置监控数据
   */
  reset() {
    for (const metric in this.metrics) {
      this.metrics[metric] = [];
    }
  }
}

/**
 * 懒加载图像组件辅助
 */
export class LazyImageLoader {
  constructor(options = {}) {
    this.threshold = options.threshold || 0.1;
    this.rootMargin = options.rootMargin || '50px';
    this.observer = null;
    this.callbacks = new Map();
  }

  /**
   * 观察元素
   */
  observe(element, callback) {
    if (!this.observer) {
      this.observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const cb = this.callbacks.get(entry.target);
              if (cb) {
                cb();
                this.unobserve(entry.target);
              }
            }
          });
        },
        {
          threshold: this.threshold,
          rootMargin: this.rootMargin
        }
      );
    }

    this.callbacks.set(element, callback);
    this.observer.observe(element);
  }

  /**
   * 停止观察元素
   */
  unobserve(element) {
    if (this.observer) {
      this.observer.unobserve(element);
      this.callbacks.delete(element);
    }
  }

  /**
   * 销毁观察器
   */
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
      this.callbacks.clear();
    }
  }
}

// 单例实例
export const imagePool = new ImageResourcePool();
export const performanceMonitor = new PerformanceMonitor();

// 导出默认实例
export default {
  IncrementalRenderEngine,
  ImageResourcePool,
  BatchUpdater,
  PerformanceMonitor,
  LazyImageLoader,
  imagePool,
  performanceMonitor,
  debounce,
  throttle,
  rafThrottle,
  calculateVisibleRange
};

