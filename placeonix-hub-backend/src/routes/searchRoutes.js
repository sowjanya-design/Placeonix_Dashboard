const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/searchController');

router.use(protect, authorize('admin', 'mentor'));
router.get('/', ctrl.globalSearch);

module.exports = router;
