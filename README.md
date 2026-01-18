# AYG: Achieve Your Grade

AYG is a grade intelligence web application that helps students see what scores they need to reach their target course grades and GPA. The stack is split into a NestJS/Prisma backend and a Vite/React frontend.

## Repository layout
- `backend/` — NestJS API with Prisma ORM and PostgreSQL (Docker)
- `frontend/` — Vite + React + TypeScript + Tailwind + shadcn-ui

## Prerequisites
- Node.js (LTS) and npm
- Docker (for the local PostgreSQL instance)

## Backend setup
1) `cd backend`
2) `npm install`
3) `docker compose up -d` to start PostgreSQL
4) Create `.env`:
   ```
   DATABASE_URL="postgresql://ayg:ayg_password@localhost:5432/ayg?schema=public"
   JWT_SECRET="your_dev_secret"
   ```
5) `npx prisma generate` then `npx prisma migrate dev`
6) `npm run start:dev` (API serves on port 3000; health check at `/health`)

Useful scripts: `npm test`, `npm run lint`, `npm run build`.

## Frontend setup
1) `cd frontend`
2) `npm install`
3) `npm run dev` (defaults to port 5173)

Other scripts: `npm run build`, `npm run preview`, `npm run lint`.

## Notes and roadmap
- Current focus: completing academic models, then grade and GPA engines.
- Planned: what-if grade simulations, GPA projections, and integrations (Canvas/Blackboard).

## Deployment (Fly.io)
### Backend (NestJS)
1) Install the Fly CLI and sign in: `flyctl auth login`
2) From `backend/`, set your app name in `fly.toml` (replace `ayg-backend`)
3) Set secrets (example):
   - `flyctl secrets set DATABASE_URL="postgres://..."`
   - `flyctl secrets set JWT_SECRET="your_strong_secret"`
   - `flyctl secrets set CORS_ORIGIN="https://your-frontend-domain.com"`
4) Deploy: `flyctl deploy`
5) Check health: `flyctl status` and `https://<your-backend-domain>/health`

### Frontend (Vite)
1) From `frontend/`, set your app name in `fly.toml` (replace `ayg-frontend`)
2) Set the API URL in `frontend/fly.toml` under `[build.args] VITE_API_URL`
3) Deploy: `flyctl deploy`
4) Visit the generated Fly URL for the frontend

Notes:
- `backend/fly.toml` runs `npx prisma migrate deploy` on release.
- The frontend build arg is required because Vite bakes `VITE_API_URL` at build time.

## License
TBD (MIT planned).
