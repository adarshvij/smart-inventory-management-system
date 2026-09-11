const Product = require('../models/Product');
const Movement = require('../models/Movement');
const axios = require('axios');

exports.getAdvisoryDashboard = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // 1. Fetch all products
    const products = await Product.find({ userId });
    
    if (!products.length) {
      return res.status(200).json({
        forecasts: [],
        turnoverRate: 0,
        message: 'No products found to analyze.'
      });
    }

    // 2. Prepare historical data for AI service
    const productPayloads = [];
    let totalOutLast30Days = 0;
    let totalCurrentStock = 0;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    for (const product of products) {
      totalCurrentStock += product.quantity;
      
      // Get OUT movements for this product, sorted ascending by date
      const movements = await Movement.find({
        userId,
        productId: product._id,
        type: 'OUT',
        createdAt: { $gte: thirtyDaysAgo }
      }).sort({ createdAt: 1 });
      
      // Group by day to create a timeseries array
      const historyByDay = {};
      
      movements.forEach(m => {
        totalOutLast30Days += Math.abs(m.delta);
        
        // Use YYYY-MM-DD as key
        const dateKey = m.createdAt.toISOString().split('T')[0];
        historyByDay[dateKey] = (historyByDay[dateKey] || 0) + Math.abs(m.delta);
      });
      
      // Convert to a simple array of chronological usage
      const historyArray = Object.values(historyByDay);
      
      productPayloads.push({
        productId: product._id,
        name: product.name,
        currentStock: product.quantity,
        history: historyArray
      });
    }

    // Calculate basic turnover rate (proxy)
    // Formula: Total units sold / Average stock (approximated here by current stock + half of sold)
    const avgStockProxy = totalCurrentStock + (totalOutLast30Days / 2);
    const turnoverRate = avgStockProxy === 0 ? 0 : (totalOutLast30Days / avgStockProxy).toFixed(2);

    // 3. Call the Python AI Microservice
    let aiResponse;
    try {
      // Connect to the Flask service running on port 5001
      const response = await axios.post('${process.env.AI_SERVICE_URL}/api/forecast', {
        products: productPayloads
      });
      aiResponse = response.data;
    } catch (aiError) {
      console.error('AI Service Error:', aiError.message);
      return res.status(503).json({
        message: 'AI Advisory Service is currently unavailable. Ensure the Python microservice is running on port 5001.',
        error: aiError.message
      });
    }

    // 4. Return the combined insights
    res.status(200).json({
      turnoverRate: parseFloat(turnoverRate),
      totalSold30Days: totalOutLast30Days,
      aiForecasts: aiResponse.forecasts
    });

  } catch (error) {
    console.error('Advisory Dashboard Error:', error);
    res.status(500).json({ message: 'Server error retrieving advisory data.' });
  }
};
