/*
 * Placeonix Hub — Upload service.
 * Multer storage/config for file uploads. Writes to /tmp on serverless (read-only
 * FS elsewhere), filters by type/size, and builds public file URLs.
 */
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const AppError = require('../utils/AppError');

// On serverless platforms (Vercel/Lambda) the project dir is read-only — only
// /tmp is writable. Pick a writable path and never let mkdir crash module load.
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
const uploadDir = process.env.FILE_UPLOAD_PATH || (isServerless ? '/tmp/uploads' : './uploads');
try {
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
} catch (e) {
  // read-only filesystem — disk uploads won't work here (use S3/Cloudinary), but boot must not crash
}

// Subdirectories per resource type
/** Make sure an upload sub-directory exists (tolerant of read-only serverless FS). */
const ensureDir = (subdir) => {
  const dir = path.join(uploadDir, subdir);
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  } catch (e) { /* read-only fs */ }
  return dir;
};

/** Multer disk-storage config for a given sub-directory. */
const storage = (subdir) =>
  multer.diskStorage({
    destination: (req, file, cb) => cb(null, ensureDir(subdir)),
    filename: (req, file, cb) => {
      const hash = crypto.randomBytes(8).toString('hex');
      const ext = path.extname(file.originalname).toLowerCase();
      const safeName = path.basename(file.originalname, ext)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .substring(0, 40);
      cb(null, `${Date.now()}-${hash}-${safeName}${ext}`);
    },
  });

/** Multer filter that only accepts the allowed MIME types. */
const fileFilter = (allowedTypes) => (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase().slice(1);
  if (allowedTypes.includes(ext)) return cb(null, true);
  cb(new AppError(`File type .${ext} not allowed. Allowed: ${allowedTypes.join(', ')}`, 400));
};

const maxSize = (Number(process.env.MAX_FILE_UPLOAD) || 10) * 1024 * 1024;

// ── Pre-configured uploaders ──

const avatarUpload = multer({
  storage: storage('avatars'),
  fileFilter: fileFilter(['jpg', 'jpeg', 'png', 'webp']),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
});

const documentUpload = multer({
  storage: storage('documents'),
  fileFilter: fileFilter(['pdf', 'doc', 'docx', 'txt']),
  limits: { fileSize: maxSize },
});

const submissionUpload = multer({
  storage: storage('submissions'),
  fileFilter: fileFilter(['pdf', 'zip', 'png', 'jpg', 'jpeg', 'doc', 'docx', 'txt']),
  limits: { fileSize: maxSize },
});

const courseAssetUpload = multer({
  storage: storage('courses'),
  fileFilter: fileFilter(['jpg', 'jpeg', 'png', 'webp', 'mp4', 'pdf']),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB for videos
});

// ── Helpers ──

/** Build the public URL for an uploaded file. */
const buildFileUrl = (req, filename, subdir) =>
  `${req.protocol}://${req.get('host')}/uploads/${subdir}/${filename}`;

/** Remove an uploaded file from disk (best-effort). */
const deleteFile = (filepath) => {
  try {
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      return true;
    }
  } catch (err) {
    console.error(`Failed to delete file ${filepath}:`, err.message);
  }
  return false;
};

module.exports = {
  avatarUpload,
  documentUpload,
  submissionUpload,
  courseAssetUpload,
  buildFileUrl,
  deleteFile,
  uploadDir,
};
