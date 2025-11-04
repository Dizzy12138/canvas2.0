const express = require('express');

const router = express.Router();

router.get('/', async (req, res) => {
  // MVP 静态返回，可后续接入真实模型仓库
  const data = {
    models: [
      { name: 'sdxl_base', type: 'base', sizeGB: 6.5 },
      { name: 'sd15', type: 'base', sizeGB: 4.0 },
    ],
    loras: [
      { name: 'anime_line_art_v1', strength: [0, 1] },
    ],
    vaes: [
      { name: 'sdxl_vae_fp16' }
    ]
  };
  res.json({ success: true, data });
});

module.exports = router;


