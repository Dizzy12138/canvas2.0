import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const useAppBuilderStore = create(persist(
  (set, get) => ({
    components: [], // 画布中的所有 UI 组件
    uiBindings: {}, // UI 组件与工作流参数的绑定关系: { componentId: 'Node.Param' }
    paramsSchema: [], // 暴露给前端的参数结构，从 AppConfigForm 配置而来
    selectedComponent: null, // 当前选中的组件
    appId: null, // 当前应用的 ID
    appName: '', // 当前应用的名称

    // 初始化应用状态
    initApp: (appData) => set({
      appId: appData._id,
      appName: appData.name,
      components: appData.components || [],
      uiBindings: appData.uiBindings || {},
      paramsSchema: appData.paramsSchema || [],
    }),

    // 添加组件到画布
    addComponent: (component) => set((state) => ({
      components: [...state.components, { id: `comp_${Date.now()}`, ...component }],
    })),

    // 更新组件属性
    updateComponent: (id, updates) => set((state) => ({
      components: state.components.map((comp) =>
        comp.id === id ? { ...comp, ...updates } : comp
      ),
    })),

    // 移除组件
    removeComponent: (id) => set((state) => ({
      components: state.components.filter((comp) => comp.id !== id),
      uiBindings: Object.fromEntries(Object.entries(state.uiBindings).filter(([key, value]) => key !== id)),
    })),

    // 选中组件
    selectComponent: (component) => set({ selectedComponent: component }),
    
    // 清除选中组件
    clearSelection: () => set({ selectedComponent: null }),

    // 绑定 UI 组件到工作流参数
    bindComponentToWorkflowParam: (componentId, workflowParamPath) => set((state) => ({
      uiBindings: { ...state.uiBindings, [componentId]: workflowParamPath },
    })),

    // 解除绑定
    unbindComponentFromWorkflowParam: (componentId) => set((state) => {
      const newUiBindings = { ...state.uiBindings };
      delete newUiBindings[componentId];
      return { uiBindings: newUiBindings };
    }),

    // 设置暴露的参数结构 (从 AppConfigForm 传入)
    setParamsSchema: (schema) => set({ paramsSchema: schema }),

    // 清除所有状态
    clearAppBuilder: () => set({
      components: [],
      uiBindings: {},
      paramsSchema: [],
      selectedComponent: null,
      appId: null,
      appName: 
    }),

    // 获取某个组件的绑定信息
    getBindingForComponent: (componentId) => get().uiBindings[componentId],

  }),
  {
    name: 'app-builder-storage', // localstorage key
    storage: createJSONStorage(() => localStorage),
  }
));

export default useAppBuilderStore;
