const mongoose = require('mongoose');

const AIServiceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    baseUrl: { type: String, required: true, trim: true },
    tags: { type: [String], default: [] },

    // auth
    authMethod: { type: String, enum: ['none', 'header', 'query'], default: 'none' },
    apiKey: { type: String, default: '' },
    apiKeyHeader: { type: String, default: 'Authorization' },
    apiKeyQuery: { type: String, default: 'api_key' },

    // behavior
    isDefault: { type: Boolean, default: false },
    enabled: { type: Boolean, default: true },

    // network
    timeoutMs: { type: Number, default: 60000 },
    healthPath: { type: String, default: '/prompt' },
    rps: { type: Number, default: 0 }, // informational only in phase 1

    // health
    healthStatus: { type: String, enum: ['unknown', 'healthy', 'unhealthy'], default: 'unknown' },
    lastHealthCheckAt: { type: Date, default: null },
    lastHealthError: { type: String, default: '' },
    
    // audit fields
    createdBy: { type: String, default: '' },
    updatedBy: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AIService', AIServiceSchema);

