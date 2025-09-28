import { beforeAll, afterEach } from 'vitest';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
