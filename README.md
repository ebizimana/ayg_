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

