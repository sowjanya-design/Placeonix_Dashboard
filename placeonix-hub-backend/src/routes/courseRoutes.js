const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const courseCtrl = require('../controllers/courseController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

// Optional auth on list/get — public can view published courses
const optionalAuth = (req, res, next) => {
  if (req.headers.authorization || req.cookies?.accessToken) return protect(req, res, next);
  next();
};

router.get('/', optionalAuth, courseCtrl.listCourses);
router.get('/:id', optionalAuth, courseCtrl.getCourse);

// Admin-only writes
router.use(protect, authorize('admin'));

router.post(
  '/',
  [
    body('title').notEmpty(),
    body('category').notEmpty(),
    body('description').notEmpty(),
    body('duration').notEmpty(),
    body('fee.amount').isNumeric(),
  ],
  validate,
  courseCtrl.createCourse
);

router.patch('/:id', courseCtrl.updateCourse);
router.delete('/:id', courseCtrl.deleteCourse);
router.patch('/:id/publish', courseCtrl.togglePublish);

// Modules
router.post('/:id/modules', courseCtrl.addModule);
router.patch('/:id/modules/reorder', courseCtrl.reorderModules);
router.patch('/:id/modules/:moduleId', courseCtrl.updateModule);
router.delete('/:id/modules/:moduleId', courseCtrl.deleteModule);

// Topics
router.post('/:id/modules/:moduleId/topics', courseCtrl.addTopic);
router.patch('/:id/modules/:moduleId/topics/:topicId', courseCtrl.updateTopic);
router.delete('/:id/modules/:moduleId/topics/:topicId', courseCtrl.deleteTopic);

module.exports = router;
