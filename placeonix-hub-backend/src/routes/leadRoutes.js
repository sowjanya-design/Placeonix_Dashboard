const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const ctrl = require('../controllers/leadController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

// PUBLIC route — anyone can submit a lead from the website
router.post(
  '/',
  [
    body('firstName').notEmpty(),
    body('lastName').notEmpty(),
    body('email').isEmail(),
    body('phone').notEmpty(),
  ],
  validate,
  ctrl.createLead
);

// Admin-only routes
router.use(protect, authorize('admin'));

router.get('/', ctrl.listLeads);
router.get('/:id', ctrl.getLead);
router.patch('/:id', ctrl.updateLead);
router.post('/:id/notes', ctrl.addNote);
router.delete('/:id', ctrl.deleteLead);

module.exports = router;
