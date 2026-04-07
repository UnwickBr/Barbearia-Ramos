CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  google_sub TEXT UNIQUE,
  password_hash TEXT,
  avatar_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reservations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_id TEXT NOT NULL,
  service_name TEXT NOT NULL,
  service_price NUMERIC(10, 2) NOT NULL,
  service_duration_minutes INTEGER NOT NULL,
  barber_name TEXT NOT NULL,
  reservation_date DATE NOT NULL,
  reservation_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed',
  google_calendar_event_id TEXT,
  google_calendar_event_link TEXT,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT reservations_unique_slot UNIQUE (barber_name, reservation_date, reservation_time)
);

ALTER TABLE reservations ADD COLUMN IF NOT EXISTS google_calendar_event_id TEXT;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS google_calendar_event_link TEXT;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_unique_slot;

CREATE UNIQUE INDEX IF NOT EXISTS reservations_active_unique_slot_idx
ON reservations (barber_name, reservation_date, reservation_time)
WHERE status <> 'cancelled';
