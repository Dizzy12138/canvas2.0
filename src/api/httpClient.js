import axios from 'axios';

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || '/api';

// 简化的HTTP客户端配置
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 添加认证token
apiClient.interceptors.request.use(
  (config) => {
    // 从localStorage获取token
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 统一错误处理
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // 统一错误处理
    if (error.response?.status === 401) {
      // 未授权，清除token并重定向到登录页
      localStorage.removeItem('authToken');
      localStorage.removeItem('token');
      // 可以在这里添加重定向逻辑
    }
    
    // 格式化错误信息
    const errorMessage = error.response?.data?.message || 
                        error.response?.data?.error?.message || 
                        error.message || 
                        '请求失败';
    
    return Promise.reject({
      ...error,
      message: errorMessage,
    });
  }
);

export default apiClient;