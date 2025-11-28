/**
 * 画布状态管理 Store
 * V2.0 优化版本 - 使用 Zustand 进行高效状态管理
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

/**
 * 画布主 Store
 */
export const useCanvasStore = create(
  devtools(
    immer((set, get) => ({
      // ========== 基础状态 ==========
      projectName: '未命名项目',
      isInitialized: false,
      isLoading: false,
      error: null,

      // ========== 画布状态 ==========
      // 频繁更新的状态
      cursor: { x: 0, y: 0 },
      zoom: 1,
      pan: { x: 0, y: 0 },
      canvasSize: { width: 0, height: 0 },

      // 工具和模式
      activeTool: 'select',
      drawingMode: false,
      selectionMode: 'single',

      // 画笔设置
      brushSettings: {
        size: 5,
        color: '#000000',
        opacity: 1,
        hardness: 1
      },

      // ========== 图层状态 ==========
      // 注意：图层数据仍然使用 useEnhancedLayers hook 管理
      // 这里只存储UI相关的状态
      activeLayerId: null,
      selectedLayerIds: new Set(),
      expandedGroupIds: new Set(),
      layerPanelCollapsed: false,

      // ========== AI 生成状态 ==========
      isGenerating: false,
      generationProgress: 0,
      generatedImages: [],
      generationHistory: [],

      // ========== UI 状态 ==========
      leftPanelCollapsed: false,
      rightPanelCollapsed: false,
      showGrid: false,
      showRulers: false,
      snapToGrid: false,
      gridSize: 20,

      // ========== 选择和变换 ==========
      selectedObjects: [],
      selectionBounds: null,
      transformMode: null,

      // ========== Actions ==========
      
      // 项目管理
      setProjectName: (name) => set({ projectName: name }),
      
      setInitialized: (initialized) => set({ isInitialized: initialized }),
      
      setLoading: (loading) => set({ isLoading: loading }),
      
      setError: (error) => set({ error }),

      // 画布操作
      updateCursor: (cursor) => set({ cursor }),
      
      setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(10, zoom)) }),
      
      zoomIn: () => set((state) => ({ 
        zoom: Math.min(10, state.zoom * 1.2) 
      })),
      
      zoomOut: () => set((state) => ({ 
        zoom: Math.max(0.1, state.zoom / 1.2) 
      })),
      
      zoomReset: () => set({ zoom: 1 }),
      
      setPan: (pan) => set({ pan }),
      
      setCanvasSize: (size) => set({ canvasSize: size }),

      // 工具切换
      setActiveTool: (tool) => set({ activeTool: tool }),
      
      setDrawingMode: (mode) => set({ drawingMode: mode }),
      
      setSelectionMode: (mode) => set({ selectionMode: mode }),

      // 画笔设置
      setBrushSize: (size) => set((state) => ({
        brushSettings: { ...state.brushSettings, size }
      })),
      
      setBrushColor: (color) => set((state) => ({
        brushSettings: { ...state.brushSettings, color }
      })),
      
      setBrushOpacity: (opacity) => set((state) => ({
        brushSettings: { ...state.brushSettings, opacity }
      })),
      
      updateBrushSettings: (settings) => set((state) => ({
        brushSettings: { ...state.brushSettings, ...settings }
      })),

      // 图层UI状态
      setActiveLayerId: (id) => set({ activeLayerId: id }),
      
      setSelectedLayerIds: (ids) => set({ 
        selectedLayerIds: new Set(ids) 
      }),
      
      toggleLayerSelection: (id) => set((state) => {
        const newSet = new Set(state.selectedLayerIds);
        if (newSet.has(id)) {
          newSet.delete(id);
        } else {
          newSet.add(id);
        }
        return { selectedLayerIds: newSet };
      }),
      
      clearLayerSelection: () => set({ selectedLayerIds: new Set() }),
      
      toggleGroupExpanded: (id) => set((state) => {
        const newSet = new Set(state.expandedGroupIds);
        if (newSet.has(id)) {
          newSet.delete(id);
        } else {
          newSet.add(id);
        }
        return { expandedGroupIds: newSet };
      }),

      // AI 生成
      setGenerating: (generating) => set({ isGenerating: generating }),
      
      setGenerationProgress: (progress) => set({ generationProgress: progress }),
      
      addGeneratedImage: (image) => set((state) => ({
        generatedImages: [...state.generatedImages, image]
      })),
      
      clearGeneratedImages: () => set({ generatedImages: [] }),
      
      addToHistory: (entry) => set((state) => ({
        generationHistory: [entry, ...state.generationHistory].slice(0, 50)
      })),

      // UI 切换
      toggleLeftPanel: () => set((state) => ({
        leftPanelCollapsed: !state.leftPanelCollapsed
      })),
      
      toggleRightPanel: () => set((state) => ({
        rightPanelCollapsed: !state.rightPanelCollapsed
      })),
      
      toggleGrid: () => set((state) => ({
        showGrid: !state.showGrid
      })),
      
      toggleRulers: () => set((state) => ({
        showRulers: !state.showRulers
      })),
      
      toggleSnapToGrid: () => set((state) => ({
        snapToGrid: !state.snapToGrid
      })),
      
      setGridSize: (size) => set({ gridSize: size }),

      // 选择和变换
      setSelectedObjects: (objects) => set({ selectedObjects: objects }),
      
      setSelectionBounds: (bounds) => set({ selectionBounds: bounds }),
      
      setTransformMode: (mode) => set({ transformMode: mode }),

      // 批量更新（优化性能）
      batchUpdate: (updates) => set(updates),

      // 重置状态
      reset: () => set({
        cursor: { x: 0, y: 0 },
        zoom: 1,
        pan: { x: 0, y: 0 },
        activeTool: 'select',
        selectedLayerIds: new Set(),
        generatedImages: [],
        error: null
      })
    })),
    {
      name: 'canvas-store',
      enabled: process.env.NODE_ENV === 'development'
    }
  )
);

