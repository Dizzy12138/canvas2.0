const jwt = require('jsonwebtoken');
const { dbManager } = require('../config/database');

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      // 对于不需要认证的路由，直接跳过
      req.user = { id: 'anonymous' };
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    const User = dbManager.getModel('User');
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '用户不存在'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    // 对于认证失败的情况，也允许匿名访问
    req.user = { id: 'anonymous' };
    next();
  }
};

module.exports = authMiddleware;