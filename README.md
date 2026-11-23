# MediSlot

Healthcare appointment booking backend (Node.js, Express, PostgreSQL, Redis, Docker).

## Double-booking test

50 patients try to book the same slot at the same moment:

```
Slot 5: 50 simultaneous booking attempts
Status counts: { '201': 1, '409': 49 }
PASS: exactly one booking succeeded
```

Only one booking succeeds. The database enforces this with a partial unique index on confirmed appointments.

## Performance

Measured on a local laptop with 10,000 doctors, 50 concurrent connections for 15 seconds
(autocannon), searching doctors by specialty and city.

| Scenario | Query time (EXPLAIN ANALYZE) | Req/sec | Avg latency | p99 latency |
|---|---|---|---|---|
| No indexes, no cache | 2.557 ms | 1,827 | 26.86 ms | 43 ms |
| With indexes, no cache | 1.078 ms | 2,852 | 17.03 ms | 37 ms |
| With indexes + Redis cache | n/a | 7,727 | 5.98 ms | 11 ms |

Indexes changed the doctors scan from a sequential scan to bitmap index scans.
The cached run repeats one URL, so it shows the best case for caching.

API docs (Swagger): run the app and open http://localhost:3000/docs

## Run it

Requires Docker Desktop.

    docker compose up -d --build
    docker compose exec app node scripts/seed.js 50

API: http://localhost:3000  
Docs (Swagger): http://localhost:3000/docs

Seed data: patients register themselves; doctors are doctor1@medislot.com ... (password Password123).
Stop with `docker compose stop`; reset everything with `docker compose down -v`.