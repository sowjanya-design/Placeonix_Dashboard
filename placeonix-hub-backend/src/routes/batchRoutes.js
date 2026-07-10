/*
 * Placeonix Hub — Batch routes (/api/v1/batches).
 * Batch CRUD plus student enroll/unenroll. Writes are admin-only.
 */
const express = require('express');
const router = express.Router();
const batchCtrl = require('../controllers/batchController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/', batchCtrl.listBatches);
router.get('/:id', batchCtrl.getBatch);

router.post('/', authorize('admin'), batchCtrl.createBatch);
router.patch('/:id', authorize('admin'), batchCtrl.updateBatch);
router.delete('/:id', authorize('admin'), batchCtrl.deleteBatch);

router.post('/:id/enroll', authorize('admin'), batchCtrl.enrollStudent);
router.delete('/:id/enroll/:studentId', authorize('admin'), batchCtrl.unenrollStudent);

module.exports = router;
