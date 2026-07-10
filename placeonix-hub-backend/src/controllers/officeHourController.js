/*
 * Placeonix Hub — Office-hour controller.
 * Mentors publish 1:1 availability slots; students book and cancel them.
 */
const OfficeHourSlot = require('../models/OfficeHourSlot');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

// @desc   List office-hour slots (role-aware)
// @route  GET /api/v1/office-hours
/** List office-hour slots (role-scoped). */
exports.listSlots = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.user.role === 'mentor') {
    filter.mentor = req.user._id;
  } else if (req.user.role === 'student') {
    // students see future available slots + their own bookings
    filter.$or = [
      { status: 'available', startTime: { $gte: new Date() } },
      { bookedBy: req.user._id },
    ];
  }
  const slots = await OfficeHourSlot.find(filter)
    .populate('mentor', 'firstName lastName mentorProfile')
    .populate('bookedBy', 'firstName lastName email')
    .sort('startTime');
  return ApiResponse.success(res, 200, 'Slots fetched', slots);
});

// @desc   Create a slot (mentor/admin)
// @route  POST /api/v1/office-hours
/** Mentor adds an availability slot. */
exports.createSlot = asyncHandler(async (req, res) => {
  const body = { ...req.body, createdBy: req.user._id };
  if (req.user.role === 'mentor') body.mentor = req.user._id;
  const slot = await OfficeHourSlot.create(body);
  return ApiResponse.created(res, 'Slot created', { slot });
});

// @desc   Student books a slot
// @route  POST /api/v1/office-hours/:id/book
/** Student books an available slot. */
exports.bookSlot = asyncHandler(async (req, res, next) => {
  const slot = await OfficeHourSlot.findById(req.params.id);
  if (!slot) return next(new AppError('Slot not found', 404));
  if (slot.status !== 'available') return next(new AppError('This slot is no longer available', 400));
  if (new Date(slot.startTime) < new Date()) return next(new AppError('This slot is in the past', 400));

  slot.status = 'booked';
  slot.bookedBy = req.user._id;
  slot.bookedAt = new Date();
  slot.studentNote = req.body.note || '';
  await slot.save();

  try {
    const Notification = require('../models/Notification');
    await Notification.notify({
      recipient: slot.mentor,
      type: 'system',
      title: 'Office-hours slot booked',
      message: `A student booked your ${new Date(slot.startTime).toLocaleString()} slot.`,
      sender: req.user._id,
    });
  } catch (e) { /* best-effort */ }

  return ApiResponse.success(res, 200, 'Slot booked', { slot });
});

// @desc   Cancel a booking (student) or free the slot
// @route  POST /api/v1/office-hours/:id/cancel
/** Cancel a booking, releasing the slot back to available. */
exports.cancelBooking = asyncHandler(async (req, res, next) => {
  const slot = await OfficeHourSlot.findById(req.params.id);
  if (!slot) return next(new AppError('Slot not found', 404));
  // a student can only cancel their own booking
  if (req.user.role === 'student' && String(slot.bookedBy) !== String(req.user._id)) {
    return next(new AppError('Not your booking', 403));
  }
  slot.status = 'available';
  slot.bookedBy = undefined;
  slot.bookedAt = undefined;
  slot.studentNote = undefined;
  await slot.save();
  return ApiResponse.success(res, 200, 'Booking cancelled', { slot });
});

// @desc   Delete a slot (mentor/admin)
// @route  DELETE /api/v1/office-hours/:id
/** Mentor deletes a slot. */
exports.deleteSlot = asyncHandler(async (req, res, next) => {
  const slot = await OfficeHourSlot.findByIdAndDelete(req.params.id);
  if (!slot) return next(new AppError('Slot not found', 404));
  return ApiResponse.success(res, 200, 'Slot removed');
});
