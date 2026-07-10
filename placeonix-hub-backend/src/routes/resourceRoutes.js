/*
 * Placeonix Hub — Resource routes (/api/v1/resources).
 * Resource CRUD plus download tracking.
 */
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/resourceController');
const { protect, authorize } = require('../middleware/auth');
const { documentUpload } = require('../services/uploadService');

router.use(protect);

router.get('/', ctrl.listResources);
router.get('/:id', ctrl.getResource);
router.post('/:id/download', ctrl.trackDownload);

router.post(
  '/',
  authorize('mentor', 'admin'),
  documentUpload.single('file'),
  ctrl.createResource
);
router.patch('/:id', authorize('mentor', 'admin'), ctrl.updateResource);
router.delete('/:id', authorize('mentor', 'admin'), ctrl.deleteResource);

module.exports = router;
