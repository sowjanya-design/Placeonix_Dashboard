const Notification = require('../models/Notification');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

// @desc   List my notifications
// @route  GET /api/v1/notifications
exports.listMine = asyncHandler(async (req, res) => {
  const { unreadOnly, page = 1, limit = 20 } = req.query;
  const filter = { recipient: req.user._id };
  if (unreadOnly === 'true') filter.isRead = false;

  const total = await Notification.countDocuments(filter);
  const unreadCount = await Notification.countDocuments({
    recipient: req.user._id,
    isRead: false,
  });

  const notifications = await Notification.find(filter)
    .populate('sender', 'firstName lastName avatar')
    .sort('-createdAt')
    .skip((page - 1) * limit)
    .limit(Number(limit));

  return ApiResponse.paginated(
    res,
    'Notifications fetched',
    notifications,
    page,
    limit,
    total,
    { unreadCount }
  );
});

// @desc   Mark as read
// @route  PATCH /api/v1/notifications/:id/read
exports.markAsRead = asyncHandler(async (req, res, next) => {
  const notif = await Notification.findOneAndUpdate(
    { _id: req.params.id, recipient: req.user._id },
    { isRead: true, readAt: new Date() },
    { new: true }
  );
  if (!notif) return next(new AppError('Notification not found', 404));
  return ApiResponse.success(res, 200, 'Marked as read', { notification: notif });
});

// @desc   Mark all as read
// @route  PATCH /api/v1/notifications/read-all
exports.markAllAsRead = asyncHandler(async (req, res) => {
  const result = await Notification.updateMany(
    { recipient: req.user._id, isRead: false },
    { isRead: true, readAt: new Date() }
  );
  return ApiResponse.success(res, 200, 'All marked as read', {
    updated: result.modifiedCount,
  });
});

// @desc   Delete notification
// @route  DELETE /api/v1/notifications/:id
exports.deleteNotification = asyncHandler(async (req, res, next) => {
  const notif = await Notification.findOneAndDelete({
    _id: req.params.id,
    recipient: req.user._id,
  });
  if (!notif) return next(new AppError('Notification not found', 404));
  return ApiResponse.success(res, 200, 'Notification deleted');
});

// @desc   Clear all notifications
// @route  DELETE /api/v1/notifications/clear
exports.clearAll = asyncHandler(async (req, res) => {
  const result = await Notification.deleteMany({ recipient: req.user._id });
  return ApiResponse.success(res, 200, 'All notifications cleared', {
    deleted: result.deletedCount,
  });
});

// @desc   Get unread count only
// @route  GET /api/v1/notifications/unread-count
exports.unreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.countDocuments({
    recipient: req.user._id,
    isRead: false,
  });
  return ApiResponse.success(res, 200, 'Unread count', { count });
});
