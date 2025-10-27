import axios from 'axios';

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || '/api';

const TOKEN_STORAGE_KEYS = [
  'token',
  'authToken',
  'auth_token',
  'jwt',
  'jwtToken',
  'accessToken',
  'access_token',
  'canvas_token',
  'canvasToken',
  'canvasUser',
  'user',
  'userInfo',
];

const TOKEN_VALUE_KEYS = [
  'token',
  'accessToken',
  'access_token',
  'authToken',
  'auth_token',
  'jwt',
  'jwtToken',
  'value',
];

const WINDOW_TOKEN_KEYS = [
  '__CANVAS_TOKEN__',
  '__APP_TOKEN__',
  '__JWT_TOKEN__',
  '__AUTH_TOKEN__',
  '__CANVAS_AUTH__',
];

const COOKIE_TOKEN_KEYS = [
  'token',
  'authToken',
  'auth_token',
  'accessToken',
  'access_token',
  'jwt',
  'jwtToken',
  'canvas_token',
  'canvasToken',
];

const isLikelyJwt = (value) => {
  if (typeof value !== 'string') return false;
  const token = value.trim().replace(/^Bearer\s+/i, '');
  return token.split('.').length === 3;
};

const tryParseJson = (value) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch (_) {
    return null;
  }
};

const findTokenInObject = (obj, depth = 0) => {
  if (!obj || typeof obj !== 'object' || depth > 2) return null;

  for (const key of TOKEN_VALUE_KEYS) {
    const value = obj[key];
    if (typeof value === 'string' && value) {
      return value;
    }
  }

  for (const value of Object.values(obj)) {
    if (typeof value === 'string' && isLikelyJwt(value)) {
      return value;
    }
    if (typeof value === 'object') {
      const nested = findTokenInObject(value, depth + 1);
      if (nested) {
        return nested;
      }
    }
  }

  return null;
};

const extractToken = (raw) => {
  if (!raw) return null;

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return null;

    if (trimmed.startsWith('{') || trimmed.startsWith('[') || trimmed.startsWith('"')) {
      const parsed = tryParseJson(trimmed);
      if (parsed) {
        return extractToken(parsed);
      }
    }

    if (trimmed.startsWith('Bearer ')) {
      return trimmed;
    }

    if (isLikelyJwt(trimmed)) {
      return trimmed;
    }

    if (/token=/i.test(trimmed)) {
      const match = trimmed.match(/token=([^&;]+)/i);
      if (match?.[1]) {
        return match[1];
      }
    }

    return null;
  }

  if (typeof raw === 'object') {
    return findTokenInObject(raw);
  }

  return null;
};

const safeGetStorageItem = (storage, key) => {
  try {
    return storage.getItem(key);
  } catch (_) {
    return null;
  }
};

const ensureBearerPrefix = (token) => {
  if (!token) return token;
  return token.startsWith('Bearer ') ? token : `Bearer ${token}`;
};

const readFromStorage = (storage) => {
  if (!storage) return null;
  for (const key of TOKEN_STORAGE_KEYS) {
    const candidate = extractToken(safeGetStorageItem(storage, key));
    if (candidate) {
      return candidate;
    }
  }

  // Fallback: inspect all keys to support unknown storage names
  if (typeof storage.length === 'number' && storage.length > 0) {
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (!key) continue;
      const candidate = extractToken(safeGetStorageItem(storage, key));
      if (candidate) {
        return candidate;
      }
    }
  }
  return null;
};

const readFromWindow = () => {
  if (typeof window === 'undefined') return null;
  for (const key of WINDOW_TOKEN_KEYS) {
    const value = window[key];
    const candidate = extractToken(value);
    if (candidate) {
      return candidate;
    }
  }
  return null;
};

const readFromCookies = () => {
  if (typeof document === 'undefined' || typeof document.cookie !== 'string') {
    return null;
  }

  const cookies = document.cookie.split(';');
  for (const rawCookie of cookies) {
    const [name, ...rest] = rawCookie.split('=');
    if (!name) continue;
    const trimmedName = name.trim();
    const value = rest.join('=').trim();
    if (!value) continue;

    if (COOKIE_TOKEN_KEYS.includes(trimmedName)) {
      const candidate = extractToken(value);
      if (candidate) {
        return candidate;
      }
    }

    if (isLikelyJwt(value)) {
      return value;
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

  const windowToken = readFromWindow();
  if (windowToken) {
    return windowToken;
  }

  return readFromCookies();
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
