import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not configured.");
}

export const sql = neon(databaseUrl);

declare global {
  var __barbeariaRamosSchemaReady: Promise<void> | undefined;
}

export const ensureSchema = async () => {
  if (!globalThis.__barbeariaRamosSchemaReady) {
    globalThis.__barbeariaRamosSchemaReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          is_admin BOOLEAN NOT NULL DEFAULT FALSE,
          role TEXT NOT NULL DEFAULT 'customer',
          barber_name TEXT,
          google_sub TEXT UNIQUE,
          password_hash TEXT,
          photo_url TEXT,
          phone TEXT,
          notes TEXT,
          avatar_url TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE`;
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'customer'`;
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS barber_name TEXT`;
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS google_sub TEXT`;
      await sql`ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL`;
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url TEXT`;
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT`;
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS notes TEXT`;
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS users_google_sub_unique_idx ON users (google_sub) WHERE google_sub IS NOT NULL`;
      await sql`
        CREATE TABLE IF NOT EXISTS reservations (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          service_id TEXT NOT NULL,
          service_name TEXT NOT NULL,
          service_price NUMERIC(10, 2) NOT NULL,
          service_duration_minutes INTEGER NOT NULL,
          barber_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
          barber_name TEXT NOT NULL,
          reservation_date DATE NOT NULL,
          reservation_time TIME NOT NULL,
          status TEXT NOT NULL DEFAULT 'confirmed',
          google_calendar_event_id TEXT,
          google_calendar_event_link TEXT,
          cancelled_at TIMESTAMPTZ,
          cancellation_reason TEXT,
          cancelled_by_email TEXT,
          rescheduled_at TIMESTAMPTZ,
          reschedule_reason TEXT,
          rescheduled_by_email TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT reservations_unique_slot UNIQUE (barber_name, reservation_date, reservation_time)
        )
      `;
      await sql`ALTER TABLE reservations ADD COLUMN IF NOT EXISTS barber_user_id TEXT REFERENCES users(id) ON DELETE SET NULL`;
      await sql`ALTER TABLE reservations ADD COLUMN IF NOT EXISTS google_calendar_event_id TEXT`;
      await sql`ALTER TABLE reservations ADD COLUMN IF NOT EXISTS google_calendar_event_link TEXT`;
      await sql`ALTER TABLE reservations ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ`;
      await sql`ALTER TABLE reservations ADD COLUMN IF NOT EXISTS cancellation_reason TEXT`;
      await sql`ALTER TABLE reservations ADD COLUMN IF NOT EXISTS cancelled_by_email TEXT`;
      await sql`ALTER TABLE reservations ADD COLUMN IF NOT EXISTS rescheduled_at TIMESTAMPTZ`;
      await sql`ALTER TABLE reservations ADD COLUMN IF NOT EXISTS reschedule_reason TEXT`;
      await sql`ALTER TABLE reservations ADD COLUMN IF NOT EXISTS rescheduled_by_email TEXT`;
      await sql`CREATE INDEX IF NOT EXISTS reservations_barber_user_id_idx ON reservations (barber_user_id)`;
      await sql`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'reservations_unique_slot'
          ) THEN
            ALTER TABLE reservations DROP CONSTRAINT reservations_unique_slot;
          END IF;
        END $$;
      `;
      await sql`
        CREATE UNIQUE INDEX IF NOT EXISTS reservations_active_unique_slot_idx
        ON reservations (barber_name, reservation_date, reservation_time)
        WHERE status <> 'cancelled'
      `;
      await sql`
        UPDATE reservations r
        SET barber_user_id = linked_user.id
        FROM (
          SELECT
            reservation_match.id AS reservation_id,
            (
              SELECT u.id
              FROM users u
              WHERE u.role = 'collaborator'
                AND u.barber_name = reservation_match.barber_name
              ORDER BY u.created_at ASC
              LIMIT 1
            ) AS id
          FROM reservations reservation_match
          WHERE reservation_match.barber_user_id IS NULL
        ) AS linked_user
        WHERE r.id = linked_user.reservation_id
          AND linked_user.id IS NOT NULL
      `;
    })();
  }

  await globalThis.__barbeariaRamosSchemaReady;
};
