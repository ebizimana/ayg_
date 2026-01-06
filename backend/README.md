# AYG — Achieve Your Grade 🎓

AYG (Achieve Your Grade) is a **grade intelligence web application** that helps students understand **what grades they need to earn** in order to achieve their desired class grades and GPA.

Unlike basic grade trackers, AYG focuses on **forward-looking calculations**, answering questions like:

* *“What do I need on the remaining assignments to get an A?”*
* *“How many points can I still lose and keep my goal grade?”*
* *“How will this semester affect my overall GPA?”*

---

## ✨ Core Features (MVP)

### 🔐 Authentication

* Email & password authentication
* Secure password hashing
* JWT-based authorization
* Protected API routes

---

### 📚 Academic Structure

AYG models a real academic environment:

* **Semesters**
* **Courses**
* **Grade categories** (e.g. Homework, Exams, Quizzes)
* **Assignments**
* **Grades**

All data is **user-owned and scoped**, ensuring privacy and correctness.

---

### 📊 Grade Intelligence Engine (In Progress)

AYG is designed around **calculation, not just storage**.

Planned capabilities:

* Current weighted grade per course
* Required scores to reach a target grade (A/B/C)
* “Points left to lose” before missing a goal
* What-if scenarios at:

  * Assignment level
  * Course level
  * Semester level

---

### 🎓 GPA Tracking (Planned)

* Semester GPA calculation
* Cumulative GPA
* Future GPA projection based on current performance

---

## 🛠️ Tech Stack

### Backend

* **NestJS** — scalable Node.js framework
* **Prisma ORM** — type-safe database access
* **PostgreSQL** — relational database (Dockerized)
* **JWT** — authentication & authorization
* **bcrypt** — password hashing

### Tooling

* Docker (Postgres)
* npm
* ESLint
* TypeScript

---

## 📂 Project Structure

