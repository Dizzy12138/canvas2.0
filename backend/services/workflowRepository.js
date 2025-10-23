const mongoose = require('mongoose');
const WorkflowFile = require('../models/WorkflowFile');

const inMemoryStore = [];

const isDbConnected = () => mongoose.connection && mongoose.connection.readyState === 1;

const clone = (data) => {
  if (!data) return data;
  if (typeof data.toObject === 'function') {
    return data.toObject();
  }
  return JSON.parse(JSON.stringify(data));
};

const ensureIdentifiers = (record) => {
  const now = new Date();
  const doc = { ...record };
  if (!doc._id) {
    doc._id = new mongoose.Types.ObjectId().toString();
  } else if (typeof doc._id !== 'string') {
    doc._id = doc._id.toString();
  }
  doc.createdAt = doc.createdAt ? new Date(doc.createdAt) : now;
  doc.updatedAt = now;
  return doc;
};

const matches = (record, cond = {}) => {
  return Object.entries(cond).every(([key, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if (value.$ne !== undefined) {
        return record[key] !== value.$ne;
      }
      if (value.$in) {
        return value.$in.includes(record[key]);
      }
      if (value.$regex) {
        const regex = value.$regex instanceof RegExp
          ? value.$regex
          : new RegExp(value.$regex, value.$options || '');
        return regex.test(record[key] || '');
      }
    }
    return record[key] === value;
  });
};

const findInMemory = (cond = {}) => {
  return inMemoryStore.filter((record) => matches(record, cond)).map((record) => ({ ...record }));
};

const findOneInMemory = (cond = {}) => {
  const found = inMemoryStore.find((record) => matches(record, cond));
  return found ? { ...found } : null;
};

const updateInMemory = (id, updates) => {
  const index = inMemoryStore.findIndex((record) => record._id === id);
  if (index === -1) {
    return null;
  }
  const updated = {
    ...inMemoryStore[index],
    ...updates,
    updatedAt: new Date(),
  };
  inMemoryStore[index] = updated;
  return { ...updated };
};

const createInMemory = (data) => {
  const record = ensureIdentifiers(data);
  if (record.version === undefined || record.version === null) {
    record.version = 1;
  }
  inMemoryStore.push(record);
  return { ...record };
};

const workflowRepository = {
  async findAll() {
    if (isDbConnected()) {
      return WorkflowFile.find({}).lean();
    }
    return findInMemory();
  },

  async findByChecksum(checksum) {
    if (!checksum) return null;
    if (isDbConnected()) {
      const doc = await WorkflowFile.findOne({ checksum });
      return doc ? clone(doc) : null;
    }
    return findOneInMemory({ checksum });
  },

  async findByWorkflowId(workflowId) {
    if (!workflowId) return null;
    if (isDbConnected()) {
      const doc = await WorkflowFile.findOne({ workflowId });
      return doc ? clone(doc) : null;
    }
    return findOneInMemory({ workflowId });
  },

  async create(data) {
    if (isDbConnected()) {
      const doc = await WorkflowFile.create(data);
      return clone(doc);
    }
    return createInMemory(data);
  },

  async update(id, updates) {
    if (!id) return null;
    if (isDbConnected()) {
      const doc = await WorkflowFile.findByIdAndUpdate(id, updates, { new: true });
      return doc ? clone(doc) : null;
    }
    return updateInMemory(typeof id === 'string' ? id : id.toString(), updates);
  },
};

module.exports = workflowRepository;
