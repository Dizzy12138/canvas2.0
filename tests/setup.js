import '@testing-library/jest-dom/vitest';
import { beforeAll, afterEach, vi } from 'vitest';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const Module = require('module');
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const canvasMockPath = path.resolve(__dirname, './mocks/canvas.js');
const canvasMock = require(canvasMockPath);

vi.mock('canvas', () => canvasMock);
vi.mock('fabric', () => ({ fabric: {} }));

const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  if (request === 'canvas') {
    return canvasMockPath;
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
});

// 清理require缓存，避免测试之间的状态污染
const modulesToClear = [
  path.resolve(__dirname, './server.cjs'),
  path.resolve(__dirname, '../backend/server.js'),
  path.resolve(__dirname, '../backend/routes/auth.js'),
  path.resolve(__dirname, '../backend/models/User.js')
];

afterEach(() => {
  for (const modulePath of modulesToClear) {
    delete require.cache[modulePath];
  }
});
