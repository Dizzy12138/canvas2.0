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
const appsRoutePath = path.resolve(__dirname, '../../backend/routes/apps.js');
const appModelPath = path.resolve(__dirname, '../../backend/models/App.js');

const createMockAppModel = () => {
  const apps = new Map();

  class MockApp {
    constructor(data = {}) {
      this._id = data._id || data.id || `app_${apps.size + 1}`;
      Object.assign(this, data, { _id: this._id });
    }

    async save() {
      apps.set(this._id, { ...this });
      return this;
    }

    toJSON() {
      return { ...this };
    }
  }

  MockApp.__apps = apps;

  MockApp.__seed = (data = {}) => {
    const record = {
      _id: data._id || data.id || `app_${apps.size + 1}`,
      ...data
    };
    apps.set(record._id, record);
    return record;
  };

  MockApp.findByIdAndUpdate = async (id, updates) => {
    const existing = apps.get(id);
    if (!existing) {
      return null;
    }

    const updated = { ...existing, ...updates };
    apps.set(id, updated);
    return updated;
  };

  MockApp.findById = async (id) => apps.get(id) || null;

  MockApp.findOne = async (query = {}) => {
    for (const app of apps.values()) {
      if (Object.entries(query).every(([key, value]) => app[key] === value)) {
        return app;
      }
    }
    return null;
  };

  MockApp.find = async () => Array.from(apps.values());

  MockApp.countDocuments = async () => apps.size;

  return MockApp;
};

let app;
let testServer;
let mockAppModel;

beforeEach(async () => {
  mockAppModel = createMockAppModel();
  mockAppModel.__seed({
    _id: 'app123',
    name: 'Existing App',
    workflowId: 'wf_1',
    workflowVersion: 1,
    timeoutSec: 60,
    enableCache: false
  });

  require.cache[appModelPath] = { exports: mockAppModel };
  delete require.cache[appsRoutePath];
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

  delete require.cache[appModelPath];
  delete require.cache[appsRoutePath];
  delete require.cache[backendServerPath];
  delete require.cache[serverProxyPath];
});

describe('Apps API', () => {
  test('PATCH /api/apps/:id updates an existing app', async () => {
    const { port } = testServer.address();
    const response = await fetch(`http://127.0.0.1:${port}/api/apps/app123`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        timeoutSec: 120,
        enableCache: true
      })
    });

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body.timeoutSec).toBe(120);
    expect(body.enableCache).toBe(true);

    const storedApp = mockAppModel.__apps.get('app123');
    expect(storedApp.timeoutSec).toBe(120);
    expect(storedApp.enableCache).toBe(true);
  });
});

