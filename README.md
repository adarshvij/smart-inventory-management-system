# Smart Inventory Management System with AI Advisory

A full-stack, intelligent inventory management web application. It features a robust Node.js/MongoDB backend, a responsive vanilla JavaScript frontend, and a dedicated Python Flask microservice that leverages machine learning for predictive demand forecasting.

---

## 🏗️ Project Structure

```text
SmartInventory/
├── backend/
│   ├── config/
│   │   └── db.js              # MongoDB connection
│   ├── controllers/
│   │   ├── authController.js  # Register, Login, Profile
│   │   ├── productController.js  # Full CRUD + stock adjust + bulk restock
│   │   └── movementController.js # Stock movement history
│   ├── middleware/
│   │   └── authMiddleware.js  # JWT verification
│   ├── models/
│   │   ├── User.js            # User schema
│   │   ├── Product.js         # Product schema (per-user isolation)
│   │   └── Movement.js        # Stock movement schema
│   ├── routes/
│   │   ├── authRoutes.js      # POST /register, POST /login, GET /profile
│   │   ├── productRoutes.js   # GET, POST, PUT, DELETE, PATCH /adjust, POST /bulk-restock
│   │   └── movementRoutes.js  # GET /movements
│   ├── .env
│   ├── server.js
│   └── package.json
│
├── ai-service/                 # AI-powered Demand Forecasting Microservice
│   ├── app.py                 # Flask server & Scikit-learn Linear Regression model
│   └── requirements.txt       # Python dependencies (Flask, scikit-learn, numpy)
│
└── frontend/
    ├── index.html             # Landing page
    ├── login.html             # Login page
    ├── signup.html            # Signup page
    ├── dashboard.html         # Dashboard with charts, AI insights & alerts
    ├── inventory.html         # Full inventory CRUD
    ├── auth.js                # Login & signup logic
    ├── dashboard.js           # Dashboard data + charts (API-connected)
    ├── inventory.js           # Inventory CRUD (API-connected)
    └── script.js              # Landing page scripts
```

---

## ✨ Features

- **AI Demand Forecasting:** Integrates a Python microservice using Scikit-Learn linear regression to predict future demand based on inventory history.
- **Smart Reorder Insights:** Dynamically calculates recommended reorder levels and suggested restock quantities.
- **User Authentication:** Secure user registration & login via JWT.
- **Isolated Data:** Per-user product data isolation persisted in MongoDB.
- **Full Inventory Control:** Complete product CRUD (create, read, update, delete) and real-time stock adjustments (+1, -1, custom delta).
- **Movement Tracking:** Automatically tracks and logs every stock movement change.
- **Interactive Dashboard:** Data visualizations using Doughnut and Bar charts.
- **Automated Actions:** Low stock / out-of-stock alerts and one-click bulk restock capabilities.
- **Modern UI:** Responsive design, dark mode toggle, and a command palette (Ctrl+K) for quick actions.

---

## 🛠️ Technology Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript, Chart.js
- **Backend:** Node.js, Express.js (v4), JWT
- **Database:** MongoDB (Mongoose)
- **AI Microservice:** Python, Flask, Scikit-Learn, NumPy, Pandas

---

## System Architecture

Frontend (HTML/CSS/JS)
        ↓
Node.js + Express REST API
        ↓
MongoDB Database

Dashboard Requests
        ↓
Python Flask AI Service
        ↓
Demand Forecast Predictions

## 🚀 Setup & Run Instructions

### 1. Database Setup
Ensure you have a MongoDB instance running locally or a MongoDB Atlas URI string.

### 2. Backend Setup (Node.js)

```bash
cd BackEnd
npm install
```

Configure your `.env` file in the `BackEnd` directory:
```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
PORT=5000
```

Start the Node backend server:
```bash
# Development (with auto-restart)
npm run dev

# Production
npm start
```
*The backend will run on `http://localhost:5000`.*

### 3. AI Service Setup (Python)

```bash
cd AIService
python -m venv .venv
# Activate virtual environment (Windows)
.venv\Scripts\activate
# Activate virtual environment (Mac/Linux)
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

Start the Flask microservice:
```bash
python app.py
```
*The AI Service will run on `http://localhost:5001` (specifically configured to avoid conflicts with the Node backend).*

### 4. Frontend Setup

The frontend operates using pure HTML/CSS/JS and does not require a build step.
Open `FrontEnd/index.html` in a modern web browser, or serve it using VS Code Live Server or any static file server.

> **Important:** Both the Node.js backend (`localhost:5000`) and the Python AI Service (`localhost:5001`) must be running simultaneously before interacting with the frontend dashboard.

---

## 📖 API Reference

### Auth Routes (Node.js)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create a new user account |
| POST | `/api/auth/login` | Authenticate user and receive JWT |
| GET | `/api/auth/profile` | Retrieve current user profile (Protected) |

### Product Routes (Node.js - Protected)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | Retrieve all products for the logged-in user |
| POST | `/api/products` | Create a new product entry |
| PUT | `/api/products/:id` | Update an existing product |
| DELETE | `/api/products/:id` | Remove a product |
| PATCH | `/api/products/:id/adjust` | Adjust product stock quantity |
| POST | `/api/products/bulk-restock` | Restock all items currently below the reorder threshold |

### Movement Routes (Node.js - Protected)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/movements` | Retrieve the 300 most recent stock movements |

### AI Service Routes (Python)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check for the AI Service |
| POST | `/api/forecast` | Accepts historical product data and returns demand predictions, reorder levels, and restock amounts |

---

## 🐛 Recent Fixes & Improvements

- **AI Service Integration:** Successfully decoupled machine learning components into a dedicated Python microservice running on port 5001 to resolve port conflicts with the Node server.
- **Dependency Stability:** Resolved numpy/scikit-learn installation failures by ensuring a stable environment configuration in `requirements.txt`.
- **Data Integrity:** Addressed a critical bug that allowed negative inventory movement values to corrupt the prediction models.
- **Database Resilience:** Added comprehensive `try-catch` blocks across all MongoDB operations in `authController.js` to prevent unhandled database crash scenarios.
- **Authentication:** Streamlined `authMiddleware.js` to correctly handle and clearly report expired vs. invalid tokens. Fixed `inventory.js` logout functionality to ensure proper cleanup of local storage tokens.
- **Express Compatibility:** Stabilized routing operations by ensuring Express 4 compatibility, avoiding breaking changes from Express 5.
