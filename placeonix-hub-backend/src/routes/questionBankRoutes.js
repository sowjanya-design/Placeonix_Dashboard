const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/questionBankController');

router.use(protect);

router.get('/', ctrl.listQuestions);
router.post('/', authorize('admin', 'mentor'), ctrl.createQuestion);
router.patch('/:id', authorize('admin', 'mentor'), ctrl.updateQuestion);
router.delete('/:id', authorize('admin', 'mentor'), ctrl.deleteQuestion);

module.exports = router;
