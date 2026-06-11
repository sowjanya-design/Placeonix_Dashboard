const Lead = require('../models/Lead');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

// @desc   Submit inquiry (PUBLIC — from website contact form)
// @route  POST /api/v1/leads
exports.createLead = asyncHandler(async (req, res) => {
  const lead = await Lead.create(req.body);
  return ApiResponse.created(
    res,
    'Thank you! We will reach out within 24 hours.',
    { leadId: lead._id }
  );
});

// @desc   List leads (admin)
// @route  GET /api/v1/leads
exports.listLeads = asyncHandler(async (req, res) => {
  const { status, source, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (source) filter.source = source;

  const total = await Lead.countDocuments(filter);
  const leads = await Lead.find(filter)
    .populate('courseInterested', 'title')
    .populate('assignedTo', 'firstName lastName')
    .sort('-createdAt')
    .skip((page - 1) * limit)
    .limit(Number(limit));

  return ApiResponse.paginated(res, 'Leads fetched', leads, page, limit, total);
});

// @desc   Get lead
// @route  GET /api/v1/leads/:id
exports.getLead = asyncHandler(async (req, res, next) => {
  const lead = await Lead.findById(req.params.id)
    .populate('courseInterested')
    .populate('assignedTo notes.addedBy', 'firstName lastName');
  if (!lead) return next(new AppError('Lead not found', 404));
  return ApiResponse.success(res, 200, 'Lead fetched', { lead });
});

// @desc   Update lead status / assign
// @route  PATCH /api/v1/leads/:id
exports.updateLead = asyncHandler(async (req, res, next) => {
  const updates = { ...req.body };
  if (updates.status === 'contacted' && !updates.contactedAt) updates.contactedAt = new Date();
  if (updates.status === 'converted' && !updates.convertedAt) updates.convertedAt = new Date();

  const lead = await Lead.findByIdAndUpdate(req.params.id, updates, { new: true });
  if (!lead) return next(new AppError('Lead not found', 404));
  return ApiResponse.success(res, 200, 'Lead updated', { lead });
});

// @desc   Add note to lead
// @route  POST /api/v1/leads/:id/notes
exports.addNote = asyncHandler(async (req, res, next) => {
  const lead = await Lead.findById(req.params.id);
  if (!lead) return next(new AppError('Lead not found', 404));

  lead.notes.push({ text: req.body.text, addedBy: req.user._id });
  await lead.save();
  return ApiResponse.success(res, 200, 'Note added', { lead });
});

// @desc   Delete lead
// @route  DELETE /api/v1/leads/:id
exports.deleteLead = asyncHandler(async (req, res, next) => {
  const lead = await Lead.findByIdAndDelete(req.params.id);
  if (!lead) return next(new AppError('Lead not found', 404));
  return ApiResponse.success(res, 200, 'Lead deleted');
});
