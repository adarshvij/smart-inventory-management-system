const Movement = require('../models/Movement');

// GET /api/movements — get recent movements for the logged-in user
exports.getMovements = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 300, 500);
    const movements = await Movement.find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .limit(limit);

    return res.status(200).json(movements);
  } catch (error) {
    console.error('Get movements error:', error);
    return res.status(500).json({ message: 'Failed to fetch movements.' });
  }
};
