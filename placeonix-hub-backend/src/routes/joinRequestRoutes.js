const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/joinRequestController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/', ctrl.list);
router.post('/', authorize('student'), ctrl.create);
router.patch('/:id', authorize('mentor', 'admin'), ctrl.update);

module.exports = router;
