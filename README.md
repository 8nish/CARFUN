# CarFun — Bath Spa University Carpooling App

## Tech Stack
- **Frontend**: HTML/CSS/Vanilla JS (served by Express)
- **Backend**: Node.js + Express.js
- **Database**: MongoDB + Mongoose
- **Auth**: JWT (JSON Web Tokens) + bcrypt
- **Environment**: dotenv

## Project Structure
```
carfun/
├── server.js              # Entry point
├── .env                   # Environment variables
├── package.json
├── models/
│   ├── User.js            # Student model (driver/passenger)
│   └── Ride.js            # Ride offer model
├── routes/
│   ├── auth.js            # Register / Login
│   ├── rides.js           # CRUD for rides
│   └── users.js           # Profile, update
├── middleware/
│   └── auth.js            # JWT verification middleware
└── public/
    ├── index.html         # Main SPA
    ├── css/
    │   └── style.css
    └── js/
        └── app.js         # Frontend logic + API calls
```

## Quick Start

### 1. Install MongoDB
- **Mac**: `brew tap mongodb/brew && brew install mongodb-community && brew services start mongodb-community`
- **Windows**: Download from https://www.mongodb.com/try/download/community
- **Ubuntu**: `sudo apt install mongodb && sudo systemctl start mongodb`

### 2. Install dependencies
```bash
cd carfun
npm install
```

### 3. Configure environment
```bash
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret
```

### 4. Run the app
```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

App runs at: http://localhost:3000
