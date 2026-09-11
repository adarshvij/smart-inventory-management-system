const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true
    },
    sku: {
      type: String,
      required: [true, 'SKU is required'],
      trim: true,
      uppercase: true
    },
    quantity: {
      type: Number,
      required: true,
      min: [0, 'Quantity cannot be negative'],
      default: 0
    },
    reorderLevel: {
      type: Number,
      required: true,
      min: [0, 'Reorder level cannot be negative'],
      default: 0
    },
    unitPrice: {
      type: Number,
      required: true,
      min: [0, 'Unit price cannot be negative'],
      default: 0
    },
    imageUrl: {
      type: String,
      trim: true,
      default: ''
    }
  },
  { timestamps: true }
);

// Compound index: SKU must be unique per user (not globally)
productSchema.index({ userId: 1, sku: 1 }, { unique: true });

module.exports = mongoose.model('Product', productSchema);
