const { createClient } = require('redis');

let redisClient = null;

const connectRedis = async () => {
  try {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    redisClient.on('error', (err) => {
      console.error('Redis连接错误:', err);
    });

    redisClient.on('connect', () => {
      console.log('Redis连接成功');
    });

    redisClient.on('ready', () => {
      console.log('Redis准备就绪');
    });

    redisClient.on('end', () => {
      console.log('Redis连接关闭');
    });

    await redisClient.connect();

  } catch (error) {
    console.error('Redis连接失败:', error);
    console.log('在开发模式下继续运行，但缓存功能不可用');
  }
};

const getRedisClient = () => {
  if (!redisClient) {
    throw new Error('Redis客户端未初始化');
  }
  return redisClient;
};

// 缓存工具函数
const cache = {
  async get(key) {
    try {
      const client = getRedisClient();
      const value = await client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('缓存读取失败:', error);
      return null;
    }
  },

  async set(key, value, ttl = 3600) {
    try {
      const client = getRedisClient();
      await client.setEx(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('缓存写入失败:', error);
      return false;
    }
  },

  async del(key) {
    try {
      const client = getRedisClient();
      await client.del(key);
      return true;
    } catch (error) {
      console.error('缓存删除失败:', error);
      return false;
    }
  },

  async exists(key) {
    try {
      const client = getRedisClient();
      return await client.exists(key);
    } catch (error) {
      console.error('缓存检查失败:', error);
      return false;
    }
  }
};

module.exports = { connectRedis, getRedisClient, cache };