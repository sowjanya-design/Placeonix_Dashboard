/*
 * Placeonix Hub — Payment model.
 * A fee payment against an enrollment: amount, method, status and timestamps.
 */
const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    enrollment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Enrollment',
      required: true,
      index: true,
    },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    method: {
      type: String,
      enum: ['cash', 'upi', 'card', 'bank_transfer', 'razorpay', 'stripe', 'other'],
      required: true,
    },

    transactionId: { type: String, unique: true, sparse: true },
    gatewayTransactionId: String, // razorpay/stripe id
    invoiceNumber: { type: String, unique: true, sparse: true },

    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'partial-refund'],
      default: 'pending',
      index: true,
    },
    paidOn: Date,

    installmentNumber: Number, // 1, 2, 3, etc
    notes: String,
    receiptUrl: String,

    refund: {
      amount: Number,
      reason: String,
      refundedOn: Date,
      refundTransactionId: String,
    },

    receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    metadata: { type: Map, of: String },
  },
  { timestamps: true }
);

/** Before save: generate a unique invoice number (PLX/{year}/######) for new records. */
paymentSchema.pre('save', async function (next) {
  if (this.isNew && !this.invoiceNumber) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('Payment').countDocuments();
    this.invoiceNumber = `PLX/${year}/${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Payment', paymentSchema);
