import api from './httpClient.js';

// Services
export const listServices = async (params = {}) => {
  const { data } = await api.get('/services', { params });
  return data.data || [];
};

export const createService = async (payload) => {
  const { data } = await api.post('/services', payload);
  return data.data;
};

export const updateService = async (id, payload) => {
  const { data } = await api.put(`/services/${id}`, payload);
  return data.data;
};

export const deleteService = async (id) => {
  await api.delete(`/services/${id}`);
};

export const setDefaultService = async (id) => {
  const { data } = await api.post(`/services/${id}/set-default`);
  return data.data;
};

export const healthCheckService = async (id) => {
  const { data } = await api.post(`/services/${id}/health-check`);
  return data.data;
};

// Workflows
export const listWorkflows = async () => {
  const { data } = await api.get('/comfy/workflows');
  return data.data || [];
};

export const uploadWorkflow = async (formData) => {
  const { data } = await api.post('/comfy/workflows', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return data.data;
};

export const updateWorkflow = async (id, payload) => {
  const { data } = await api.put(`/comfy/workflows/${id}`, payload);
  return data.data;
};

export const deleteWorkflow = async (id) => {
  await api.delete(`/comfy/workflows/${id}`);
};

export const getWorkflow = async (id) => {
  const { data } = await api.get(`/comfy/workflows/${id}`);
  return data.data;
};

// Resolve + Proxy
export const resolveEndpoint = async (preferEndpointId) => {
  const params = preferEndpointId ? { preferEndpointId } : {};
  const { data } = await api.get('/comfy/resolve-endpoint', { params });
  return data.data;
};

export const submitPrompt = async ({ preferEndpointId, payload }) => {
  const { data } = await api.post('/comfy/proxy/prompt', { preferEndpointId, payload });
  return data;
};

export default api;