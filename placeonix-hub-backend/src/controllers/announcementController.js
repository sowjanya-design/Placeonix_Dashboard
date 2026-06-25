const Announcement = require('../models/Announcement');
const Enrollment = require('../models/Enrollment');
const User = require('../models/User');
const Notification = require('../models/Notification');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

// @desc   List announcements (filtered by user's role/batches)
// @route  GET /api/v1/announcements
exports.listAnnouncements = asyncHandler(async (req, res) => {
  const { type, page = 1, limit = 20 } = req.query;
  const now = new Date();

  const filter = {
    isPublished: true,
    publishAt: { $lte: now },
    $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
  };
  if (type) filter.type = type;

  // Filter by audience (unless admin)
  if (req.user.role !== 'admin') {
    const enrollments = await Enrollment.find({ student: req.user._id }).select('batch course');
    const batchIds = enrollments.map((e) => e.batch);
    const courseIds = enrollments.map((e) => e.course);

    filter.$and = [
      filter.$or ? { $or: filter.$or } : {},
      {
        $or: [
          { 'audience.isPublic': true },
          { 'audience.roles': req.user.role },
          { 'audience.batches': { $in: batchIds } },
          { 'audience.courses': { $in: courseIds } },
        ],
      },
    ];
    delete filter.$or;
  }

  const total = await Announcement.countDocuments(filter);
  const announcements = await Announcement.find(filter)
    .populate('createdBy', 'firstName lastName role')
    .sort('-isPinned -publishAt')
    .skip((page - 1) * limit)
    .limit(Number(limit));

  return ApiResponse.paginated(res, 'Announcements fetched', announcements, page, limit, total);
});

// @desc   Create announcement
// @route  POST /api/v1/announcements
exports.createAnnouncement = asyncHandler(async (req, res) => {
  const announcement = await Announcement.create({ ...req.body, createdBy: req.user._id });

  // Fan out the announcement as a notification to its target audience so it
  // shows up in everyone's notification bell (not just the announcements list).
  try {
    const aud = announcement.audience || {};
    const roles = aud.roles && aud.roles.length ? aud.roles : ['student', 'mentor'];
    const recipients = await User.find({
      role: { $in: roles },
      status: 'active',
      _id: { $ne: req.user._id },
    }).select('_id');
    if (recipients.length) {
      await Notification.notify({
        recipient: recipients.map((u) => u._id),
        type: 'announcement',
        title: announcement.title,
        message: (announcement.body || '').slice(0, 480),
        sender: req.user._id,
        priority: announcement.priority || 'normal',
        relatedTo: { model: 'Announcement', id: announcement._id },
      });
    }
  } catch (e) {
    /* notification fan-out is best-effort; never fail the announcement */
  }

  return ApiResponse.created(res, 'Announcement posted', { announcement });
});

// @desc   Update announcement
// @route  PATCH /api/v1/announcements/:id
exports.updateAnnouncement = asyncHandler(async (req, res, next) => {
  const announcement = await Announcement.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!announcement) return next(new AppError('Announcement not found', 404));
  return ApiResponse.success(res, 200, 'Announcement updated', { announcement });
});

// @desc   Delete announcement
// @route  DELETE /api/v1/announcements/:id
exports.deleteAnnouncement = asyncHandler(async (req, res, next) => {
  const announcement = await Announcement.findByIdAndDelete(req.params.id);
  if (!announcement) return next(new AppError('Announcement not found', 404));
  return ApiResponse.success(res, 200, 'Announcement deleted');
});

// @desc   Mark as read
// @route  POST /api/v1/announcements/:id/read
exports.markAsRead = asyncHandler(async (req, res, next) => {
  const announcement = await Announcement.findById(req.params.id);
  if (!announcement) return next(new AppError('Announcement not found', 404));

  const already = announcement.readBy.find((r) => String(r.user) === String(req.user._id));
  if (!already) {
    announcement.readBy.push({ user: req.user._id });
    await announcement.save();
  }
  return ApiResponse.success(res, 200, 'Marked as read');
});
