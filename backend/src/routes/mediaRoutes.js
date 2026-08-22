const express = require('express');
const { uploadMedia } = require('../controllers/mediaController');
const { authenticate } = require('../middleware/auth');
const { upload } = require('../services/mediaService');

const router = express.Router();
router.post('/', authenticate, upload.single('photo'), uploadMedia);

module.exports = router;
