from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
from sklearn.linear_model import LinearRegression

app = Flask(__name__)
CORS(app) # Enable CORS for all routes

@app.route('/api/forecast', methods=['POST'])
def forecast():
    data = request.json
    if not data or 'products' not in data:
        return jsonify({'error': 'Invalid request format. Expected {"products": [...] }'}), 400

    results = []
    
    for product in data['products']:
        product_id = product.get('productId')
        name = product.get('name')
        current_stock = product.get('currentStock', 0)
        history = product.get('history', [])
        
        # If not enough history, provide a basic fallback
        if len(history) < 3:
            # Not enough data for meaningful regression, just use average
            avg_usage = sum(history) / len(history) if history else 0
            predicted_demand_next_7_days = max(0, avg_usage * 7)
        else:
            # Prepare data for Scikit-learn Linear Regression
            # X = days (0, 1, 2, ...), y = usage
            X = np.array(range(len(history))).reshape(-1, 1)
            y = np.array(history)
            
            model = LinearRegression()
            model.fit(X, y)
            
            # Predict the next 7 days (e.g., if we have 7 days of history, we predict days 7 to 13)
            future_X = np.array(range(len(history), len(history) + 7)).reshape(-1, 1)
            predictions = model.predict(future_X)
            
            # Sum up the predicted demand for the next 7 days
            predicted_demand_next_7_days = max(0, float(sum(predictions)))
            
        # Calculate dynamic reorder level (Predicted demand + 20% safety stock)
        # Ensure a minimum reorder level of 5 just to be safe
        recommended_reorder_level = max(5, int(predicted_demand_next_7_days * 1.2))
        
        # Calculate optimal restock quantity if we hit the reorder level
        # A simple EOQ (Economic Order Quantity) proxy: order enough for 14 days
        suggested_restock_qty = max(10, int((predicted_demand_next_7_days / 7) * 14))

        results.append({
            'productId': product_id,
            'name': name,
            'currentStock': current_stock,
            'predictedDemand7Days': round(predicted_demand_next_7_days, 1),
            'recommendedReorderLevel': recommended_reorder_level,
            'suggestedRestockQty': suggested_restock_qty,
            'alertStatus': 'CRITICAL' if current_stock == 0 else ('LOW' if current_stock < recommended_reorder_level else 'HEALTHY')
        })
        
    return jsonify({'forecasts': results, 'status': 'success'})

@app.route('/', methods=['GET'])
def health_check():
    return jsonify({'status': 'AI Service is running!'})

if __name__ == '__main__':
    # Run on port 5001 to avoid conflicting with Node backend on 5000
    app.run(host='0.0.0.0', port=5001, debug=False)
