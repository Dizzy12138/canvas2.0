const express = require('express');
const router = express.Router();
const User = require('../models/User');

// 获取用户信息
router.get('/profile', (req, res) => {
  res.json({
    success: true,
    data: { user: req.user }
  });
});

// 更新用户偏好
router.put('/preferences', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { preferences: { ...req.user.preferences, ...req.body } } },
      { new: true, runValidators: true }
    );
    
    res.json({
      success: true,
      data: { preferences: user.preferences }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;