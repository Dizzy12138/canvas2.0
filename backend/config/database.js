const mongoose = require('mongoose');

// 内存中的服务数据存储（用于开发模式下MongoDB不可用时）
let inMemoryServices = [];
let nextId = 1;
let inMemoryApps = []; // 添加应用数据的内存存储

// 模拟MongoDB服务模型的方法
const mockServiceModel = {
  find: async (cond) => {
    console.log('使用内存数据库查找服务:', cond);
    let result = inMemoryServices;
    
    if (cond.name) {
      const regex = cond.name.$regex || cond.name;
      const options = cond.name.$options || '';
      const flags = options.includes('i') ? 'i' : '';
      const re = new RegExp(regex, flags);
      result = result.filter(s => re.test(s.name));
    }
    
    if (cond.enabled !== undefined) {
      result = result.filter(s => s.enabled === cond.enabled);
    }
    
    if (cond.healthStatus !== undefined) {
      if (cond.healthStatus === 'healthy') {
        result = result.filter(s => s.healthStatus === 'healthy');
      } else {
        result = result.filter(s => s.healthStatus !== 'healthy');
      }
    }
    
    return result.sort((a, b) => {
      if (b.isDefault !== a.isDefault) return b.isDefault - a.isDefault;
      return a.name.localeCompare(b.name);
    });
  },
  
  findOne: async (cond) => {
    console.log('使用内存数据库查找单个服务:', cond);
    return inMemoryServices.find(s => {
      return Object.keys(cond).every(key => s[key] === cond[key]);
    });
  },
  
  findById: async (id) => {
    console.log('使用内存数据库通过ID查找服务:', id);
    return inMemoryServices.find(s => s.id == id);
  },
  
  create: async (data) => {
    console.log('使用内存数据库创建服务:', data);
    const newService = {
      id: nextId++,
      ...data,
      healthStatus: 'unknown',
      lastHealthCheckAt: null,
      lastHealthError: '',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    inMemoryServices.push(newService);
    return newService;
  },
  
  updateMany: async (cond, update) => {
    console.log('使用内存数据库批量更新服务:', cond, update);
    inMemoryServices = inMemoryServices.map(s => {
      if (Object.keys(cond).every(key => s[key] === cond[key])) {
        return { ...s, ...update.$set, updatedAt: new Date() };
      }
      return s;
    });
  },
  
  deleteOne: async (cond) => {
    console.log('使用内存数据库删除服务:', cond);
    inMemoryServices = inMemoryServices.filter(s => {
      return !Object.keys(cond).every(key => s[key] == cond[key]);
    });
  }
};

// 模拟MongoDB应用模型的方法
const mockAppModel = {
  find: async (cond) => {
    console.log('使用内存数据库查找应用:', cond);
    let result = inMemoryApps;
    
    if (cond.name) {
      result = result.filter(app => app.name === cond.name);
    }
    
    return result;
  },
  
  findOne: async (cond) => {
    console.log('使用内存数据库查找单个应用:', cond);
    return inMemoryApps.find(app => {
      return Object.keys(cond).every(key => {
        if (key === '_id' && cond[key].$ne) {
          return app._id != cond[key].$ne;
        }
        return app[key] === cond[key];
      });
    });
  },
  
  findById: async (id) => {
    console.log('使用内存数据库通过ID查找应用:', id);
    return inMemoryApps.find(app => app._id == id);
  },
  
  create: async (data) => {
    console.log('使用内存数据库创建应用:', data);
    const newApp = {
      _id: nextId++,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    inMemoryApps.push(newApp);
    return newApp;
  },
  
  findByIdAndUpdate: async (id, updates, options) => {
    console.log('使用内存数据库更新应用:', id, updates);
    const index = inMemoryApps.findIndex(app => app._id == id);
    if (index !== -1) {
      inMemoryApps[index] = { ...inMemoryApps[index], ...updates, updatedAt: new Date() };
      return inMemoryApps[index];
    }
    return null;
  }
};

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_canvas', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log(`MongoDB连接成功: ${conn.connection.host}`);
    
    // 监听连接事件
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB连接错误:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB连接断开');
    });

    // 优雅关闭
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB连接已关闭');
      process.exit(0);
    });

  } catch (error) {
    console.error('MongoDB连接失败:', error);
    console.log('在开发模式下使用内存数据库');
    
    // 替换AIService模型为内存模拟
    const AIService = require('../models/AIService');
    Object.assign(AIService, mockServiceModel);
    
    // 替换App模型为内存模拟
    const App = require('../models/App');
    Object.assign(App, mockAppModel);
    
    // 挂载到全局对象，供路由使用
    global.AIService = mockServiceModel;
    global.App = mockAppModel;
    
    // 开发模式下不退出进程
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

module.exports = connectDB;