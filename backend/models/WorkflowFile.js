const mongoose = require("mongoose");

const WorkflowFileSchema = new mongoose.Schema(
  {
    checksum: { type: String, required: true, unique: true, index: true },
    workflowId: { type: String, required: true },
    version: { type: Number, default: 1 },
    name: { type: String },
    nodesCount: { type: Number, default: 0 },
    parameters: { type: mongoose.Schema.Types.Mixed, default: {} },
    mappableInputs: { type: [mongoose.Schema.Types.Mixed], default: [] },
    mappableOutputs: { type: [mongoose.Schema.Types.Mixed], default: [] },
    outputNodes: { type: [mongoose.Schema.Types.Mixed], default: [] },
    rawWorkflow: { type: mongoose.Schema.Types.Mixed },
    nodesTree: { type: mongoose.Schema.Types.Mixed }, // 新增字段，存储解析后的节点树
    cascaderData: { type: mongoose.Schema.Types.Mixed }, // 新增字段，存储前端 Cascader 数据
    createdBy: { type: String },
    updatedBy: { type: String },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("WorkflowFile", WorkflowFileSchema);

