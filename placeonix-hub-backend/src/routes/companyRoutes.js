const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/companyController');

router.use(protect);

router.get('/', authorize('admin', 'mentor'), ctrl.listCompanies);
router.post('/', authorize('admin'), ctrl.createCompany);
router.patch('/:id', authorize('admin'), ctrl.updateCompany);
router.delete('/:id', authorize('admin'), ctrl.deleteCompany);

module.exports = router;
