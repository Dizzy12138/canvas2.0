const mongoose = require('mongoose');

// 数据库抽象层 - 统一管理数据库连接和模型
class DatabaseManager {
  constructor() {
    this.isConnected = false;
    this.useMemoryDB = false;
    this.models = {};
  }

  // 初始化数据库连接
  async connect() {
    try {
      // 尝试连接MongoDB
      const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_canvas', {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });

      console.log(`MongoDB连接成功: ${conn.connection.host}`);
      this.isConnected = true;
      this.useMemoryDB = false;
      
      // 监听连接事件
      mongoose.connection.on('error', (err) => {
        console.error('MongoDB连接错误:', err);
        this.isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        console.log('MongoDB连接断开');
        this.isConnected = false;
      });

      return true;
    } catch (error) {
      console.error('MongoDB连接失败:', error.message);
      console.log('切换到内存数据库模式');
      this.isConnected = false;
      this.useMemoryDB = true;
      
      // 初始化内存数据库
      this.initializeMemoryDB();
      
      // 开发模式下不退出进程
      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      }
      
      return false;
    }
  }

  // 初始化内存数据库
  initializeMemoryDB() {
    console.log('初始化内存数据库...');
    
    // 初始化AIService内存数据库
    if (!global.AIService) {
      global.AIService = [];
      this.setupAIServiceMethods();
    }
    
    // 初始化App内存数据库
    if (!global.App) {
    global.App = [];
    // 为App数组添加findIndex方法
    global.App.findIndex = function(predicate) {
      for (let i = 0; i < this.length; i++) {
        if (predicate(this[i])) {
          return i;
        }
      }
      return -1;
    };
    this.setupAppMethods();
    }
    
    console.log('内存数据库初始化完成');
  }

  // 设置AIService内存数据库方法
  setupAIServiceMethods() {
    // 生成ObjectId格式的ID
    const generateObjectId = () => {
      const timestamp = Math.floor(Date.now() / 1000).toString(16);
      const random = Math.random().toString(16).substring(2, 8);
      const counter = Math.floor(Math.random() * 16777216).toString(16).padStart(6, '0');
      return timestamp + random + counter;
    };

    global.AIService.find = function(condition = {}) {
      return Promise.resolve(
        this.filter(item => {
          if (condition.name && condition.name.$regex) {
            const regex = new RegExp(condition.name.$regex, condition.name.$options || 'i');
            return regex.test(item.name);
          }
          if (condition.enabled !== undefined) {
            return item.enabled === condition.enabled;
          }
          if (condition.healthStatus) {
            if (typeof condition.healthStatus === 'object' && condition.healthStatus.$ne) {
              return item.healthStatus !== condition.healthStatus.$ne;
            }
            return item.healthStatus === condition.healthStatus;
          }
          return true;
        })
      );
    };

    global.AIService.findOne = function(condition) {
      const result = this.filter(item => {
        for (const [key, value] of Object.entries(condition)) {
          if (item[key] !== value) return false;
        }
        return true;
      });
      return Promise.resolve(result[0] || null);
    };

    global.AIService.findById = function(id) {
      const result = this.filter(item => item.id === id || item._id === id);
      return Promise.resolve(result[0] || null);
    };

    global.AIService.create = function(data) {
      const newItem = {
        id: generateObjectId(),
        _id: generateObjectId(),
        ...data,
        healthStatus: 'unknown',
        lastHealthCheckAt: null,
        lastHealthError: '',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      this.push(newItem);
      return Promise.resolve(newItem);
    };

    global.AIService.updateMany = function(condition, update) {
      return Promise.resolve(
        this.forEach(item => {
          let shouldUpdate = true;
          for (const [key, value] of Object.entries(condition)) {
            if (item[key] !== value) {
              shouldUpdate = false;
              break;
            }
          }
          if (shouldUpdate) {
            if (update.$set) {
              Object.assign(item, update.$set);
            } else {
              Object.assign(item, update);
            }
            item.updatedAt = new Date();
          }
        })
      );
    };

    global.AIService.deleteOne = function(condition) {
      const index = this.findIndex(item => {
        for (const [key, value] of Object.entries(condition)) {
          if (item[key] !== value) return false;
        }
        return true;
      });
      if (index !== -1) {
        this.splice(index, 1);
      }
      return Promise.resolve();
    };
  }

  // 设置App内存数据库方法
  setupAppMethods() {
    // 生成ObjectId格式的ID
    const generateObjectId = () => {
      const timestamp = Math.floor(Date.now() / 1000).toString(16);
      const random = Math.random().toString(16).substring(2, 8);
      const counter = Math.floor(Math.random() * 16777216).toString(16).padStart(6, '0');
      return timestamp + random + counter;
    };

    global.App.find = function(condition = {}) {
      const result = this.filter(item => {
        if (condition.createdBy) {
          return item.createdBy === condition.createdBy;
        }
        if (condition._id) {
          return item._id === condition._id;
        }
        if (condition.name) {
          return item.name === condition.name;
        }
        return true;
      });
      
      // 返回一个带有 sort 方法的对象
      const queryResult = {
        data: result,
        sort: function(sortObj) {
          const sorted = [...this.data];
          
          // 如果只有一个排序字段，直接排序
          const sortFields = Object.entries(sortObj);
          if (sortFields.length === 1) {
            const [field, direction] = sortFields[0];
            sorted.sort((a, b) => {
              const aVal = a[field];
              const bVal = b[field];
              if (aVal < bVal) return direction === -1 ? -1 : 1;
              if (aVal > bVal) return direction === -1 ? 1 : -1;
              return 0;
            });
          } else {
            // 多个排序字段，按优先级排序
            sorted.sort((a, b) => {
              for (const [field, direction] of sortFields) {
                const aVal = a[field];
                const bVal = b[field];
                if (aVal < bVal) return direction === -1 ? -1 : 1;
                if (aVal > bVal) return direction === -1 ? 1 : -1;
              }
              return 0;
            });
          }
          
          return Promise.resolve(sorted);
        }
      };
      
      return Promise.resolve(queryResult);
    };

    global.App.findOne = function(condition) {
      const result = this.filter(item => {
        for (const [key, value] of Object.entries(condition)) {
          if (key === '_id') {
            if (item._id !== value) return false;
          } else if (key === 'createdBy') {
            if (item.createdBy !== value) return false;
          } else if (item[key] !== value) return false;
        }
        return true;
      });
      return Promise.resolve(result[0] || null);
    };

    global.App.findById = function(id) {
      const result = this.filter(item => item._id === id);
      return Promise.resolve(result[0] || null);
    };

    global.App.create = function(data) {
      const newItem = {
        _id: generateObjectId(),
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.push(newItem);
      return Promise.resolve(newItem);
    };

    global.App.findOneAndUpdate = function(condition, update, options = {}) {
      const result = this.filter(item => {
        for (const [key, value] of Object.entries(condition)) {
          if (key === '_id') {
            if (item._id !== value) return false;
          } else if (key === 'createdBy') {
            if (item.createdBy !== value) return false;
          } else if (item[key] !== value) return false;
        }
        return true;
      });
      
      if (result.length > 0) {
        const item = result[0];
        Object.assign(item, update);
        item.updatedAt = new Date();
        return Promise.resolve(item);
      }
      return Promise.resolve(null);
    };

    global.App.findOneAndDelete = function(condition) {
      const result = this.filter(item => {
        for (const [key, value] of Object.entries(condition)) {
          if (key === '_id') {
            if (item._id !== value) return false;
          } else if (key === 'createdBy') {
            if (item.createdBy !== value) return false;
          } else if (item[key] !== value) return false;
        }
        return true;
      });
      
      if (result.length > 0) {
        const item = result[0];
        const index = this.indexOf(item);
        this.splice(index, 1);
        return Promise.resolve(item);
      }
      return Promise.resolve(null);
    };
  }

  // 获取模型 - 统一接口
  getModel(modelName) {
    if (this.useMemoryDB) {
      return global[modelName];
    } else {
      return require(`../models/${modelName}`);
    }
  }

  // 检查是否使用内存数据库
  isUsingMemoryDB() {
    return this.useMemoryDB;
  }

  // 检查数据库连接状态
  isDatabaseConnected() {
    return this.isConnected;
  }
}

// 创建单例实例
const dbManager = new DatabaseManager();

// 导出连接函数
const connectDB = async () => {
  return await dbManager.connect();
};

// 导出数据库管理器
module.exports = { connectDB, dbManager };
module.exports = { connectDB, dbManager };