import axios from 'axios';

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || '/api';

const TOKEN_STORAGE_KEYS = [
  'token',
  'authToken',
  'auth_token',
  'jwt',
  'jwtToken',
  'accessToken',
  'canvas_token',
  'canvasToken',
];

const WINDOW_TOKEN_KEYS = [
  '__CANVAS_TOKEN__',
  '__APP_TOKEN__',
  '__JWT_TOKEN__',
  '__AUTH_TOKEN__',
  '__CANVAS_AUTH__',
];

const ensureBearerPrefix = (token) => {
  if (!token) return token;
  return token.startsWith('Bearer ') ? token : `Bearer ${token}`;
};

const readFromStorage = (storage) => {
  if (!storage) return null;
  for (const key of TOKEN_STORAGE_KEYS) {
    try {
      const value = storage.getItem(key);
      if (value) {
        return value;
      }
    } catch (_) {
      // ignore storage access errors (e.g. security restrictions)
    }
  }
  return null;
};

const readFromWindow = () => {
  if (typeof window === 'undefined') return null;
  for (const key of WINDOW_TOKEN_KEYS) {
    const value = window[key];
    if (typeof value === 'string' && value) {
      return value;
    }
    if (value && typeof value === 'object' && typeof value.token === 'string') {
      return value.token;
    }
  }
  return null;
};

export const resolveAuthToken = () => {
  const envToken = import.meta.env?.VITE_API_TOKEN || import.meta.env?.VITE_AUTH_TOKEN;
  if (envToken) {
    return envToken;
  }

  if (typeof window !== 'undefined') {
    const localToken = readFromStorage(window.localStorage);
    if (localToken) {
      return localToken;
    }

    const sessionToken = readFromStorage(window.sessionStorage);
    if (sessionToken) {
      return sessionToken;
    }
  }

  return readFromWindow();
};

const attachAuthHeader = (config) => {
  const token = resolveAuthToken();
  if (token) {
    config.headers = config.headers || {};
    if (!config.headers.Authorization) {
      config.headers.Authorization = ensureBearerPrefix(token);
    }
  }
  return config;
};

const configureClient = (client) => {
  if (client.__canvasAuthConfigured) {
    return client;
  }

  client.interceptors.request.use(attachAuthHeader, (error) => Promise.reject(error));

  Object.defineProperty(client, '__canvasAuthConfigured', {
    value: true,
    enumerable: false,
    configurable: false,
    writable: false,
  });

  return client;
};

const apiClient = configureClient(
  axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
  }),
);

axios.defaults.baseURL = API_BASE_URL;
axios.defaults.withCredentials = true;
configureClient(axios);

export default apiClient;
