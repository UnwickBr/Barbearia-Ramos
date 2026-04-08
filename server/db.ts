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
          birth_date DATE,
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
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_date DATE`;
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
      await sql`
        CREATE TABLE IF NOT EXISTS site_content (
          id TEXT PRIMARY KEY,
          hero_title TEXT NOT NULL DEFAULT 'Barbearia Ramos',
          hero_subtitle TEXT NOT NULL DEFAULT 'Estilo na rua. Tradicao no corte.',
          hero_primary_cta TEXT NOT NULL DEFAULT 'Agendar horario',
          hero_image_url TEXT,
          services_eyebrow TEXT NOT NULL DEFAULT 'O que fazemos',
          services_title TEXT NOT NULL DEFAULT 'Servicos',
          services_json JSONB NOT NULL DEFAULT '[]'::jsonb,
          barbers_json JSONB NOT NULL DEFAULT '[]'::jsonb,
          barber_hours_json JSONB NOT NULL DEFAULT '{}'::jsonb,
          contact_eyebrow TEXT NOT NULL DEFAULT 'Encontre-nos',
          contact_title TEXT NOT NULL DEFAULT 'Contato',
          address_label TEXT NOT NULL DEFAULT 'Endereco',
          address_text TEXT NOT NULL DEFAULT 'Rua das Barbearias, 123 - Centro',
          phone_label TEXT NOT NULL DEFAULT 'Telefone',
          phone_text TEXT NOT NULL DEFAULT '(11) 99999-9999',
          hours_label TEXT NOT NULL DEFAULT 'Horario',
          hours_text TEXT NOT NULL DEFAULT 'Seg-Sab: 9h - 20h',
          social_links_json JSONB NOT NULL DEFAULT '{}'::jsonb,
          footer_text TEXT NOT NULL DEFAULT '2026 Barbearia Ramos. Todos os direitos reservados.',
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await sql`ALTER TABLE site_content ADD COLUMN IF NOT EXISTS hero_title TEXT NOT NULL DEFAULT 'Barbearia Ramos'`;
      await sql`ALTER TABLE site_content ADD COLUMN IF NOT EXISTS hero_subtitle TEXT NOT NULL DEFAULT 'Estilo na rua. Tradicao no corte.'`;
      await sql`ALTER TABLE site_content ADD COLUMN IF NOT EXISTS hero_primary_cta TEXT NOT NULL DEFAULT 'Agendar horario'`;
      await sql`ALTER TABLE site_content ADD COLUMN IF NOT EXISTS hero_image_url TEXT`;
      await sql`ALTER TABLE site_content ADD COLUMN IF NOT EXISTS services_eyebrow TEXT NOT NULL DEFAULT 'O que fazemos'`;
      await sql`ALTER TABLE site_content ADD COLUMN IF NOT EXISTS services_title TEXT NOT NULL DEFAULT 'Servicos'`;
      await sql`ALTER TABLE site_content ADD COLUMN IF NOT EXISTS services_json JSONB NOT NULL DEFAULT '[]'::jsonb`;
      await sql`ALTER TABLE site_content ADD COLUMN IF NOT EXISTS barbers_json JSONB NOT NULL DEFAULT '[]'::jsonb`;
      await sql`ALTER TABLE site_content ADD COLUMN IF NOT EXISTS barber_hours_json JSONB NOT NULL DEFAULT '{}'::jsonb`;
      await sql`ALTER TABLE site_content ADD COLUMN IF NOT EXISTS contact_eyebrow TEXT NOT NULL DEFAULT 'Encontre-nos'`;
      await sql`ALTER TABLE site_content ADD COLUMN IF NOT EXISTS contact_title TEXT NOT NULL DEFAULT 'Contato'`;
      await sql`ALTER TABLE site_content ADD COLUMN IF NOT EXISTS address_label TEXT NOT NULL DEFAULT 'Endereco'`;
      await sql`ALTER TABLE site_content ADD COLUMN IF NOT EXISTS address_text TEXT NOT NULL DEFAULT 'Rua das Barbearias, 123 - Centro'`;
      await sql`ALTER TABLE site_content ADD COLUMN IF NOT EXISTS phone_label TEXT NOT NULL DEFAULT 'Telefone'`;
      await sql`ALTER TABLE site_content ADD COLUMN IF NOT EXISTS phone_text TEXT NOT NULL DEFAULT '(11) 99999-9999'`;
      await sql`ALTER TABLE site_content ADD COLUMN IF NOT EXISTS hours_label TEXT NOT NULL DEFAULT 'Horario'`;
      await sql`ALTER TABLE site_content ADD COLUMN IF NOT EXISTS hours_text TEXT NOT NULL DEFAULT 'Seg-Sab: 9h - 20h'`;
      await sql`ALTER TABLE site_content ADD COLUMN IF NOT EXISTS social_links_json JSONB NOT NULL DEFAULT '{}'::jsonb`;
      await sql`ALTER TABLE site_content ADD COLUMN IF NOT EXISTS footer_text TEXT NOT NULL DEFAULT '2026 Barbearia Ramos. Todos os direitos reservados.'`;
      await sql`ALTER TABLE site_content ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`;
      await sql`
        INSERT INTO site_content (id)
        VALUES ('main')
        ON CONFLICT (id) DO NOTHING
      `;
      await sql`
        UPDATE site_content
        SET
          services_json = CASE
            WHEN jsonb_array_length(COALESCE(services_json, '[]'::jsonb)) = 0
              THEN ${JSON.stringify([
                { id: "corte", name: "Corte Classico", price: 45, durationMinutes: 30 },
                { id: "barba", name: "Barba Completa", price: 35, durationMinutes: 25 },
                { id: "combo", name: "Corte + Barba", price: 70, durationMinutes: 50 },
                { id: "pigmentacao", name: "Pigmentacao", price: 60, durationMinutes: 40 },
                { id: "sobrancelha", name: "Sobrancelha", price: 20, durationMinutes: 15 },
                { id: "hidratacao", name: "Hidratacao Capilar", price: 50, durationMinutes: 30 }
              ])}::jsonb
            ELSE services_json
          END,
          barbers_json = CASE
            WHEN jsonb_array_length(COALESCE(barbers_json, '[]'::jsonb)) = 0
              THEN ${JSON.stringify(["Carlos", "Rafael", "Andre", "Lucas"])}::jsonb
            ELSE barbers_json
          END,
          barber_hours_json = COALESCE(
            barber_hours_json,
            ${JSON.stringify({
              Carlos: ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30"],
              Rafael: ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30"],
              Andre: ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30"],
              Lucas: ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30"]
            })}::jsonb
          ),
          social_links_json = COALESCE(social_links_json, '{}'::jsonb)
        WHERE id = 'main'
      `;
    })();
  }

  await globalThis.__barbeariaRamosSchemaReady;
};
