# GUARDIUM - Cyber Security Breach Detection App

## Quick Start

*Double-click start-guardium.bat* to launch the application!

The batch file will:
- Install dependencies (if needed)
- Start the secure backend server
- Open GUARDIUM in your browser

## Access Your App

Once started, visit: *http://localhost:3000*

## Security Features

- *Password Hashing*: bcrypt with salt rounds 12
- *Input Validation*: express-validator on all forms
- *Rate Limiting*: 100 requests/15min globally, 10 auth/15min
- *CORS Protection*: Restricted to frontend origin
- *Security Headers*: Helmet middleware configured
- *XSS Protection*: express-xss-clean active
- *NoSQL Injection Prevention*: express-mongo-sanitize
- *HTTP Parameter Pollution Protection*: hpp middleware

## Tech Stack

- *Backend*: Node.js + Express
- *Database*: MongoDB
- *Authentication*: JWT tokens
- *AI Analysis*: Google Gemini API
- *Breach Detection*: XposedOrNot API
- *Security*: bcrypt, helmet, rate limiting, input validation

## Project Structure


hackthon/
├── backend/          
│   ├── routes/      
│   ├── models/       
│   ├── middleware/   
│   ├── services/     
│   └── server.js     
├── frontend/         
│   ├── index.html    
│   ├── style.css    
│   └── script.js     
└── start-guardium.bat 


## Features

- *Real-time Breach Detection* - Check emails against known data breaches
- *AI-Powered Analysis* - Google Gemini provides intelligent security recommendations
- *Secure Authentication* - Optional user accounts with saved breach history
- *Animated UI* - Modern interface with particles, scanning effects, and AI assistant
- *Risk Assessment* - Detailed security risk scoring and actionable advice

## Manual Setup (Alternative)

If you prefer manual setup:

bash
# Backend setup
cd backend
npm install
npm start

# Frontend is served automatically at http://localhost:3000


## API Endpoints

- GET /health - Server health check
- POST /auth/register - User registration
- POST /auth/login - User authentication
- GET /breach/check-email/:email - Breach scanning
- POST /ai/suggest - AI security advice

## Security Best Practices Implemented

- Password complexity requirements
- JWT token expiration (1 hour)
- Rate limiting on all endpoints
- Input sanitization and validation
- Secure HTTP headers
- CORS origin restrictions
- MongoDB injection prevention
- XSS attack protection

