# Notepad App

Full-stack notepad: React + Express + MongoDB. Authenticated users create, edit, tag, search, pin, archive, and trash their own notes.

## Structure

- `backend/` — Express API, Mongoose models, JWT auth (httpOnly cookie)
- `frontend/` — React (Vite) + Tailwind, React Router

## Local setup

### 1. MongoDB Atlas

Create a free M0 cluster at https://www.mongodb.com/cloud/atlas, add a database user, allow your IP (or `0.0.0.0/0` for dev), and copy the connection string.

### 2. Backend

```bash
cd backend
cp .env.example .env
# fill in MONGODB_URI and JWT_SECRET in .env
npm install
npm run dev
```

Runs on http://localhost:5000.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs on http://localhost:5173, proxies `/api` requests to the backend during dev.

## Deploy

- **Frontend → Vercel**: import the repo, set root directory to `frontend`, framework preset "Vite". Add env var `VITE_API_URL` pointing at the deployed Render backend (e.g. `https://your-api.onrender.com/api`).
- **Backend → Render**: new Web Service, root directory `backend`, build command `npm install`, start command `npm start`. Add env vars `MONGODB_URI`, `JWT_SECRET`, `CLIENT_ORIGIN` (your Vercel URL), `NODE_ENV=production`.
- **Database → MongoDB Atlas**: free M0 cluster, used by the Render backend via `MONGODB_URI`.

Render's free tier spins down after 15 minutes idle — first request after a gap takes ~30-60s to wake up.
