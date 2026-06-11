const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const User = require('../models/User');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { protect } = require('../middleware/auth');
const {
  avatarUpload,
  documentUpload,
  submissionUpload,
  buildFileUrl,
  deleteFile,
  uploadDir,
} = require('../services/uploadService');

router.use(protect);

// @desc   Upload my avatar
// @route  POST /api/v1/uploads/avatar
router.post(
  '/avatar',
  avatarUpload.single('avatar'),
  asyncHandler(async (req, res, next) => {
    if (!req.file) return next(new AppError('No file uploaded', 400));

    const url = buildFileUrl(req, req.file.filename, 'avatars');

    // Delete old avatar
    if (req.user.avatar) {
      const oldFilename = req.user.avatar.split('/').pop();
      const oldPath = path.join(uploadDir, 'avatars', oldFilename);
      deleteFile(oldPath);
    }

    await User.findByIdAndUpdate(req.user._id, { avatar: url });

    return ApiResponse.success(res, 200, 'Avatar uploaded', { avatar: url });
  })
);

// @desc   Upload a document
// @route  POST /api/v1/uploads/document
router.post(
  '/document',
  documentUpload.single('document'),
  asyncHandler(async (req, res, next) => {
    if (!req.file) return next(new AppError('No file uploaded', 400));

    return ApiResponse.success(res, 200, 'Document uploaded', {
      url: buildFileUrl(req, req.file.filename, 'documents'),
      filename: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
    });
  })
);

// @desc   Upload submission files (multiple)
// @route  POST /api/v1/uploads/submission
router.post(
  '/submission',
  submissionUpload.array('files', 5),
  asyncHandler(async (req, res, next) => {
    if (!req.files?.length) return next(new AppError('No files uploaded', 400));

    const files = req.files.map((f) => ({
      url: buildFileUrl(req, f.filename, 'submissions'),
      filename: f.originalname,
      size: f.size,
      mimeType: f.mimetype,
    }));

    return ApiResponse.success(res, 200, 'Files uploaded', { files });
  })
);

module.exports = router;
