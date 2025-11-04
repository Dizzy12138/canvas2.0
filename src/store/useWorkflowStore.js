import { create } from 'zustand';
import apiClient from '@/api/httpClient';

const initialState = {
  workflowId: null,
  workflow: null,
  nodesTree: [],
  cascaderData: [],
  parameterLookup: {},
  outputNodes: [],
  loading: false,
  error: null,
};

const normaliseWorkflowResponse = (data) => {
  if (!data) {
    return initialState;
  }

  return {
    workflowId: data.workflowId || data.workflow_id || null,
    workflow: data.rawWorkflow || null,
    nodesTree: Array.isArray(data.nodesTree) ? data.nodesTree : [],
    cascaderData: Array.isArray(data.cascaderData) ? data.cascaderData : [],
    parameterLookup: data.parameters || {},
    outputNodes: Array.isArray(data.outputNodes) ? data.outputNodes : [],
  };
};

const useWorkflowStore = create((set, get) => ({
  ...initialState,

  uploadWorkflow: async (file) => {
    set({ loading: true, error: null });
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiClient.post('/comfy/workflows', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const data = response.data?.data;
      const normalised = normaliseWorkflowResponse(data);

      set({
        ...normalised,
        loading: false,
      });

      return normalised;
    } catch (error) {
      console.error('Error uploading workflow:', error);
      set({
        loading: false,
        error: error.response?.data?.message || error.message || '上传失败',
      });
      throw error;
    }
  },

  fetchWorkflow: async (workflowId) => {
    if (!workflowId) return null;
    set({ loading: true, error: null });
    try {
      const response = await apiClient.get(`/comfy/workflows/${workflowId}`);
      const data = response.data?.data;
      const normalised = normaliseWorkflowResponse(data);

      set({
        ...normalised,
        loading: false,
      });

      return normalised;
    } catch (error) {
      console.error('Error fetching workflow:', error);
      set({
        loading: false,
        error: error.response?.data?.message || error.message || '获取失败',
      });
      throw error;
    }
  },

  clearWorkflow: () => set({ ...initialState }),

  validateBindings: async (bindings) => {
    const { workflowId } = get();
    if (!workflowId || !bindings) return null;
    
    try {
      const response = await apiClient.post(`/comfy/workflows/${workflowId}/validate-bindings`, {
        bindings
      });
      return response.data?.data;
    } catch (error) {
      console.error('Error validating bindings:', error);
      throw error;
    }
  },

  getParameterSuggestions: async (componentType) => {
    const { workflowId } = get();
    if (!workflowId || !componentType) return [];
    
    try {
      const response = await apiClient.get(`/comfy/workflows/${workflowId}/suggestions/${componentType}`);
      return response.data?.data || [];
    } catch (error) {
      console.error('Error getting parameter suggestions:', error);
      return [];
    }
  },
}));

export default useWorkflowStore;
