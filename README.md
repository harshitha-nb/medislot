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