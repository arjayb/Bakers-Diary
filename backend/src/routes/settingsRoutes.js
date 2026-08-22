const express = require('express');
const { getSettings, updateSettings } = require('../controllers/settingsController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', getSettings);
router.patch('/', updateSettings);

module.exports = router;
