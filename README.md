# GUARDIUM

GUARDIUM is a hackathon-built cyber security assistant that helps users:

- check whether an email appears in known data breaches
- save breach history after signing in
- ask an AI assistant for practical security guidance

## Stack

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express
- Database: MongoDB
- AI: Google Gemini

## Project Structure

- `frontend/` contains the static UI
- `backend/server.js` starts the API server and serves the frontend
- `backend/routes/` contains auth, breach, and AI routes
- `backend/models/` contains the MongoDB user model
- `backend/middleware/` contains auth helpers

## Setup

1. Install backend dependencies:

```bash
cd backend
npm install
```

2. Create `backend/.env` from `backend/.env.example`.

3. Start the backend:

```bash
npm run dev
```

4. Open `http://localhost:3000`

## Environment Variables

- `MONGODB_URI` MongoDB connection string
- `JWT_SECRET` secret used to sign login tokens
- `GEMINI_API_KEY` API key for AI suggestions

## API Routes

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/breaches`
- `GET /breach/check-email/:email`
- `POST /ai/suggest`
- `GET /health`

## Current Baseline

- guest users can run breach checks from the hero section
- signed-in users can access saved breach history and the AI assistant
- anonymous recent checks are kept only for the current browser tab
- the backend now returns a cleaner, safer breach response shape
