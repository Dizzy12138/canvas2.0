const express = require('express');

const router = express.Router();

// 简单内存缓存（10分钟）
let cache = { data: null, expireAt: 0 };

router.get('/', async (req, res) => {
  const now = Date.now();
  if (cache.data && cache.expireAt > now) {
    return res.json({ success: true, data: cache.data, cached: true });
  }

  const data = {
    samplers: [
      'euler', 'euler_a', 'lms', 'heun', 'dpm2', 'dpm2_a', 'ddim'
    ],
    resolutions: [
      { label: '512x512', width: 512, height: 512 },
      { label: '768x768', width: 768, height: 768 },
      { label: '1024x1024', width: 1024, height: 1024 }
    ],
    steps: { min: 1, max: 150, default: 28 },
    cfgScale: { min: 1, max: 20, default: 7 },
    deviceTypes: ['AUTO', 'GPU', 'CPU']
  };

  cache = { data, expireAt: now + 10 * 60 * 1000 };
  res.json({ success: true, data });
});

module.exports = router;


