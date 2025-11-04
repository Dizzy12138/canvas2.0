const mongoose = require('mongoose');

const AppSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    title: { type: String, default: '' },
    functionDescription: { type: String, default: '' },
    applicationType: { type: String, enum: ['Public', 'Private'], default: 'Private' },
    categories: [{ type: String }],
    computePowerConsumption: { type: Number, default: 0 },
    sortOrder: { type: Number, default: 999 },
    visible: { type: Boolean, default: false },
    status: { type: String, enum: ['draft', 'published', 'hidden'], default: 'draft' },
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
      nodeId: { type: String, required: true },
      outputType: {
        type: String,
        enum: ['image', 'video', 'text', 'json', 'audio', 'any'],
        required: true
      },
      isPrimary: { type: Boolean, default: false },
    }],
    outputNodes: { type: mongoose.Schema.Types.Mixed, default: [] }, // 新增字段，存储产出节点配置
    timeout: { type: Number, default: 300 }, // 新增字段，存储超时时间
    // 添加节点参数字段
    nodeParameters: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    components: { type: mongoose.Schema.Types.Mixed, default: [] }, // 画布组件DSL
    uiBindings: { type: mongoose.Schema.Types.Mixed, default: [] }, // 组件与工作流参数绑定
    paramsSchema: { type: mongoose.Schema.Types.Mixed, default: [] }, // 暴露给前端的参数结构
    pageSchema: { type: mongoose.Schema.Types.Mixed, default: { version: '1.0', components: [] } },
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