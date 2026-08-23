const express = require('express');
const { authenticate } = require('../middleware/auth');
const { exportOfflineData } = require('../controllers/exportController');

const router = express.Router();
router.get('/offline', authenticate, exportOfflineData);

module.exports = router;
