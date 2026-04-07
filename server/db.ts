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
          google_sub TEXT UNIQUE,
          password_hash TEXT,
          avatar_url TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS google_sub TEXT`;
      await sql`ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL`;
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS users_google_sub_unique_idx ON users (google_sub) WHERE google_sub IS NOT NULL`;
      await sql`
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
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT reservations_unique_slot UNIQUE (barber_name, reservation_date, reservation_time)
        )
      `;
    })();
  }

  await globalThis.__barbeariaRamosSchemaReady;
};
