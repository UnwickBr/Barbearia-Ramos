import { ensureSchema, sql } from "../../server/db.js";
import { sendJson } from "../../server/http.js";
import { mapReservation, type ReservationRow } from "../../server/reservations.js";
import type { ApiRequest, ApiResponse } from "../../server/types.js";
import { getAuthenticatedUser } from "../../server/user.js";

export default async function handler(req: ApiRequest, res: ApiResponse) {
  await ensureSchema();

  const user = await getAuthenticatedUser(req);

  if (!user) {
    return sendJson(res, 401, { error: "Faca login para continuar." });
  }

  if (!user.isAdmin && user.role !== "collaborator") {
    return sendJson(res, 403, { error: "Acesso restrito a equipe." });
  }

  if (req.method !== "GET") {
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  const queryDate = Array.isArray(req.query?.date) ? req.query?.date[0]?.trim() : req.query?.date?.trim();
  const selectedDate = queryDate || new Date().toISOString().slice(0, 10);

  const rows = (await sql`
    SELECT
      r.id,
      r.user_id,
      r.barber_user_id,
      r.service_id,
      r.service_name,
      r.service_price,
      r.service_duration_minutes,
      r.barber_name,
      r.reservation_date,
      r.reservation_time,
      r.status,
      r.google_calendar_event_id,
      r.google_calendar_event_link,
      r.cancelled_at,
      r.cancellation_reason,
      r.cancelled_by_email,
      r.created_at,
      u.name AS customer_name,
      u.email AS customer_email
    FROM reservations r
    INNER JOIN users u ON u.id = r.user_id
    WHERE r.reservation_date = ${selectedDate}
      AND (
        ${user.isAdmin}
        OR r.barber_user_id = ${user.id}
        OR (r.barber_user_id IS NULL AND r.barber_name = ${user.barberName})
      )
    ORDER BY r.barber_name ASC, r.reservation_time ASC, r.created_at ASC
  `) as ReservationRow[];

  return sendJson(res, 200, {
    date: selectedDate,
    reservations: rows.map(mapReservation),
  });
}