```text
ayg/
├── prisma/                 # Prisma schema & migrations
├── src/
│   ├── modules/
│   │   ├── auth/           # Authentication logic
│   │   └── users/          # User domain
│   ├── prisma/             # Prisma service
│   ├── common/             # Guards, decorators (shared)
│   └── health.controller.ts
├── docker-compose.yml
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🚀 Getting Started (Local Development)

### Prerequisites

* Node.js (LTS)
* Docker
* npm

---

### 1️⃣ Clone the repository

```bash
git clone https://github.com/<your-username>/ayg.git
cd ayg
```

---

### 2️⃣ Install dependencies

```bash
npm install
```

---

### 3️⃣ Start PostgreSQL (Docker)

```bash
docker compose up -d
```

---

### 4️⃣ Environment variables

Create a `.env` file in the root:

```env
DATABASE_URL="postgresql://ayg:ayg_password@localhost:5432/ayg?schema=public"
JWT_SECRET="your_dev_secret"
```

---

### 5️⃣ Prisma setup

```bash
npx prisma generate
npx prisma migrate dev
```

---

### 6️⃣ Start the server

```bash
npm run start:dev
```

---

### 7️⃣ Health check

```bash
curl http://localhost:3000/health
```

Expected response:

```json
{ "ok": true }
```

---

## 🔑 Authentication Endpoints

### Register

```http
POST /auth/register
```

```json
{
  "email": "student@example.com",
  "password": "password123"
}
```

---

### Login

```http
POST /auth/login
```

Returns:

```json
{
  "user": { "id": "...", "email": "..." },
  "accessToken": "JWT_TOKEN"
}
```

---

### Protected Route Example

```http
GET /auth/me
Authorization: Bearer <JWT_TOKEN>
```

---

## 🧠 Vision & Roadmap

### Short Term

* Semester CRUD
* Course CRUD
* Assignment & grade management
* Grade calculations

### Mid Term

* GPA projections
* What-if simulations
* UI dashboard

### Long Term

* Canvas / Blackboard integration
* Automated grade syncing
* Mobile app (iOS / Android)

---

## 📌 Status

🚧 **Active Development**
AYG is currently in MVP backend development. APIs and data models are evolving.

---

## 👤 Author

**Elie Bizimana**
Software Engineer
GitHub: [https://github.com/ebizimana](https://github.com/ebizimana)

---

## 📝 License

TBD (MIT planned)


Absolutely — this is a great “zoom-out” moment.
I’ll give you a **clean, end-to-end phase roadmap**, from where you are **right now** all the way to a “done” product, without fluff.

---

# AYG — Full Project Phases (Backend → Frontend → Launch)

You are currently at **Phase 2, ~40% complete on the backend**.

---

## 🔵 PHASE 1 — Foundation (COMPLETED ✅)

**Status: DONE**

You’ve already shipped this.

* Project setup (NestJS, TypeScript)
* PostgreSQL (Docker)
* Prisma ORM
* Auth (email/password, JWT)
* User scoping & guards
* Clean modular architecture

🎉 This phase is often where projects die — you’re past it.

---

## 🔵 PHASE 2 — Academic Data Model (IN PROGRESS 🚧)

**Goal:** Accurately model how school works.

### Already done:

* Semesters
* Courses
* Grade Categories (+ weight guardrails)

### Still to build (next):

* Assignments
* Assignment scores
* Extra credit handling
* Drop-lowest logic (category level)

Once this phase is complete, **AYG can represent any syllabus**.

---

## 🔵 PHASE 3 — Grade Engine (CORE INTELLIGENCE 🧠)

**This is the heart of AYG.**

### What the Grade Engine does:

* Calculate current weighted grade
* Calculate remaining possible points
* Predict required scores to hit a goal grade
* Calculate “points left to lose”
* Support what-if scenarios

### Outputs:

* Current grade %
* Current letter grade
* Required average on remaining work
* Feasibility check (possible / impossible)

This is where AYG becomes **more than a CRUD app**.

---

## 🔵 PHASE 4 — GPA Engine 🎓

**Zoom out from classes to semesters and beyond.**

### Capabilities:

* Semester GPA
* Cumulative GPA
* Credit-weighted GPA
* Future GPA projection
* “What happens if I get an A/B/C in this class?”

This phase makes AYG *strategic*, not just reactive.

---

## 🔵 PHASE 5 — API Stabilization & Documentation

**Turn a working system into a consumable product.**

* API versioning (`/api/v1`)
* Error standardization
* DTO validation (class-validator)
* OpenAPI / Swagger docs
* Performance pass (queries & indexes)

At this point:

> Backend is production-ready.

---

## 🔵 PHASE 6 — Frontend (Web App) 🖥️

**Make it usable by real humans.**

### Initial UI:

* Auth screens
* Dashboard
* Semester → Course → Category → Assignment flow
* Visual grade breakdowns
* Warnings (“You are at risk of missing your goal”)

### Tech (likely):

* React (Next.js or Vite)
* Tailwind / shadcn
* Charting (grades & projections)

Backend already supports this cleanly.

---

## 🔵 PHASE 7 — Grade Automation (Advanced 🚀)

**Optional but powerful.**

* Canvas / Blackboard integration
* Auto-sync assignments
* Background jobs
* Notifications

This turns AYG into a **set-and-forget** assistant.

---

## 🔵 PHASE 8 — Mobile App 📱

Only after web is stable.

* React Native / Expo
* Same backend
* Push notifications

---

## 🔵 PHASE 9 — Launch & Polish 🏁

**Turn it into a real product.**

* Production deployment
* Domain + SSL
* Logging & monitoring
* User feedback loop
* Iteration

---

# Visual Summary

```
[ Auth & DB ] ✅
      ↓
[ Academic Models ] 🚧
      ↓
[ Grade Engine ] 🧠
      ↓
[ GPA Engine ] 🎓
      ↓
[ API Hardening ]
      ↓
[ Web App ]
      ↓
[ Automation ]
      ↓
[ Mobile ]
      ↓
[ Launch ]
```

---

## 🧠 Strategic Insight (important)

You are building AYG **in the correct order**:

* Structure first
* Intelligence second
* UI last




