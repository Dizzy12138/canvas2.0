import { create } from 'zustand';
import axios from 'axios';

const useWorkflowStore = create((set) => ({
  workflow: null, // 存储原始工作流JSON
  nodesTree: [], // 存储解析后的节点树
  cascaderData: [], // 存储前端 Cascader 数据
  loading: false,
  error: null,

  // 上传并解析工作流
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
      const { data } = response.data;
      set({
        workflow: data.rawWorkflow,
        nodesTree: data.nodesTree,
        cascaderData: data.cascaderData,
        loading: false,
      });
      return data;
    } catch (error) {
      console.error('Error uploading workflow:', error);
      set({ loading: false, error: error.response?.data?.message || error.message });
      throw error;
    }
  },

  // 根据 workflowId 获取工作流详情
  fetchWorkflow: async (workflowId) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.get(`/api/comfy/workflows/${workflowId}`);
      const { data } = response.data;
      set({
        workflow: data.rawWorkflow,
        nodesTree: data.nodesTree,
        cascaderData: data.cascaderData,
        loading: false,
      });
      return data;
    } catch (error) {
      console.error('Error fetching workflow:', error);
      set({ loading: false, error: error.response?.data?.message || error.message });
      throw error;
    }
  },

  // 清除工作流状态
  clearWorkflow: () => set({ workflow: null, nodesTree: [], cascaderData: [], error: null }),
}));

export default useWorkflowStore;
