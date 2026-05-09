const mongoose = require('mongoose');

const movementSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    productName: {
      type: String,
      required: true
    },
    sku: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['IN', 'OUT'],
      required: true
    },
    delta: {
      type: Number,
      required: true
    },
    previousQty: {
      type: Number,
      required: true
    },
    newQty: {
      type: Number,
      required: true
    },
    note: {
      type: String,
      default: ''
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Movement', movementSchema);
