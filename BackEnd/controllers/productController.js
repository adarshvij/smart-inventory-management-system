const Product = require('../models/Product');
const Movement = require('../models/Movement');

// Helper: create a movement record
async function recordMovement({ userId, productId, productName, sku, type, delta, previousQty, newQty, note }) {
  try {
    await Movement.create({ userId, productId, productName, sku, type, delta, previousQty, newQty, note: note || '' });
  } catch (err) {
    console.error('Failed to record movement:', err.message);
  }
}

// GET /api/products — get all products for the logged-in user
exports.getProducts = async (req, res) => {
  try {
    const products = await Product.find({ userId: req.user.userId }).sort({ createdAt: -1 });
    return res.status(200).json(products);
  } catch (error) {
    console.error('Get products error:', error);
    return res.status(500).json({ message: 'Failed to fetch products.' });
  }
};

// POST /api/products — create a new product
exports.createProduct = async (req, res) => {
  try {
    const { name, category, sku, quantity, reorderLevel, unitPrice, imageUrl } = req.body;

    if (!name || !category || !sku) {
      return res.status(400).json({ message: 'Product name, category, and SKU are required.' });
    }

    const qty = Number(quantity);
    const reorder = Number(reorderLevel);
    const price = Number(unitPrice);

    if (isNaN(qty) || qty < 0) return res.status(400).json({ message: 'Quantity must be a non-negative number.' });
    if (isNaN(reorder) || reorder < 0) return res.status(400).json({ message: 'Reorder level must be a non-negative number.' });
    if (isNaN(price) || price < 0) return res.status(400).json({ message: 'Unit price must be a non-negative number.' });
    if (!Number.isInteger(qty)) return res.status(400).json({ message: 'Quantity must be a whole number.' });
    if (!Number.isInteger(reorder)) return res.status(400).json({ message: 'Reorder level must be a whole number.' });

    // Check SKU uniqueness per user
    const existing = await Product.findOne({ userId: req.user.userId, sku: sku.toUpperCase().trim() });
    if (existing) {
      return res.status(409).json({ message: 'A product with this SKU already exists.' });
    }

    const product = await Product.create({
      userId: req.user.userId,
      name: name.trim(),
      category: category.trim(),
      sku: sku.trim().toUpperCase(),
      quantity: qty,
      reorderLevel: reorder,
      unitPrice: price,
      imageUrl: imageUrl ? imageUrl.trim() : ''
    });

    // Record initial stock movement if quantity > 0
    if (qty > 0) {
      await recordMovement({
        userId: req.user.userId,
        productId: product._id,
        productName: product.name,
        sku: product.sku,
        type: 'IN',
        delta: qty,
        previousQty: 0,
        newQty: qty,
        note: 'Initial stock on product creation'
      });
    }

    return res.status(201).json({ message: 'Product created successfully.', product });
  } catch (error) {
    console.error('Create product error:', error);
    if (error.code === 11000) {
      return res.status(409).json({ message: 'A product with this SKU already exists.' });
    }
    return res.status(500).json({ message: 'Failed to create product.' });
  }
};

// PUT /api/products/:id — update product details
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, sku, quantity, reorderLevel, unitPrice, imageUrl } = req.body;

    if (!name || !category || !sku) {
      return res.status(400).json({ message: 'Product name, category, and SKU are required.' });
    }

    const qty = Number(quantity);
    const reorder = Number(reorderLevel);
    const price = Number(unitPrice);

    if (isNaN(qty) || qty < 0) return res.status(400).json({ message: 'Quantity must be a non-negative number.' });
    if (isNaN(reorder) || reorder < 0) return res.status(400).json({ message: 'Reorder level must be a non-negative number.' });
    if (isNaN(price) || price < 0) return res.status(400).json({ message: 'Unit price must be a non-negative number.' });
    if (!Number.isInteger(qty)) return res.status(400).json({ message: 'Quantity must be a whole number.' });
    if (!Number.isInteger(reorder)) return res.status(400).json({ message: 'Reorder level must be a whole number.' });

    // Find the product (ensure it belongs to this user)
    const product = await Product.findOne({ _id: id, userId: req.user.userId });
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    // Check SKU uniqueness (excluding self)
    const skuConflict = await Product.findOne({
      userId: req.user.userId,
      sku: sku.toUpperCase().trim(),
      _id: { $ne: id }
    });
    if (skuConflict) {
      return res.status(409).json({ message: 'A product with this SKU already exists.' });
    }

    const previousQty = product.quantity;

    // Update product
    product.name = name.trim();
    product.category = category.trim();
    product.sku = sku.trim().toUpperCase();
    product.quantity = qty;
    product.reorderLevel = reorder;
    product.unitPrice = price;
    if (imageUrl !== undefined) {
      product.imageUrl = imageUrl.trim();
    }
    await product.save();

    // Record movement if quantity changed
    const delta = qty - previousQty;
    if (delta !== 0) {
      await recordMovement({
        userId: req.user.userId,
        productId: product._id,
        productName: product.name,
        sku: product.sku,
        type: delta > 0 ? 'IN' : 'OUT',
        delta,
        previousQty,
        newQty: qty,
        note: 'Quantity changed via Edit Product'
      });
    }

    return res.status(200).json({ message: 'Product updated successfully.', product });
  } catch (error) {
    console.error('Update product error:', error);
    if (error.code === 11000) {
      return res.status(409).json({ message: 'A product with this SKU already exists.' });
    }
    return res.status(500).json({ message: 'Failed to update product.' });
  }
};

