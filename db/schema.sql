CREATE TABLE users (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(10)  NOT NULL CHECK (role IN ('patient','doctor','admin')),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE specialties (
  id   INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(80) NOT NULL UNIQUE
);

CREATE TABLE clinics (
  id      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name    VARCHAR(120) NOT NULL,
  city    VARCHAR(80)  NOT NULL,
  address VARCHAR(255) NOT NULL
);

CREATE TABLE doctors (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id          BIGINT NOT NULL UNIQUE REFERENCES users(id),
  specialty_id     INT    NOT NULL REFERENCES specialties(id),
  clinic_id        BIGINT NOT NULL REFERENCES clinics(id),
  experience_years INT    NOT NULL CHECK (experience_years >= 0),
  consultation_fee NUMERIC(8,2) NOT NULL CHECK (consultation_fee >= 0)
);

CREATE TABLE slots (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  doctor_id  BIGINT NOT NULL REFERENCES doctors(id),
  start_time TIMESTAMPTZ NOT NULL,
  end_time   TIMESTAMPTZ NOT NULL,
  CHECK (end_time > start_time),
  UNIQUE (doctor_id, start_time)
);

CREATE TABLE appointments (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slot_id      BIGINT NOT NULL REFERENCES slots(id),
  patient_id   BIGINT NOT NULL REFERENCES users(id),
  status       VARCHAR(10) NOT NULL DEFAULT 'confirmed'
               CHECK (status IN ('confirmed','cancelled')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  cancelled_at TIMESTAMPTZ
);

-- The key line: only ONE confirmed appointment can exist per slot.
CREATE UNIQUE INDEX one_confirmed_per_slot
  ON appointments (slot_id) WHERE status = 'confirmed';