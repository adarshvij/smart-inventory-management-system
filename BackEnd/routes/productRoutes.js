const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  adjustStock,
  bulkRestock
} = require('../controllers/productController');

// All routes protected
router.use(authMiddleware);

router.get('/', getProducts);
router.post('/', createProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);
router.patch('/:id/adjust', adjustStock);
router.post('/bulk-restock', bulkRestock);

module.exports = router;
