/*
 * Placeonix Hub — Payment controller.
 * Record and manage fee payments, including student self-pay and fee summaries.
 */
const Payment = require('../models/Payment');
const Enrollment = require('../models/Enrollment');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

// @desc   Student pays their own fees (simulated gateway — no Razorpay yet)
// @route  POST /api/v1/payments/me/pay
/** Student records a fee payment against their own account. */
exports.payMyFees = asyncHandler(async (req, res, next) => {
  const { enrollmentId } = req.body;
  let amount = Number(req.body.amount);
  if (!amount || amount <= 0) return next(new AppError('Enter a valid amount', 400));

  // Normalize the UI's method label to the Payment enum (cash/upi/card/bank_transfer/...).
  let method = String(req.body.method || 'upi').toLowerCase().replace(/\s|\//g, '');
  if (method === 'netbanking' || method === 'banktransfer') method = 'bank_transfer';
  if (method === 'creditdebitcard' || method === 'debitcard' || method === 'creditcard') method = 'card';
  if (!['cash', 'upi', 'card', 'bank_transfer', 'razorpay', 'stripe', 'other'].includes(method)) method = 'other';

  let enrollment;
  if (enrollmentId) {
    enrollment = await Enrollment.findOne({ _id: enrollmentId, student: req.user._id });
  } else {
    const enrollments = await Enrollment.find({ student: req.user._id });
    enrollment = enrollments.sort((a, b) => (b.fee.due || 0) - (a.fee.due || 0))[0];
  }
  if (!enrollment) return next(new AppError('No enrollment found to pay for', 404));

  if (enrollment.fee.due != null && amount > enrollment.fee.due) amount = enrollment.fee.due;
  if (amount <= 0) return next(new AppError('No pending dues on this course', 400));

  const txn = 'SIM-' + Date.now();
  const payment = await Payment.create({
    enrollment: enrollment._id,
    student: req.user._id,
    amount,
    method,
    transactionId: txn,
    notes: 'Paid online by student',
    status: 'completed',
    paidOn: new Date(),
    receivedBy: req.user._id,
  });

  enrollment.fee.paid += amount;
  enrollment.fee.due = Math.max(0, enrollment.fee.total - enrollment.fee.paid);
  enrollment.fee.payments.push({ amount, method, transactionId: txn, paidOn: new Date(), notes: 'Paid online by student' });
  await enrollment.save();

  return ApiResponse.created(res, 'Payment successful', { payment, enrollment });
});

// @desc   List payments (admin)
// @route  GET /api/v1/payments
/** List payments (role-scoped). */
exports.listPayments = asyncHandler(async (req, res) => {
  const { status, method, student, from, to, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (method) filter.method = method;
  if (student) filter.student = student;
  if (from || to) {
    filter.paidOn = {};
    if (from) filter.paidOn.$gte = new Date(from);
    if (to) filter.paidOn.$lte = new Date(to);
  }

  // Students see only their own
  if (req.user.role === 'student') filter.student = req.user._id;

  const total = await Payment.countDocuments(filter);
  const payments = await Payment.find(filter)
    .populate('student', 'firstName lastName email studentProfile.enrollmentId')
    .populate('enrollment')
    .populate('receivedBy', 'firstName lastName')
    .sort('-paidOn')
    .skip((page - 1) * limit)
    .limit(Number(limit));

  return ApiResponse.paginated(res, 'Payments fetched', payments, page, limit, total);
});

// @desc   Get payment / invoice
// @route  GET /api/v1/payments/:id
/** Get one payment. */
exports.getPayment = asyncHandler(async (req, res, next) => {
  const payment = await Payment.findById(req.params.id)
    .populate('student enrollment receivedBy');
  if (!payment) return next(new AppError('Payment not found', 404));

  // Students can only see their own
  if (
    req.user.role === 'student' &&
    String(payment.student._id) !== String(req.user._id)
  ) {
    return next(new AppError('Not authorized', 403));
  }

  return ApiResponse.success(res, 200, 'Payment fetched', { payment });
});

// @desc   Record payment (admin)
// @route  POST /api/v1/payments
/** Admin records a payment for a student's enrollment. */
exports.recordPayment = asyncHandler(async (req, res, next) => {
  const { enrollmentId, amount, method, transactionId, notes } = req.body;

  const enrollment = await Enrollment.findById(enrollmentId);
  if (!enrollment) return next(new AppError('Enrollment not found', 404));

  const payment = await Payment.create({
    enrollment: enrollmentId,
    student: enrollment.student,
    amount,
    method,
    transactionId,
    notes,
    status: 'completed',
    paidOn: new Date(),
    receivedBy: req.user._id,
  });

  // Update enrollment fee record
  enrollment.fee.paid += amount;
  enrollment.fee.due = Math.max(0, enrollment.fee.total - enrollment.fee.paid);
  enrollment.fee.payments.push({
    amount,
    method,
    transactionId,
    paidOn: new Date(),
    notes,
  });
  await enrollment.save();

  return ApiResponse.created(res, 'Payment recorded', { payment, enrollment });
});

// @desc   Update payment status
// @route  PATCH /api/v1/payments/:id
/** Update a payment record. */
exports.updatePayment = asyncHandler(async (req, res, next) => {
  const payment = await Payment.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!payment) return next(new AppError('Payment not found', 404));
  return ApiResponse.success(res, 200, 'Payment updated', { payment });
});

// @desc   Refund payment
// @route  POST /api/v1/payments/:id/refund
/** Refund a payment. */
exports.refundPayment = asyncHandler(async (req, res, next) => {
  const payment = await Payment.findById(req.params.id);
  if (!payment) return next(new AppError('Payment not found', 404));
  if (payment.status === 'refunded') return next(new AppError('Already refunded', 400));

  const { amount, reason, refundTransactionId } = req.body;
  payment.status = amount >= payment.amount ? 'refunded' : 'partial-refund';
  payment.refund = {
    amount: amount || payment.amount,
    reason,
    refundTransactionId,
    refundedOn: new Date(),
  };
  await payment.save();

  // Update enrollment
  await Enrollment.findByIdAndUpdate(payment.enrollment, {
    $inc: { 'fee.paid': -(amount || payment.amount), 'fee.due': amount || payment.amount },
  });

  return ApiResponse.success(res, 200, 'Refund processed', { payment });
});

// @desc   My fee summary (student)
// @route  GET /api/v1/payments/me/summary
/** The current student's fee summary (total, paid, due). */
exports.mySummary = asyncHandler(async (req, res) => {
  const enrollments = await Enrollment.find({ student: req.user._id })
    .populate('course', 'title fee')
    .populate('batch', 'name code');

  const totalCommitted = enrollments.reduce((s, e) => s + (e.fee.total || 0), 0);
  const totalPaid = enrollments.reduce((s, e) => s + (e.fee.paid || 0), 0);
  const totalDue = enrollments.reduce((s, e) => s + (e.fee.due || 0), 0);

  return ApiResponse.success(res, 200, 'Fee summary', {
    summary: { totalCommitted, totalPaid, totalDue },
    enrollments: enrollments.map((e) => ({
      _id: e._id,
      course: e.course,
      batch: e.batch,
      fee: e.fee,
    })),
  });
});
