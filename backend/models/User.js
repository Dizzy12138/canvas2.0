const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, '用户名是必需的'],
    unique: true,
    trim: true,
    minlength: [3, '用户名至少3个字符'],
    maxlength: [30, '用户名最多30个字符']
  },
  email: {
    type: String,
    required: [true, '邮箱是必需的'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, '请输入有效的邮箱地址']
  },
  password: {
    type: String,
    required: [true, '密码是必需的'],
    minlength: [6, '密码至少6个字符']
  },
  avatar: {
    type: String,
    default: null
  },
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'pro', 'enterprise'],
      default: 'free'
    },
    usage: {
      daily_generations: {
        type: Number,
        default: 0
      },
      storage_used: {
        type: Number,
        default: 0
      }
    },
    expires_at: {
      type: Date,
      default: null
    }
  },
  preferences: {
    default_model: {
      type: String,
      default: 'stable-diffusion'
    },
    canvas_settings: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    theme: {
      type: String,
      enum: ['light', 'dark'],
      default: 'light'
    }
  },
  is_active: {
    type: Boolean,
    default: true
  },
  last_login: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// 密码加密中间件
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// 密码比较方法
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// 生成JWT令牌
userSchema.methods.getSignedJwtToken = function() {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    { id: this._id }, 
    process.env.JWT_SECRET || 'fallback_secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
};

module.exports = mongoose.model('User', userSchema);