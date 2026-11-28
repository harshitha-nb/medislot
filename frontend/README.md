# MediSlot

![CI](https://github.com/harshitha-nb/medislot/actions/workflows/ci.yml/badge.svg)

**A full-stack healthcare appointment booking platform.** Patients search doctors by specialty and city, pick a free time slot and book it. Doctors publish their own availability. Admins manage clinics, specialties and doctors. A slot can never be double-booked, even when many people try at the same moment, and the database itself guarantees it.

> **Demo project.** MediSlot is a portfolio project, not a real medical service. Please do not enter real personal or medical information.

**Live demo:** https://medislot-hk2k.onrender.com  
**API documentation (Swagger):** https://medislot-hk2k.onrender.com/docs  
The free hosting plan sleeps after a period of inactivity, so the first visit can take up to a minute to wake up.

## Table of contents

1. [Live demo and test accounts](#live-demo-and-test-accounts)
2. [Screenshots](#screenshots)
3. [Features](#features)
4. [Tech stack](#tech-stack)
5. [Architecture](#architecture)
6. [Database design](#database-design)
7. [How double booking is prevented](#how-double-booking-is-prevented)
8. [Caching with Redis](#caching-with-redis)
9. [Security](#security)
10. [API reference](#api-reference)
11. [Frontend](#frontend)
12. [Testing and CI](#testing-and-ci)
13. [Performance](#performance)
14. [Deployment](#deployment)
15. [Run it locally](#run-it-locally)
16. [Project structure](#project-structure)
17. [Engineering decisions](#engineering-decisions)
18. [Known limitations and roadmap](#known-limitations-and-roadmap)
19. [Skills demonstrated](#skills-demonstrated)
20. [Author](#author)

## Live demo and test accounts

| Role | How to sign in | What you can try |
|---|---|---|
| Patient | Click **Sign up** and register with a made-up name and email | Search doctors, book a slot, see and cancel appointments |
| Doctor | `arjun.pandey@medislot.com` with password `Password123` | Add and remove slots, see who booked |
| Admin | Not public. Available on request | View statistics, add specialties, clinics and doctors |

Suggested 2-minute tour: search **Cardiology** in **Chennai**, open a doctor, book a slot, then open **My appointments** and cancel it. Then sign in as the demo doctor in a private window and watch the booking appear on the dashboard.

To keep the public demo safe, every seeded doctor account except the demo doctor has a random password nobody knows, and the admin password is private.

## Screenshots

| | |
|---|---|
| ![Home page](docs/screenshots/01-home.png) **Home:** hero search and specialty tiles | ![Doctor search](docs/screenshots/02-search.png) **Search:** filters, colour-coded cards, pagination |
| ![Doctor page](docs/screenshots/03-doctor-slots.png) **Doctor page:** date picker and free slots | ![Booking confirmation](docs/screenshots/04-booking.png) **Booking:** instant confirmation |
| ![My appointments](docs/screenshots/05-my-appointments.png) **My appointments:** upcoming, past, cancel | ![Doctor dashboard](docs/screenshots/06-doctor-dashboard.png) **Doctor dashboard:** schedule and bookings |
| ![Admin panel](docs/screenshots/07-admin.png) **Admin panel:** statistics and management forms | ![Passing CI](docs/screenshots/08-ci-green.png) **CI:** automated tests and checks pass |

## Features

### For patients

- Register and log in (JWT authentication). The session survives a page refresh.
- Search doctors by **specialty** and **city**, with pagination. The filters live in the web address, so a search can be bookmarked or shared.
- Doctor page with clinic address, experience and consultation fee.
- A 7-day date picker and a live grid of **free** time slots. Slots that already started are hidden.
- One-click booking with clear messages. If someone else books the slot first, the patient sees "someone just booked that slot" and the list refreshes.
- **My appointments:** upcoming and past or cancelled appointments, and a two-step cancel that frees the slot again immediately.

### For doctors

- A dashboard to **add slots** for a day: choose the date, start, end and slot length (15 to 60 minutes). Repeating the same request never creates duplicates.
- See each day's slots marked **Free** or **Booked**, and remove free slots.
- An appointments list (upcoming and past or cancelled) with patient names.

### For admins

- Statistics cards: doctors, patients, clinics, confirmed and cancelled bookings.
- Forms to add a **specialty**, a **clinic**, and a **doctor** (the doctor's login account and profile are created together in one database transaction).

### Across the app

- Role-based access control (patient, doctor, admin), enforced on the server and reflected in the interface.
- Loading skeletons, empty states and error messages with a retry button on every data screen.
- Responsive layout (phones to desktops), accessible controls (labels, focus states, reduced-motion support) and a show/hide password button.
- Specialty-specific icons and colours, gradient backdrops, a favicon and per-page titles.
- Realistic demo data: 140 doctors across 7 cities, every specialty available in every city, and slots that top themselves up automatically.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React, TypeScript, Vite, React Router, Tailwind CSS, lucide-react icons, Inter font (self-hosted) |
| Backend | Node.js, Express, REST API, JWT, bcrypt, helmet, express-rate-limit |
| Database | PostgreSQL 16 (transactions, constraints, partial unique index, indexes) |
| Cache | Redis 7 (cache-aside with TTL and invalidation) |
| API docs | OpenAPI 3 with Swagger UI |
| Testing | Jest and Supertest (integration tests against a real PostgreSQL), autocannon (load tests) |
| CI | GitHub Actions (backend tests, frontend lint and build) |
| Containers | Docker (multi-stage build) and Docker Compose |
| Hosting | Render (app), Neon (PostgreSQL), Upstash (Redis) |

## Architecture

```mermaid
flowchart LR
    User["Browser: React and TypeScript website"] -->|"HTTPS: REST and JSON"| API["Express API"]
    API -->|"cached reads"| Redis[("Redis cache")]
    API -->|"queries and bookings"| DB[("PostgreSQL")]
    API -->|"serves"| Docs["Swagger docs at /docs"]
```

In production, one Express service serves the built website, the REST API and the Swagger page from a single address, so there is no cross-origin configuration and the frontend and backend can never be out of step.

### How a read request works (cache-aside)

```mermaid
flowchart TD
    Req["GET /api/doctors"] --> Check{"Is the answer in Redis?"}
    Check -->|"yes"| Hit["Return cached JSON with X-Cache HIT"]
    Check -->|"no"| Query["Query PostgreSQL"]
    Query --> Store["Save the answer in Redis with a TTL"]
    Store --> Miss["Return JSON with X-Cache MISS"]
```

### How two simultaneous bookings are handled

```mermaid
sequenceDiagram
    participant A as Patient A
    participant B as Patient B
    participant API as Express API
    participant DB as PostgreSQL
    participant R as Redis
    A->>API: POST /api/appointments (slot 5)
    B->>API: POST /api/appointments (slot 5)
    API->>DB: INSERT appointment for slot 5
    API->>DB: INSERT appointment for slot 5
    DB-->>API: first insert succeeds
    DB-->>API: second insert rejected (unique violation)
    API->>R: delete cached free slots for that doctor and day
    API-->>A: 201 Created
    API-->>B: 409 Conflict
```

### Who can do what

| Area | Anonymous | Patient | Doctor | Admin |
|---|---|---|---|---|
| Search doctors, see slots, read docs | yes | yes | yes | yes |
| Book and cancel own appointments | no | yes | no | no |
| Create and delete own slots, see own bookings | no | no | yes | no |
| Statistics, add specialties, clinics, doctors | no | no | no | yes |

## Database design

```mermaid
erDiagram
    USERS ||--o| DOCTORS : "doctor profile"
    SPECIALTIES ||--o{ DOCTORS : "has"
    CLINICS ||--o{ DOCTORS : "employs"
    DOCTORS ||--o{ SLOTS : "offers"
    SLOTS ||--o{ APPOINTMENTS : "booked as"
    USERS ||--o{ APPOINTMENTS : "patient books"

    USERS {
        bigint id PK
        varchar name
        varchar email UK
        varchar password_hash
        varchar role
        timestamptz created_at
    }
    SPECIALTIES {
        int id PK
        varchar name UK
    }
    CLINICS {
        bigint id PK
        varchar name
        varchar city
        varchar address
    }
    DOCTORS {
        bigint id PK
        bigint user_id FK
        int specialty_id FK
        bigint clinic_id FK
        int experience_years
        numeric consultation_fee
    }
    SLOTS {
        bigint id PK
        bigint doctor_id FK
        timestamptz start_time
        timestamptz end_time
    }
    APPOINTMENTS {
        bigint id PK
        bigint slot_id FK
        bigint patient_id FK
        varchar status
        timestamptz created_at
        timestamptz cancelled_at
    }
```

- The schema is normalized (3NF). Patients, doctors and admins share one `users` table with a `role`, and `doctors` holds only doctor-specific data.
- **Availability is derived, not stored.** There is no "booked" flag on a slot. A slot is free when no confirmed appointment points at it, so one fact is never stored twice and cannot go out of sync.
- Constraints enforce the rules: unique emails, `CHECK` constraints on roles and statuses, `end_time > start_time`, non-negative fees, and `UNIQUE (doctor_id, start_time)` so a doctor can't have two identical slots.
- Cancelled appointments are kept (status `cancelled`) as history, and do not block a new booking of the same slot.
- Times are stored as `timestamptz` and interpreted in Indian time (`Asia/Kolkata`) when a calendar day is requested.
- `db/indexes.sql` contains the performance indexes (see [Performance](#performance)). Apply it after `db/schema.sql`.

## How double booking is prevented

Checking whether a slot is free and then inserting is unsafe: two requests can both pass the check before either inserts (a **race condition**). MediSlot lets the database enforce the rule instead:

```sql
CREATE UNIQUE INDEX one_confirmed_per_slot
  ON appointments (slot_id) WHERE status = 'confirmed';
```

This partial unique index allows only one confirmed appointment per slot. When two requests arrive together, PostgreSQL accepts one and rejects the other with a unique violation, which the API turns into `409 Conflict`. The booking itself is a single `INSERT ... SELECT` that also checks the slot exists and has not started yet.

**Proof.** `scripts/concurrency-test.js` registers 50 patients and makes all of them book the same slot at once:

```
node scripts/concurrency-test.js <slotId> 50

Slot 5: 50 simultaneous booking attempts
Status counts: { '201': 1, '409': 49 }
PASS: exactly one booking succeeded
```

The automated test suite also runs a 20-way race on every push (see [Testing and CI](#testing-and-ci)).

## Caching with Redis

| Cached data | Key | TTL |
|---|---|---|
| Doctor search results | `doctors:<specialty>:<city>:<page>:<limit>` | 60 seconds |
| A doctor's free slots for a day | `slots:<doctorId>:<date>` | 30 seconds |
| One doctor's details | `doctor:<id>` | 5 minutes |

- **Cache-aside pattern:** check Redis first; on a miss, query PostgreSQL and store the result. Responses carry an `X-Cache: HIT` or `MISS` header so the behaviour is visible.
- **Invalidation:** booking, cancelling, and a doctor adding or removing slots delete the affected `slots:` key, so a patient never sees a stale list after a change. The TTLs are a safety net for anything not invalidated explicitly.
- **Fail-open:** the cache is never the source of truth. Bookings always go to PostgreSQL, and if Redis is down the app keeps working from the database.

## Security

- Passwords are hashed with **bcrypt**. Password hashes are never returned by the API.
- **JWT** access tokens expire after 1 hour. Every protected route verifies the token, and the user's identity comes from the token, never from the request body (so a doctor cannot edit another doctor's slots, and a patient cannot cancel someone else's appointment).
- **Role-based access control** on the server for every patient, doctor and admin route (`401` for no token, `403` for the wrong role). The interface hides links by role as a convenience, but the server is what enforces it.
- All SQL uses **parameterized queries**, which prevents SQL injection.
- **helmet** security headers and **rate limiting** in production (300 requests per 15 minutes per client for the API, and 30 per 15 minutes for login and register).
- Input validation with clear status codes (`400`, `401`, `403`, `404`, `409`), and a capped page size on listings.
- Secrets live in environment variables and are never committed. `.env` is git-ignored and excluded from the Docker image.
- The public demo locks every seeded doctor account except one, and uses a private admin password.

## API reference

Interactive documentation is available at `/docs` (Swagger UI). The full list of endpoints:

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/health` | public | Health check |
| POST | `/api/auth/register` | public | Register a patient |
| POST | `/api/auth/login` | public | Log in and receive a JWT (valid 1 hour) |
| GET | `/api/auth/me` | signed in | The current user |
| GET | `/api/meta` | public | Specialties and cities for the search dropdowns |
| GET | `/api/doctors` | public | Search by `specialty` and `city`; paginate with `page` and `limit` (cached 60 s) |
| GET | `/api/doctors/:id` | public | One doctor's details (cached 5 min) |
| GET | `/api/doctors/:id/slots?date=YYYY-MM-DD` | public | Free slots for a doctor on a day (cached 30 s) |
| POST | `/api/appointments` | patient | Book a slot with `{ "slotId": 5 }` |
| GET | `/api/appointments/mine` | patient | List my appointments |
| DELETE | `/api/appointments/:id` | patient | Cancel my confirmed appointment |
| POST | `/api/portal/slots` | doctor | Create slots for a day (`date`, `startTime`, `endTime`, `durationMinutes`) |
| GET | `/api/portal/slots?date=YYYY-MM-DD` | doctor | My slots that day, each with a `booked` flag |
| DELETE | `/api/portal/slots/:id` | doctor | Remove a slot that has never been booked |
| GET | `/api/portal/appointments` | doctor | My appointments, optionally filtered by `date` |
| GET | `/api/admin/stats` | admin | Platform statistics |
| GET | `/api/admin/lookups` | admin | Specialty and clinic ids for the forms |
| POST | `/api/admin/specialties` | admin | Add a specialty |
| POST | `/api/admin/clinics` | admin | Add a clinic |
| POST | `/api/admin/doctors` | admin | Add a doctor (creates the login and the profile in one transaction) |

**Status codes used:** `200` and `201` success, `400` invalid input, `401` missing or invalid token, `403` wrong role, `404` not found, `409` conflict (slot already booked, duplicate email), `429` rate limit exceeded, `500` server error.

## Frontend

A single-page app built with React and TypeScript.

- **Typed API layer:** one helper adds the saved token to each request and turns server errors into readable messages. Responses are typed, so a misspelled field is a compile-time error.
- **Auth context and protected routes:** login state is shared across the app and restored from the saved token on refresh. Routes are wrapped by role, so a patient who opens `/admin` is redirected.
- **No stale screens:** requests are cancelled with `AbortController` when filters change, and each result is tied to the request that produced it.
- **State in the URL:** the search page keeps specialty, city and page in the address, so the Back button, bookmarks and shared links work.
- **Complete UI states:** skeleton loaders, empty states, inline errors with retry, and busy buttons that prevent double submits.
- **Dates in Indian time** on purpose, to match the backend, so a visitor in another timezone sees the same slots.
- **Accessibility:** labelled inputs, `aria-label` and `aria-pressed` on toggle buttons, live regions for results, visible focus rings and `prefers-reduced-motion` support.
- **Design system:** a colour and icon per specialty drive the cards, banners and tiles from a single file, with gradient backdrops, a self-hosted font and a favicon.

## Testing and CI

- **Integration tests** (Jest and Supertest) call the real API against a real PostgreSQL database, with a separate `medislot_test` database. They cover registration and login rules, doctor search and filtering, the doctor portal (slot creation, idempotency, deletion), booking and cancelling (including who may cancel what), role checks, admin actions, and a **20-way concurrency race** that must produce exactly one `201` and nineteen `409` responses.
- A safety guard refuses to run the tests against any database whose URL does not contain `test`, because the tests wipe their tables.
- **GitHub Actions** runs on every push to `main` and every pull request:
  - **Backend job:** starts a PostgreSQL service, loads the schema and runs the test suite.
  - **Frontend job:** installs, lints and builds the website (including the TypeScript check).

Run the tests locally with `npm test` (Docker must be running, with the `medislot_test` database created, see below).

## Performance

Measured on a local laptop with **10,000 doctors**, 50 concurrent connections for 15 seconds ([autocannon](https://github.com/mcollina/autocannon)), searching doctors by specialty and city:

| Scenario | Query time (EXPLAIN ANALYZE) | Requests/sec | Avg latency | p99 latency |
|---|---|---|---|---|
| No indexes, no cache | 2.557 ms | 1,827 | 26.86 ms | 43 ms |
| With indexes, no cache | 1.078 ms | 2,852 | 17.03 ms | 37 ms |
| With indexes and Redis cache | n/a | 7,727 | 5.98 ms | 11 ms |

- Indexes turned a sequential scan over all doctors into bitmap index scans: query time down about **58%** and throughput up about **1.56x**.
- Adding the Redis cache raised throughput to about **4.2x** the starting point, and cut p99 latency from 43 ms to 11 ms.
- The cached run repeats one URL, so it shows the best case for caching. A realistic mix of searches would hit the cache less often. The table is small, so the gap would widen as the data grows.
- The raw outputs are in the `results/` folder.

Reproduce a run:

```bash
npx autocannon -c 50 -d 15 "http://localhost:3000/api/doctors?specialty=Cardiology&city=Bengaluru"
```

## Deployment

```mermaid
flowchart LR
    Dev["Developer: git push"] --> GH["GitHub"]
    GH --> CI["GitHub Actions: tests, lint, build"]
    GH -->|"auto deploy"| Render["Render: Docker web service serving the website, API and docs"]
    Render -->|"TLS"| Neon[("Neon: PostgreSQL")]
    Render -->|"TLS"| Upstash[("Upstash: Redis")]
    Visitor["Visitor's browser"] -->|"HTTPS"| Render
```

- **One Docker image, one link.** A multi-stage `Dockerfile` builds the React website in the first stage, and the final slim image contains only the API and the built files. Express serves `/` (website), `/api/...` and `/docs`.
- **Single-page app routing:** any unknown page address returns the website so that a refresh on a page like `/doctors/5` works, while unknown `/api/...` paths return a JSON `404`. Built asset files are cached for a year (their names change with each build), and `index.html` is never cached.
- **Hosting:** Render (free web service) for the app, Neon for PostgreSQL and Upstash for Redis. Pushing to `main` redeploys automatically.
- **Configuration** is entirely by environment variables (table below).
- **Demo data keeps itself fresh:** with `AUTO_TOPUP_SLOTS=on` the server creates free slots for the next 8 days at start-up and every 6 hours, so the demo never runs out of availability.
- **Seeding the live database** (from a developer machine, with the live `DATABASE_URL` and a private `ADMIN_PASSWORD`): `node scripts/seed.js --reset --lock-doctors`.

### Environment variables

| Variable | Purpose | Notes |
|---|---|---|
| `PORT` | Port to listen on | Default 3000 |
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `REDIS_URL` | Redis connection string | Default `redis://localhost:6379`. Use `rediss://` for hosted Redis. Optional: the app works without it |
| `JWT_SECRET` | Secret for signing tokens | Required. Use a long random value in production |
| `RATE_LIMIT` | Set to `on` to enable rate limiting | Off by default so load tests are not blocked |
| `AUTO_TOPUP_SLOTS` | Set to `on` to keep slots topped up automatically | Used on the live demo |
| `CACHE_DISABLED` | Set to `1` to turn the cache off | Used by the tests |
| `TEST_DATABASE_URL` | Database used by `npm test` | Must contain `test` in its name |
| `ADMIN_PASSWORD`, `DOCTOR_PASSWORD` | Passwords the seed script assigns | Defaults are for local use only |

## Run it locally

### Option 1: everything in Docker (quickest)

Requires Docker Desktop.

```bash
git clone https://github.com/harshitha-nb/medislot.git
cd medislot
docker compose up -d --build
docker compose exec app node scripts/seed.js
```

- Website and API: http://localhost:3000
- Swagger docs: http://localhost:3000/docs
- Local demo accounts: doctors sign in with the email the seed prints plus the password `Password123`, and the admin is `admin@medislot.com` with `Admin1234` (these defaults are for local use only).
- Stop with `docker compose stop`. Reset everything with `docker compose down -v`.

### Option 2: development mode with hot reload

Requires Node.js 20 or newer and Docker Desktop (for the database and cache).

```bash
# main folder: start only the database and cache
docker compose up -d db redis

# backend (creates tables on first start of the database)
npm install
```

Create a `.env` file in the main folder:

```
PORT=3000
DATABASE_URL=postgres://medislot:medislot@localhost:5432/medislot
JWT_SECRET=use_a_long_random_text_at_least_32_characters
```

```bash
npm run dev                        # API on http://localhost:3000
node scripts/seed.js               # fill with demo data (in another terminal)

# website, in another terminal
cd frontend
npm install
npm run dev                        # website on http://localhost:5173 (proxies /api to port 3000)
```

### Running the tests

```bash
docker compose up -d db
docker compose exec db psql -U medislot -c "CREATE DATABASE medislot_test;"
Get-Content db\schema.sql | docker compose exec -T db psql -U medislot -d medislot_test   # PowerShell
npm test
```

On macOS or Linux, load the schema with `docker compose exec -T db psql -U medislot -d medislot_test < db/schema.sql`.

### Useful scripts

| Command | What it does |
|---|---|
| `node scripts/seed.js` | Fill an empty database with demo data |
| `node scripts/seed.js --reset` | Wipe everything and reseed |
| `node scripts/seed.js --reset --lock-doctors` | Reseed and lock every doctor account except the first (for public demos) |
| `node scripts/topup-slots.js` | Add free slots for the next 8 days |
| `node scripts/concurrency-test.js <slotId> 50` | Fire 50 simultaneous bookings at one slot |
| `npm test` | Run the integration tests |

## Project structure

```
medislot/
├── .github/workflows/ci.yml     CI: backend tests, frontend lint and build
├── db/
│   ├── schema.sql               tables, constraints and the anti double-booking index
│   └── indexes.sql              performance indexes
├── docs/screenshots/            README images
├── frontend/                    React and TypeScript website (Vite)
│   ├── public/favicon.svg
│   └── src/
│       ├── api.ts               typed API helper and shared types
│       ├── App.tsx, main.tsx    routing, page titles, layout
│       ├── auth/                login context and provider
│       ├── admin/               admin forms
│       ├── components/          navbar, doctor card, icons, protected route, form field
│       ├── lib/                 formatting helpers and specialty colours
│       └── pages/               home, search, doctor, appointments, dashboard, admin, login
├── results/                     raw benchmark outputs
├── scripts/                     seed, slot top-up, concurrency test, explain query
├── src/                         Express API
│   ├── app.js                   middleware, routes, serves the built website
│   ├── server.js                start-up
│   ├── cache.js                 Redis helper with fail-open behaviour
│   ├── openapi.js               Swagger definition
│   ├── config/db.js             PostgreSQL connection pool
│   ├── jobs/topupSlots.js       automatic slot creation
│   ├── middleware/auth.js       JWT and role checks
│   └── routes/                  auth, doctors, appointments, portal, admin, meta
├── tests/api.test.js            integration tests
├── Dockerfile                   multi-stage build (website, then API)
├── docker-compose.yml           PostgreSQL, Redis and the app
└── tests.http                   hand-test requests for VS Code REST Client
```

## Engineering decisions

- **The database guarantees correctness, not application code.** A constraint sees every request, so it cannot be raced. The application only translates the rejection into a friendly `409`.
- **A cache must never be the source of truth.** Bookings always hit PostgreSQL, TTLs bound staleness, explicit invalidation keeps slot lists accurate, and the app degrades gracefully if Redis is down.
- **Derived availability** instead of a stored "booked" flag removes a whole class of inconsistency bugs.
- **Idempotent operations.** Adding the same slots twice, or retrying a request, creates no duplicates (`ON CONFLICT DO NOTHING`).
- **Transactions for multi-table writes.** Creating a doctor writes to two tables and is committed or rolled back as one unit.
- **Pagination without a count query.** The list endpoint fetches one extra row to learn whether a next page exists, which avoids a full-table `COUNT(*)`.
- **Identity from the token, never the request.** The server decides who you are, so one user cannot act on another's data by changing an id.
- **One deployable.** Serving the website from the API removes CORS configuration and version mismatches, and keeps hosting to a single service.
- **Measure, don't guess.** Performance claims come from `EXPLAIN ANALYZE` and load tests with before and after numbers.
- **Safe public demo.** Rate limiting, locked doctor accounts, a private admin password, no real data collected, and clear disclaimers in the interface.

## Known limitations and roadmap

Honest notes on what this project does not do yet:

- **Swagger covers the original endpoints.** The newer endpoints (`/api/meta`, doctor details, `/api/auth/me`, `/api/portal/*`, `/api/admin/*`) are listed in the table above but not yet in the Swagger definition.
- **No email or SMS notifications**, and no rescheduling or doctor-side cancellation yet.
- **Access tokens are kept in `localStorage`.** That is simple and common for demos, but vulnerable if the site ever had a cross-site scripting bug. HttpOnly cookies with CSRF protection would be safer. There are also no refresh tokens, password reset or email verification.
- **Automated tests cover the backend.** The frontend is linted, type-checked and built in CI, but has no component or end-to-end tests yet (Playwright would be the next step).
- **Free hosting sleeps** after inactivity, so the first request can be slow.
- **Slots are generated in Indian time only**, and the admin panel does not list or edit existing records.

Ideas for next steps: Playwright end-to-end tests, appointment reminders by email, ratings and reviews, rescheduling, an AI symptom-to-specialty helper, and an observability dashboard.

## Skills demonstrated

| Area | Where to see it |
|---|---|
| REST API design, authentication and authorization | `src/routes`, `src/middleware/auth.js` |
| Relational database design, SQL, transactions, indexing | `db/schema.sql`, `db/indexes.sql`, `src/routes` |
| Concurrency and data integrity | Partial unique index, `scripts/concurrency-test.js`, the 20-way race test |
| Caching and performance engineering | `src/cache.js`, the [Performance](#performance) section, `results/` |
| React and TypeScript front end | `frontend/src` |
| Testing and continuous integration | `tests/api.test.js`, `.github/workflows/ci.yml` |
| Docker and cloud deployment | `Dockerfile`, `docker-compose.yml`, Render, Neon and Upstash |
| Security basics | bcrypt, JWT, helmet, rate limiting, parameterized SQL, role checks |
| Documentation and communication | This README, Swagger, diagrams |

## Author

**N. B. Harshitha**, Computer Science and Engineering student (Presidency University, Bangalore).  
LinkedIn: https://www.linkedin.com/in/harshitha-nb  
GitHub: https://github.com/harshitha-nb

Feedback and questions are welcome.
