const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const auth = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.post(
  '/register',
  [
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').notEmpty().withMessage('Last name is required'),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('phone').optional().isMobilePhone('any'),
  ],
  validate,
  auth.register
);

router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  validate,
  auth.login
);

router.post('/refresh', auth.refreshToken);
router.post('/logout', protect, auth.logout);
router.get('/me', protect, auth.getMe);

router.patch(
  '/password',
  protect,
  [
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 8 }),
  ],
  validate,
  auth.updatePassword
);

router.post(
  '/forgot-password',
  [body('email').isEmail()],
  validate,
  auth.forgotPassword
);

router.post(
  '/reset-password/:token',
  [body('password').isLength({ min: 8 })],
  validate,
  auth.resetPassword
);

module.exports = router;
