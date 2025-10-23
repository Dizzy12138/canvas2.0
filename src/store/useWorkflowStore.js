import { create } from 'zustand';
import axios from 'axios';

const initialState = {
  workflowId: null,
  workflow: null,
  nodesTree: [],
  cascaderData: [],
  parameterLookup: {},
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
    nodesTree: data.nodesTree || [],
    cascaderData: data.cascaderData || [],
    parameterLookup: data.parameters || {},
  };
};

const useWorkflowStore = create((set, get) => ({
  ...initialState,

  uploadWorkflow: async (file) => {
    set({ loading: true, error: null });
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post('/api/comfy/workflows', formData, {
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
      const response = await axios.get(`/api/comfy/workflows/${workflowId}`);
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
}));

export default useWorkflowStore;
