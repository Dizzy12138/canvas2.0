const mongoose = require('mongoose');

const ExecutionHistorySchema = new mongoose.Schema(
  {
    appId: { type: String, required: true, index: true },
    requestId: { type: String, required: true, unique: true },
    status: { type: String, enum: ['pending', 'processing', 'success', 'failed'], default: 'pending' },
    inputs: { type: mongoose.Schema.Types.Mixed },
    outputs: { type: mongoose.Schema.Types.Mixed },
    error: { type: String },
    durationMs: { type: Number },
    createdBy: { type: String },
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// 添加索引
ExecutionHistorySchema.index({ appId: 1, createdAt: -1 });

module.exports = mongoose.model('ExecutionHistory', ExecutionHistorySchema);