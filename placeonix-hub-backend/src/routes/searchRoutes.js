/*
 * Placeonix Hub — Search routes (/api/v1/search).
 * The single global-search endpoint for the topbar.
 */
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/searchController');

router.use(protect, authorize('admin', 'mentor'));
router.get('/', ctrl.globalSearch);

module.exports = router;
