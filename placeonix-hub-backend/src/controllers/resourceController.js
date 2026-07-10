/*
 * Placeonix Hub — Resource controller.
 * CRUD for learning resources plus download/open tracking.
 */
const Resource = require('../models/Resource');
const Enrollment = require('../models/Enrollment');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { deleteFile, buildFileUrl } = require('../services/uploadService');
const path = require('path');

// @desc   List resources (filtered by access)
// @route  GET /api/v1/resources
/** List learning resources. */
exports.listResources = asyncHandler(async (req, res) => {
  const { course, batch, type, search, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (course) filter.course = course;
  if (batch) filter.batch = batch;
  if (type) filter.type = type;
  if (search) filter.$text = { $search: search };

  // Filter by access level for non-admin
  if (req.user.role === 'student') {
    const enrollments = await Enrollment.find({ student: req.user._id }).select('course batch');
    const courseIds = enrollments.map((e) => e.course);

    filter.$or = [
      { accessLevel: 'public' },
      {
        accessLevel: 'enrolled',
        $or: [{ course: { $in: courseIds } }, { course: null }],
      },
    ];
  } else if (req.user.role === 'mentor') {
    filter.accessLevel = { $in: ['public', 'enrolled', 'mentor-only'] };
  }

  const total = await Resource.countDocuments(filter);
  const resources = await Resource.find(filter)
    .populate('course', 'title')
    .populate('uploadedBy', 'firstName lastName')
    .sort('-createdAt')
    .skip((page - 1) * limit)
    .limit(Number(limit));

  return ApiResponse.paginated(res, 'Resources fetched', resources, page, limit, total);
});

// @desc   Get single resource
// @route  GET /api/v1/resources/:id
/** Get one resource. */
exports.getResource = asyncHandler(async (req, res, next) => {
  const resource = await Resource.findByIdAndUpdate(
    req.params.id,
    { $inc: { views: 1 } },
    { new: true }
  ).populate('course uploadedBy', 'title firstName lastName');

  if (!resource) return next(new AppError('Resource not found', 404));
  return ApiResponse.success(res, 200, 'Resource fetched', { resource });
});

// @desc   Upload resource (mentor / admin)
// @route  POST /api/v1/resources
/** Add a learning resource. */
exports.createResource = asyncHandler(async (req, res, next) => {
  let fileData = {};
  if (req.file) {
    fileData = {
      fileUrl: buildFileUrl(req, req.file.filename, 'documents'),
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
    };

    // Auto-detect type
    const ext = path.extname(req.file.originalname).toLowerCase().slice(1);
    if (['pdf'].includes(ext)) req.body.type = 'pdf';
    else if (['mp4', 'mov', 'avi'].includes(ext)) req.body.type = 'video';
    else if (['zip', 'rar', '7z'].includes(ext)) req.body.type = 'archive';
    else if (['doc', 'docx', 'ppt', 'pptx', 'xlsx'].includes(ext)) req.body.type = 'document';
    else if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) req.body.type = 'image';
  }

  if (!req.file && !req.body.externalUrl) {
    return next(new AppError('Either file or external URL is required', 400));
  }

  const resource = await Resource.create({
    ...req.body,
    ...fileData,
    uploadedBy: req.user._id,
  });

  return ApiResponse.created(res, 'Resource uploaded', { resource });
});

// @desc   Update resource
// @route  PATCH /api/v1/resources/:id
/** Update a resource. */
exports.updateResource = asyncHandler(async (req, res, next) => {
  const resource = await Resource.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!resource) return next(new AppError('Resource not found', 404));
  return ApiResponse.success(res, 200, 'Resource updated', { resource });
});

// @desc   Delete resource
// @route  DELETE /api/v1/resources/:id
/** Delete a resource. */
exports.deleteResource = asyncHandler(async (req, res, next) => {
  const resource = await Resource.findById(req.params.id);
  if (!resource) return next(new AppError('Resource not found', 404));

  // Delete file from disk if exists
  if (resource.fileUrl) {
    const filename = resource.fileUrl.split('/').pop();
    const filepath = path.join(process.env.FILE_UPLOAD_PATH || './uploads', 'documents', filename);
    deleteFile(filepath);
  }

  await resource.deleteOne();
  return ApiResponse.success(res, 200, 'Resource deleted');
});

// @desc   Track download
// @route  POST /api/v1/resources/:id/download
/** Record a resource download/open and return its URL. */
exports.trackDownload = asyncHandler(async (req, res, next) => {
  const resource = await Resource.findByIdAndUpdate(
    req.params.id,
    { $inc: { downloads: 1 } },
    { new: true }
  );
  if (!resource) return next(new AppError('Resource not found', 404));
  return ApiResponse.success(res, 200, 'Download tracked', {
    downloadUrl: resource.fileUrl || resource.externalUrl,
  });
});
