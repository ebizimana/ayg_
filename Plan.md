# AYG (Achieve Your Grade) — Project Status & Direction

## 🎯 What AYG Is (North Star)

AYG is a **grade intelligence platform**, not just a tracker.

**Core promise:**

> *“Given where I am now, what do I need to score to achieve the grade/GPA I want?”*

It goes beyond tracking by doing:

* weighted calculations
* future estimations
* “points left to lose”
* GPA what-if scenarios (class, semester, cumulative)

---

# ✅ What We’ve Completed So Far (Big Wins)

## 1️⃣ Development Environment (DONE)

You now have:

* VS Code
* Node.js (stable LTS)
* npm
* NestJS backend running
* Hot reload (`start:dev`)

This alone removes 30–40% of beginner friction.

---

## 2️⃣ Database Infrastructure (DONE)

* Docker running PostgreSQL
* Persistent DB volume
* Clean local dev setup (no manual DB installs)

You can tear everything down and bring it back up safely.

---

## 3️⃣ Prisma ORM (DONE — and battle-tested 😄)

This was the hardest part, and you **won**:

* Prisma v6 (stable)
* `schema.prisma` configured correctly
* `DATABASE_URL` wired properly
* Migrations working
* Prisma client generating correctly
* NestJS ↔ Prisma connection verified

✅ `/health` endpoint returning:

```json
{ "ok": true }
```

That means:

> **NestJS → Prisma → Postgres is fully operational**

---

## 4️⃣ Project Structure Cleanup (DONE)

You now have a clean, professional layout:

```text
ayg/
├── prisma/              # schema + migrations
├── src/                  # application code
│   ├── modules/          # feature-based modules
│   ├── prisma/           # Prisma service
│   └── common/           # guards, decorators (soon)
├── docker-compose.yml
├── package.json
└── tsconfig.json
```

No junk, no mystery folders.

---

# 🚧 Where We Are Right Now

We are **exactly here** ⬇️

> ✅ Infrastructure & DB ready
> 🔜 **Application logic begins**

The next line of code we write is **actual product behavior**.

---

# 🧭 Where We’re Going (Clear Roadmap)

## Phase 1 — Core Backend (MVP)

### Step 1: Authentication (NEXT)

Why first?

* Every grade belongs to a user
* Every query must be user-scoped
* Prevents rewrites later

**Auth scope (simple MVP):**

* Email + password
* Password hashing
* JWT access token
* Route protection

Endpoints:

```
POST /auth/register
POST /auth/login
```

---

### Step 2: Academic Structure

Models already exist — now we expose them.

Order:

1. Semester
2. Course
3. Grade Categories
4. Assignments
5. Grades

CRUD + ownership enforcement.

---

### Step 3: Grade Engine (AYG’s Secret Sauce)

This is what makes AYG different.

Capabilities:

* Current weighted grade
* Required scores to reach:

  * A / B / C
* Points left before failing goal
* “What if I score X on this assignment?”

This logic lives in **services**, not controllers.

---

### Step 4: GPA Engine

* Semester GPA
* Cumulative GPA
* What-if future semester impact

---

## Phase 2 — Frontend (Later)

Once backend is solid:

* Web app first
* Mobile later
* API already built for both

---

## Phase 3 — Integrations (Future)

* Canvas / Blackboard APIs
* Auto-sync assignments
* Notifications & alerts

---

# 🧠 Mental Model (Important)

Think of AYG as **3 engines**:

1. **Auth Engine** → Who are you?
2. **Academic Engine** → What are your classes?
3. **Grade Intelligence Engine** → What must you do next?

We are **about to start engine #1**.

---

# 🚀 Immediate Next Action

Install Nest CLI (or use npx), then generate auth module:

```bash
npm install -g @nestjs/cli
# OR
npx nest g module modules/auth
npx nest g service modules/auth
npx nest g controller modules/auth
```

Once that exists, we’ll:

* hash passwords
* issue JWTs
* protect routes

When you’re ready, just say:

> **“Let’s build auth.”**

You’re officially past the hard part.