/**
 * Selectors - 优化性能，避免不必要的重渲染
 */

// 基础选择器
export const useProjectName = () => useCanvasStore((state) => state.projectName);
export const useIsLoading = () => useCanvasStore((state) => state.isLoading);
export const useError = () => useCanvasStore((state) => state.error);

// 画布选择器
export const useCursor = () => useCanvasStore((state) => state.cursor);
export const useZoom = () => useCanvasStore((state) => state.zoom);
export const usePan = () => useCanvasStore((state) => state.pan);
export const useCanvasSize = () => useCanvasStore((state) => state.canvasSize);

// 工具选择器
export const useActiveTool = () => useCanvasStore((state) => state.activeTool);
export const useBrushSettings = () => useCanvasStore((state) => state.brushSettings);

// 图层选择器
export const useActiveLayerId = () => useCanvasStore((state) => state.activeLayerId);
export const useSelectedLayerIds = () => useCanvasStore((state) => state.selectedLayerIds);

// AI 选择器
export const useIsGenerating = () => useCanvasStore((state) => state.isGenerating);
export const useGeneratedImages = () => useCanvasStore((state) => state.generatedImages);

// UI 选择器
export const useLeftPanelCollapsed = () => useCanvasStore((state) => state.leftPanelCollapsed);
export const useRightPanelCollapsed = () => useCanvasStore((state) => state.rightPanelCollapsed);
export const useGridSettings = () => useCanvasStore((state) => ({
  showGrid: state.showGrid,
  showRulers: state.showRulers,
  snapToGrid: state.snapToGrid,
  gridSize: state.gridSize
}));

/**
 * 历史记录 Store (分离频繁操作)
 */
export const useHistoryStore = create((set, get) => ({
  history: [],
  currentIndex: -1,
  maxHistory: 50,

  canUndo: () => get().currentIndex > 0,
  
  canRedo: () => {
    const { currentIndex, history } = get();
    return currentIndex < history.length - 1;
  },

  addHistory: (state) => set((current) => {
    const newHistory = current.history.slice(0, current.currentIndex + 1);
    newHistory.push(state);
    
    // 限制历史记录数量
    if (newHistory.length > current.maxHistory) {
      newHistory.shift();
    }
    
    return {
      history: newHistory,
      currentIndex: newHistory.length - 1
    };
  }),

  undo: () => set((state) => {
    if (state.currentIndex > 0) {
      return { currentIndex: state.currentIndex - 1 };
    }
    return state;
  }),

  redo: () => set((state) => {
    if (state.currentIndex < state.history.length - 1) {
      return { currentIndex: state.currentIndex + 1 };
    }
    return state;
  }),

  getCurrentState: () => {
    const { history, currentIndex } = get();
    return history[currentIndex];
  },

  clear: () => set({ history: [], currentIndex: -1 })
}));

/**
 * 工具函数
 */

// 创建浅比较选择器
export function createShallowSelector(selector) {
  return (state) => {
    const selected = selector(state);
    return selected;
  };
}

// 创建深比较选择器
export function createDeepSelector(selector) {
  let lastResult;
  let lastArgs;
  
  return (state) => {
    const args = selector(state);
    if (JSON.stringify(args) !== JSON.stringify(lastArgs)) {
      lastArgs = args;
      lastResult = args;
    }
    return lastResult;
  };
}

export default useCanvasStore;

