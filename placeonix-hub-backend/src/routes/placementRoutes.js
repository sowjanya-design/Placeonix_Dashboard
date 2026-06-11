const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/placementController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/', ctrl.listDrives);
router.get('/my/applications', authorize('student'), ctrl.myApplications);
router.get('/:id', ctrl.getDrive);

router.post('/', authorize('admin'), ctrl.createDrive);
router.patch('/:id', authorize('admin'), ctrl.updateDrive);
router.delete('/:id', authorize('admin'), ctrl.deleteDrive);

router.post('/:id/apply', authorize('student'), ctrl.applyToDrive);
router.patch('/:id/applications/:appId', authorize('admin'), ctrl.updateApplication);

module.exports = router;
