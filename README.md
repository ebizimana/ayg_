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

## License
TBD (MIT planned).
