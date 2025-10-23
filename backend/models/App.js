const mongoose = require('mongoose');

const AppSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    workflowId: { type: String, required: true },
    workflowVersion: { type: Number, required: true },
    timeoutSec: { type: Number, default: 60 },
    modelType: { type: String, enum: ['SD', 'FLUX', 'OTHER'], default: 'SD' },
    maxRuntime: { type: Number, default: 300 },
    enableCache: { type: Boolean, default: false },
    errorHandling: { type: String, enum: ['retry', 'fallback', 'fail'], default: 'retry' },
    resourcePriority: { type: String, enum: ['GPU', 'CPU', 'AUTO'], default: 'GPU' },
    concurrencyLimit: { type: Number, default: 1 },
    rateLimit: { type: Number, default: 10 },
    outputs: [{
      nodeId: { type: Number, required: true },
      port: { type: String },
      type: {
        type: String,
        enum: ['image', 'video', 'text', 'file', '3d_model', 'audio', 'any'],
        required: true
      },
      isPrimary: { type: Boolean, default: false },
      // 添加参数映射字段
      parameterMappings: [{
        paramKey: { type: String, required: true },
        nodeId: { type: Number, required: true },
        port: { type: String, required: true },
        title: { type: String },
        type: { type: String }
      }]
    }],
    // 添加节点参数字段
    nodeParameters: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    uiBindings: { type: mongoose.Schema.Types.Mixed, default: {} }, // 新增字段，存储画布的 UI 绑定关系
    paramsSchema: { type: mongoose.Schema.Types.Mixed, default: {} }, // 新增字段，存储暴露给前端的参数结构
    preferredAIServiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'AIService' }, // 新增字段，关联到 AIService 模型
    preferredServers: [{ type: String }],
    excludedServers: [{ type: String }],
    computeCost: { type: Number, default: 0 },
    isActive: { type: Boolean, default: false },
    createdBy: { type: String },
    updatedBy: { type: String }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

module.exports = mongoose.model('App', AppSchema);