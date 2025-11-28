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
  outputNodes: [],
  timeout: 300,
  appData: null, // 完整的应用数据
};

const asPlainObject = (value) =>
  value && typeof value === 'object' && !Array.isArray(value) ? value : {};

const normalizeComponent = (component = {}, fallbackOrder = 0) => {
  const legacyDefaults = asPlainObject(component.defaultProps);
  const incomingProps = asPlainObject(component.properties);
  const mergedProperties = { ...legacyDefaults, ...incomingProps };

  const normalized = {
    ...component,
    properties: mergedProperties,
  };

  if (!normalized.id) {
    normalized.id = `comp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  normalized.label =
    normalized.label ||
    mergedProperties.title ||
    normalized.name ||
    normalized.title ||
    normalized.type ||
    '未命名组件';

  normalized.name = normalized.name || normalized.label;
  normalized.paramName =
    normalized.paramName ||
    mergedProperties.paramName ||
    mergedProperties.paramKey ||
    component.paramKey;

  const defaultValue =
    normalized.defaultValue ??
    mergedProperties.defaultValue ??
    legacyDefaults.defaultValue;

  if (defaultValue !== undefined) {
    normalized.defaultValue = defaultValue;
  }

  normalized.order =
    typeof normalized.order === 'number' ? normalized.order : fallbackOrder;

  normalized.properties = {
    ...normalized.properties,
    title: normalized.properties.title || normalized.label,
    paramName: normalized.paramName || normalized.properties.paramName,
    paramKey: normalized.paramName || normalized.properties.paramKey,
    defaultValue:
      normalized.defaultValue !== undefined
        ? normalized.defaultValue
        : normalized.properties.defaultValue,
  };

  if (normalized.defaultProps) {
    delete normalized.defaultProps;
  }

  return normalized;
};

const normalizeComponents = (components = []) =>
  Array.isArray(components)
    ? components.map((comp, idx) => normalizeComponent(comp, idx))
    : [];

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
          components: normalizeComponents(appData.components),
          uiBindings: normaliseBindings(appData.uiBindings),
          paramsSchema: appData.paramsSchema || [],
          workflowId: appData.workflowId || null,
          outputNodes: appData.outputNodes || [],
          timeout: appData.timeout || 300,
          appData: appData, // 保存完整的应用数据
        });
      },

      setAppId: (appId) => set({ appId }),
      setAppName: (name) => set({ appName: name }),
      setWorkflowId: (workflowId) => set({ workflowId }),
      setOutputNodes: (outputNodes) => set({ outputNodes }),
      setTimeout: (timeout) => set({ timeout }),

      addComponent: (component = {}) =>
        set((state) => {
          const base = {
            id: component.id || `comp_${Date.now()}`,
            x: component.x || 40,
            y: component.y || 40,
            width: component.width || 240,
            height: component.height || 120,
            type: component.type,
            name: component.name,
            label: component.label,
            properties: component.properties || {},
            order:
              component.order !== undefined
                ? component.order
                : state.components.length,
            boundNodeId: component.boundNodeId,
            boundNodeName: component.boundNodeName,
            boundNodeType: component.boundNodeType,
            boundParamPath: component.boundParamPath,
            boundParamType: component.boundParamType,
            boundParamLabel: component.boundParamLabel,
            paramName: component.paramName,
            defaultValue: component.defaultValue,
          };
          return {
            components: [
              ...state.components,
              normalizeComponent(base, state.components.length),
            ],
          };
        }),

      updateComponent: (id, updates = {}) =>
        set((state) => ({
          components: state.components.map((comp, index) => {
            if (comp.id !== id) return comp;

            const next = { ...comp };

            if (updates.properties) {
              next.properties = {
                ...asPlainObject(comp.properties),
                ...asPlainObject(updates.properties),
              };
            }

            Object.keys(updates).forEach((key) => {
              if (key === 'properties') return;
              next[key] = updates[key];
            });

            return normalizeComponent(next, index);
          }),
        })),

      setComponents: (components) =>
        set({ components: normalizeComponents(components) }),

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
        outputNodes: state.outputNodes,
        timeout: state.timeout,
        appData: state.appData,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          if (Array.isArray(state.components)) {
            state.components = normalizeComponents(state.components);
          }
          if (state.uiBindings) {
            state.uiBindings = normaliseBindings(state.uiBindings);
          }
        }
      },
    },
  ),
);

export default useAppBuilderStore;
