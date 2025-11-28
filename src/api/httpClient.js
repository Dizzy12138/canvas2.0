import axios from 'axios';

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || '/api';

// 创建 axios 实例
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 动态导入 toast（避免循环依赖）
let toastModule = null;
const getToast = async () => {
  if (!toastModule) {
    toastModule = await import('../components/common/Toast.jsx');
  }
  return toastModule.default;
};

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    // 添加认证 token
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // 添加请求ID用于追踪
    config.headers['X-Request-ID'] = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 增强的错误处理
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const { response, config } = error;
    const toast = await getToast();
    
    // 网络错误
    if (!response) {
      toast.error('网络连接失败', '请检查您的网络连接');
      return Promise.reject(error);
    }
    
    const { status } = response;
    
    // 根据状态码处理
    switch (status) {
      case 401:
        // 未认证
        localStorage.removeItem('authToken');
        localStorage.removeItem('token');
        toast.error('认证失败', '请重新登录');
        setTimeout(() => {
          window.location.href = '/login';
        }, 1500);
        break;
        
      case 403:
        // 无权限
        toast.error('无权限', '您没有权限执行此操作');
        break;
        
      case 404:
        // 资源不存在
        toast.error('资源不存在', '请求的资源未找到');
        break;
        
      case 429:
        // 请求过于频繁
        toast.warning('请求过于频繁', '请稍后再试');
        
        // 实现退避重试
        if (!config._retryCount || config._retryCount < 3) {
          config._retryCount = (config._retryCount || 0) + 1;
          const delay = 1000 * config._retryCount;
          
          await new Promise(resolve => setTimeout(resolve, delay));
          return apiClient.request(config);
        }
        break;
        
      case 500:
      case 502:
      case 503:
      case 504:
        // 服务器错误
        toast.error('服务器错误', '服务暂时不可用，请稍后重试');
        break;
        
      default:
        // 其他错误
        const errorMessage = response.data?.message || 
                           response.data?.error?.message || 
                           '操作失败，请重试';
        toast.error('操作失败', errorMessage);
    }
    
    // 格式化错误信息
    const enhancedError = {
      ...error,
      message: response.data?.message || 
               response.data?.error?.message || 
               error.message || 
               '请求失败',
      status: status,
      statusText: response.statusText
    };
    
    return Promise.reject(enhancedError);
  }
);

export default apiClient;