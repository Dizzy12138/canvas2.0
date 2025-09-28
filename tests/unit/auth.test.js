import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import http from 'http';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serverProxyPath = path.resolve(__dirname, '../server.cjs');
const backendServerPath = path.resolve(__dirname, '../../backend/server.js');
const authRoutePath = path.resolve(__dirname, '../../backend/routes/auth.js');
const userModelPath = path.resolve(__dirname, '../../backend/models/User.js');

const createMockUserModel = () => {
  const users = [];

  const findOne = async (query) => {
    if (query.$or) {
      return users.find((user) =>
        query.$or.some((condition) =>
          Object.entries(condition).every(([key, value]) => user[key] === value)
        )
      ) || null;
    }

    return users.find((user) =>
      Object.entries(query).every(([key, value]) => user[key] === value)
    ) || null;
  };

  const create = async (data) => {
    const user = {
      _id: `${users.length + 1}`,
      username: data.username,
      email: data.email,
      password: data.password,
      avatar: null,
      subscription: {
        plan: 'free',
        usage: {
          daily_generations: 0,
          storage_used: 0
        },
        expires_at: null
      },
      getSignedJwtToken() {
        return 'test-token';
      },
      matchPassword: async (candidate) => candidate === data.password,
      save: async () => user
    };

    users.push(user);
    return user;
  };

  return {
    __users: users,
    findOne,
    create
  };
};

let app;
let testServer;

beforeEach(async () => {
  const mockUserModel = createMockUserModel();

  require.cache[userModelPath] = { exports: mockUserModel };
  delete require.cache[authRoutePath];
  delete require.cache[backendServerPath];
  delete require.cache[serverProxyPath];

  app = require('../server.cjs');
  testServer = http.createServer(app);

  await new Promise((resolve) => testServer.listen(0, resolve));
});

afterEach(async () => {
  if (testServer) {
    await new Promise((resolve) => testServer.close(resolve));
    testServer = undefined;
  }

  delete require.cache[userModelPath];
  delete require.cache[authRoutePath];
  delete require.cache[backendServerPath];
  delete require.cache[serverProxyPath];
});

describe('Auth API', () => {
  describe('POST /api/auth/register', () => {
    test('should register a new user', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      const { port } = testServer.address();
      const response = await fetch(`http://127.0.0.1:${port}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      expect(response.status).toBe(201);

      const body = await response.json();

      expect(body.success).toBe(true);
      expect(body.data.user.email).toBe(userData.email);
      expect(body.data.token).toBeDefined();
    });
  });
});
