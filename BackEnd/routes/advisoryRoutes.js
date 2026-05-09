const express = require('express');
const router = express.Router();
const { getAdvisoryDashboard } = require('../controllers/advisoryController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', authMiddleware, getAdvisoryDashboard);

module.exports = router;
