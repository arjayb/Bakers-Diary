const express = require('express');
const { convertUnit } = require('../controllers/conversionController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.post('/', authenticate, convertUnit);

module.exports = router;
