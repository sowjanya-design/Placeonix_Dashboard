/*
 * Placeonix Hub — Alumni routes (/api/v1/alumni).
 * Alumni success-story CRUD.
 */
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/alumniController');

router.use(protect);

router.get('/', ctrl.listAlumni); // all roles can view the showcase
router.post('/', authorize('admin'), ctrl.createAlumni);
router.patch('/:id', authorize('admin'), ctrl.updateAlumni);
router.delete('/:id', authorize('admin'), ctrl.deleteAlumni);

module.exports = router;
