const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const userCtrl = require('../controllers/userController');
const { protect, authorize, ownerOrAdmin } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.use(protect);

// Self routes
router.get('/me/stats', userCtrl.myStats);
router.get('/me/enrollments', userCtrl.myEnrollments);
router.patch('/me/enrollments/:id/progress', authorize('student'), userCtrl.updateMyProgress);
router.get('/leaderboard', userCtrl.leaderboard);
router.get('/my-students', authorize('mentor', 'admin'), userCtrl.myStudents);

// Admin only
router.get('/', authorize('admin'), userCtrl.listUsers);
router.post(
  '/',
  authorize('admin'),
  [
    body('firstName').notEmpty(),
    body('lastName').notEmpty(),
    body('email').isEmail(),
    body('password').isLength({ min: 8 }),
    body('role').isIn(['admin', 'mentor', 'student']),
  ],
  validate,
  userCtrl.createUser
);

router.get('/:id/enrollments', authorize('admin', 'mentor'), userCtrl.userEnrollments);
router.get('/:id', userCtrl.getUser);
router.patch('/:id', ownerOrAdmin('id'), userCtrl.updateUser);
router.delete('/:id', authorize('admin'), userCtrl.deleteUser);
router.patch('/:id/role', authorize('admin'), userCtrl.updateRole);

module.exports = router;
