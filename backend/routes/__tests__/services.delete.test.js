const express = require('express');
const request = require('supertest');

jest.mock('../../models/AIService', () => {
  const services = [];
  let nextId = 1;

  const find = jest.fn(async () => services);
  const findOne = jest.fn(async (cond) => services.find((s) => s.name === cond.name));
  const findById = jest.fn(async (id) => services.find((s) => s._id === id || s.id === id));
  const create = jest.fn(async (data) => {
    const newId = String(nextId++);
    const doc = {
      _id: newId,
      id: newId,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    services.push(doc);
    return doc;
  });
  const updateMany = jest.fn(async () => {});
  const deleteOne = jest.fn(async (cond) => {
    if (cond._id === undefined) {
      throw new Error('Expected deleteOne to be called with _id when MongoDB is enabled');
    }
    const id = String(cond._id);
    const index = services.findIndex((s) => s._id === id);
    if (index !== -1) {
      services.splice(index, 1);
    }
  });

  return {
    find,
    findOne,
    findById,
    create,
    updateMany,
    deleteOne,
    __reset: () => {
      services.length = 0;
      nextId = 1;
      find.mockClear();
      findOne.mockClear();
      findById.mockClear();
      create.mockClear();
      updateMany.mockClear();
      deleteOne.mockClear();
    },
  };
});

const servicesRouter = require('../services');
const AIService = require('../../models/AIService');

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/services', servicesRouter);
  return app;
};

describe('Services API deletion with MongoDB backing store', () => {
  const app = buildApp();

  beforeEach(() => {
    AIService.__reset();
    delete global.AIService;
  });

  it('creates and deletes a service using _id when MongoDB is enabled', async () => {
    const payload = {
      name: 'Mongo Backed Service',
      baseUrl: 'https://example.com',
      tags: ['test'],
      authMethod: 'none',
      apiKey: '',
      apiKeyHeader: 'Authorization',
      apiKeyQuery: 'api_key',
      isDefault: false,
      enabled: true,
      timeoutMs: 60000,
      healthPath: '/prompt',
      rps: 0,
    };

    const createRes = await request(app).post('/api/services').send(payload);
    expect(createRes.status).toBe(200);
    expect(createRes.body.success).toBe(true);

    const serviceId = createRes.body.data.id;

    const deleteRes = await request(app).delete(`/api/services/${serviceId}`);
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);

    expect(AIService.deleteOne).toHaveBeenCalledWith({ _id: serviceId });

    const found = await AIService.findById(serviceId);
    expect(found).toBeUndefined();
  });
});
