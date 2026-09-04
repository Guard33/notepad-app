# Notepad App

**Live:** https://notepad-app-brown.vercel.app

Full-stack notepad: React + Express + MongoDB. Sign up, then write, tag, search, pin, archive, and trash/restore your own notes — all scoped to your account.

> The backend runs on Render's free tier, which sleeps after 15 minutes idle. If the app hasn't been visited recently, the first request can take 30-60 seconds to wake it up before it responds — that's expected, not a bug.

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

Currently deployed as:

- **Frontend → Vercel**: root directory `frontend`, framework preset "Vite". Env var `VITE_API_URL` points at the Render backend (`https://<render-app>.onrender.com/api`).
- **Backend → Render**: root directory `backend`, build command `npm install`, start command `npm start`. Env vars: `MONGODB_URI`, `JWT_SECRET`, `CLIENT_ORIGIN` (the Vercel URL), `NODE_ENV=production`.
- **Database → MongoDB Atlas**: free M0 cluster, used by the Render backend via `MONGODB_URI`.

To fork and redeploy your own copy, follow the same setup — new Vercel project, new Render web service, new Atlas cluster, wiring the env vars above between them.
