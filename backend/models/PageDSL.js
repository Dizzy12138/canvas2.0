const mongoose = require('mongoose');

const ComponentSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: { 
    type: String, 
    required: true,
    enum: ['upload_image', 'text_input', 'select', 'textarea', 'checkbox', 'slider', 'lora_select', 'number_input', 'color_picker', 'upload_multiple_images', 'range_slider', 'date_picker', 'time_picker', 'custom_component', 'custom_text']
  },
  title: { type: String, required: true },
  props: { type: mongoose.Schema.Types.Mixed },
  paramKey: { type: String, required: true },
  binding: {
    nodeId: { type: Number },
    port: { type: String }
  },
  defaultValue: { type: mongoose.Schema.Types.Mixed },
  // 添加参数映射字段
  parameterMappings: [{
    paramKey: { type: String, required: true },
    nodeId: { type: Number, required: true },
    port: { type: String, required: true },
    title: { type: String },
    type: { type: String }
  }],
  // 添加商业版标识
  biz: { type: Boolean, default: false }
});

const PageDSLSchema = new mongoose.Schema(
  {
    appId: { type: String, required: true, index: true },
    appName: { type: String },
    version: { type: Number, required: true },
    components: [ComponentSchema],
    layout: { 
      type: String, 
      enum: ['one-column', 'two-column', 'three-column'],
      default: 'one-column'
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// 添加索引
PageDSLSchema.index({ appId: 1, version: -1 });

module.exports = mongoose.model('PageDSL', PageDSLSchema);