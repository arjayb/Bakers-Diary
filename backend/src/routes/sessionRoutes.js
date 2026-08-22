const express = require('express');
const {
  startSession, getSessionById, getContinuableSession,
  updateProgress, attachStepPhoto, completeSession, abandonSession,
} = require('../controllers/sessionController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/continue', getContinuableSession); // before /:id so it isn't swallowed as an id param
router.post('/', startSession);
router.get('/:id', getSessionById);
router.patch('/:id/progress', updateProgress);
router.patch('/:id/step-photo', attachStepPhoto);
router.patch('/:id/complete', completeSession);
router.patch('/:id/abandon', abandonSession);

module.exports = router;
