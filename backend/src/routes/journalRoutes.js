const express = require('express');
const { getJournal, getJournalEntry } = require('../controllers/sessionController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', getJournal);
router.get('/:sessionId', getJournalEntry);

module.exports = router;
