const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { getMovements } = require('../controllers/movementController');

// All routes protected
router.use(authMiddleware);

router.get('/', getMovements);

module.exports = router;