// DELETE /api/products/:id — delete a product
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findOne({ _id: id, userId: req.user.userId });
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    const existingQty = product.quantity;

    await Product.deleteOne({ _id: id });

    // Record stock-out movement if had stock
    if (existingQty > 0) {
      await recordMovement({
        userId: req.user.userId,
        productId: product._id,
        productName: product.name,
        sku: product.sku,
        type: 'OUT',
        delta: -existingQty,
        previousQty: existingQty,
        newQty: 0,
        note: 'Product deleted'
      });
    }

    return res.status(200).json({ message: 'Product deleted successfully.' });
  } catch (error) {
    console.error('Delete product error:', error);
    return res.status(500).json({ message: 'Failed to delete product.' });
  }
};

// PATCH /api/products/:id/adjust — adjust stock quantity
exports.adjustStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { delta, note } = req.body;

    const normalizedDelta = Math.trunc(Number(delta || 0));
    if (normalizedDelta === 0) {
      return res.status(400).json({ message: 'Delta cannot be zero.' });
    }

    const product = await Product.findOne({ _id: id, userId: req.user.userId });
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    const previousQty = product.quantity;
    const newQty = Math.max(0, previousQty + normalizedDelta);
    const actualDelta = newQty - previousQty;

    product.quantity = newQty;
    await product.save();

    if (actualDelta !== 0) {
      await recordMovement({
        userId: req.user.userId,
        productId: product._id,
        productName: product.name,
        sku: product.sku,
        type: actualDelta > 0 ? 'IN' : 'OUT',
        delta: actualDelta,
        previousQty,
        newQty,
        note: note || 'Quick stock update'
      });
    }

    return res.status(200).json({
      message: 'Stock adjusted successfully.',
      product,
      actualDelta,
      previousQty,
      newQty
    });
  } catch (error) {
    console.error('Adjust stock error:', error);
    return res.status(500).json({ message: 'Failed to adjust stock.' });
  }
};

// POST /api/products/bulk-restock — auto-restock all low/out items
exports.bulkRestock = async (req, res) => {
  try {
    const LOW_STOCK_THRESHOLD = 10;
    const TARGET_QTY = LOW_STOCK_THRESHOLD + 10;

    const products = await Product.find({
      userId: req.user.userId,
      quantity: { $lt: LOW_STOCK_THRESHOLD }
    });

    if (products.length === 0) {
      return res.status(200).json({ message: 'No low or out-of-stock items found.', updated: [] });
    }

    const updated = [];
    for (const product of products) {
      const previousQty = product.quantity;
      const delta = TARGET_QTY - previousQty;

      product.quantity = TARGET_QTY;
      await product.save();

      await recordMovement({
        userId: req.user.userId,
        productId: product._id,
        productName: product.name,
        sku: product.sku,
        type: 'IN',
        delta,
        previousQty,
        newQty: TARGET_QTY,
        note: 'Auto Restock Low Items'
      });

      updated.push(product);
    }

    return res.status(200).json({ message: `${updated.length} item(s) restocked successfully.`, updated });
  } catch (error) {
    console.error('Bulk restock error:', error);
    return res.status(500).json({ message: 'Failed to restock items.' });
  }
};
