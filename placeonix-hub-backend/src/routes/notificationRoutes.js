/*
 * Placeonix Hub — Notification routes (/api/v1/notifications).
 * List, unread count, mark read / read-all, delete and clear — all for the current user.
 */
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', ctrl.listMine);
router.get('/unread-count', ctrl.unreadCount);
router.patch('/read-all', ctrl.markAllAsRead);
router.delete('/clear', ctrl.clearAll);
router.patch('/:id/read', ctrl.markAsRead);
router.delete('/:id', ctrl.deleteNotification);

module.exports = router;
