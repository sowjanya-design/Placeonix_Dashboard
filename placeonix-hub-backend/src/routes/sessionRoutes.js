const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/sessionController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/', ctrl.listSessions);
router.get('/today', ctrl.todaySessions);
router.get('/:id', ctrl.getSession);

router.post('/', authorize('mentor', 'admin'), ctrl.createSession);
router.patch('/:id', authorize('mentor', 'admin'), ctrl.updateSession);
router.delete('/:id', authorize('mentor', 'admin'), ctrl.deleteSession);

router.patch('/:id/start', authorize('mentor', 'admin'), ctrl.startSession);
router.patch('/:id/complete', authorize('mentor', 'admin'), ctrl.completeSession);

module.exports = router;
