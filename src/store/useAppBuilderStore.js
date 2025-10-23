import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const defaultState = {
  components: [],
  uiBindings: [],
  paramsSchema: [],
  selectedComponent: null,
  appId: null,
  appName: '',
  workflowId: null,
};

const normaliseBindings = (bindings = []) => {
  if (Array.isArray(bindings)) {
    return bindings
      .filter((binding) => binding && binding.componentId && binding.bindTo)
      .map((binding) => ({
        componentId: binding.componentId,
        bindTo: binding.bindTo,
        componentType: binding.componentType,
        label: binding.label,
      }));
  }

  return Object.entries(bindings || {})
    .filter(([componentId, bindTo]) => componentId && bindTo)
    .map(([componentId, bindTo]) => ({ componentId, bindTo }));
};

const useAppBuilderStore = create(
  persist(
    (set, get) => ({
      ...defaultState,

      initApp: (appData = {}) => {
        set({
          appId: appData._id || appData.id || null,
          appName: appData.name || '',
          components: appData.components || [],
          uiBindings: normaliseBindings(appData.uiBindings),
          paramsSchema: appData.paramsSchema || [],
          workflowId: appData.workflowId || null,
        });
      },

      setAppId: (appId) => set({ appId }),
      setAppName: (name) => set({ appName: name }),
      setWorkflowId: (workflowId) => set({ workflowId }),

      addComponent: (component) =>
        set((state) => ({
          components: [
            ...state.components,
            {
              id: component.id || `comp_${Date.now()}`,
              x: component.x || 40,
              y: component.y || 40,
              width: component.width || 240,
              height: component.height || 120,
              defaultProps: component.defaultProps || {},
              type: component.type,
              name: component.name,
            },
          ],
        })),

      updateComponent: (id, updates) =>
        set((state) => ({
          components: state.components.map((comp) =>
            comp.id === id ? { ...comp, ...updates } : comp,
          ),
        })),

      setComponents: (components) => set({ components }),

      removeComponent: (id) =>
        set((state) => ({
          components: state.components.filter((comp) => comp.id !== id),
          uiBindings: state.uiBindings.filter((binding) => binding.componentId !== id),
          selectedComponent:
            state.selectedComponent?.id === id ? null : state.selectedComponent,
        })),

      selectComponent: (component) => set({ selectedComponent: component }),
      clearSelection: () => set({ selectedComponent: null }),

      bindComponentToWorkflowParam: (componentId, bindTo) =>
        set((state) => {
          const nextBindings = [...state.uiBindings];
          const existingIndex = nextBindings.findIndex(
            (binding) => binding.componentId === componentId,
          );

          if (!bindTo) {
            if (existingIndex >= 0) {
              nextBindings.splice(existingIndex, 1);
            }
            return { uiBindings: nextBindings };
          }

          const binding = {
            componentId,
            bindTo,
            componentType:
              state.components.find((comp) => comp.id === componentId)?.type,
          };

          if (existingIndex >= 0) {
            nextBindings[existingIndex] = { ...nextBindings[existingIndex], ...binding };
          } else {
            nextBindings.push(binding);
          }

          return { uiBindings: nextBindings };
        }),

      unbindComponentFromWorkflowParam: (componentId) =>
        set((state) => ({
          uiBindings: state.uiBindings.filter(
            (binding) => binding.componentId !== componentId,
          ),
        })),

      getBindingForComponent: (componentId) =>
        get().uiBindings.find((binding) => binding.componentId === componentId)?.bindTo,

      setUiBindings: (bindings) => set({ uiBindings: normaliseBindings(bindings) }),

      setParamsSchema: (schema) => set({ paramsSchema: schema || [] }),

      clearAppBuilder: () => set({ ...defaultState }),
    }),
    {
      name: 'app-builder-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        components: state.components,
        uiBindings: state.uiBindings,
        paramsSchema: state.paramsSchema,
        appId: state.appId,
        appName: state.appName,
        workflowId: state.workflowId,
      }),
    },
  ),
);

export default useAppBuilderStore;
