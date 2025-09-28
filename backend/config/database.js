const mongoose = require('mongoose');

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
    console.log('在开发模式下继续运行，但某些功能可能不可用');
    // 开发模式下不退出进程
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

module.exports = connectDB;