const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  canvas_data: {
    width: { type: Number, default: 800 },
    height: { type: Number, default: 600 },
    background: { type: String, default: '#ffffff' },
    layers: [{ type: mongoose.Schema.Types.Mixed }],
    transform: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  metadata: {
    thumbnail: String,
    tags: [String],
    version: { type: Number, default: 1 }
  },
  sharing: {
    is_public: { type: Boolean, default: false },
    shared_users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  }
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);