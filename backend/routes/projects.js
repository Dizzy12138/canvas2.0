const express = require('express');
const Project = require('../models/Project');
const router = express.Router();

// 获取用户项目列表
router.get('/', async (req, res) => {
  try {
    const projects = await Project.find({ user_id: req.user._id })
      .select('-canvas_data')
      .sort({ updatedAt: -1 });
    
    res.json({
      success: true,
      data: { projects }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// 创建项目
router.post('/', async (req, res) => {
  try {
    const project = await Project.create({
      ...req.body,
      user_id: req.user._id
    });
    
    res.status(201).json({
      success: true,
      data: { project }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// 保存项目
router.put('/:id', async (req, res) => {
  try {
    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, user_id: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: '项目不存在'
      });
    }
    
    res.json({
      success: true,
      data: { project }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;