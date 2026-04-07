import { ensureSchema, sql } from "../../server/db.js";
import { parseJsonBody, sendJson } from "../../server/http.js";
import type { ApiRequest, ApiResponse } from "../../server/types.js";
import { getAuthenticatedUser } from "../../server/user.js";

type ReservationRow = {
  id: string;
  service_id: string;
  service_name: string;
  service_price: string;
  service_duration_minutes: number;
  barber_name: string;
  reservation_date: string | Date;
  reservation_time: string;
  status: string;
  google_calendar_event_id: string | null;
  google_calendar_event_link: string | null;
  cancelled_at: string | null;
  created_at: string;
};

type CalendarPatchBody = {
  googleCalendarEventId?: string;
  googleCalendarEventLink?: string | null;
};

const extractDateString = (value: string | Date) => {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : String(value);
};

const mapReservation = (reservation: ReservationRow) => ({
  id: reservation.id,
  serviceId: reservation.service_id,
  serviceName: reservation.service_name,
  servicePrice: Number(reservation.service_price),
  serviceDurationMinutes: reservation.service_duration_minutes,
  barberName: reservation.barber_name,
  reservationDate: extractDateString(reservation.reservation_date),
  reservationTime: reservation.reservation_time.slice(0, 5),
  status: reservation.status,
  googleCalendarEventId: reservation.google_calendar_event_id,
  googleCalendarEventLink: reservation.google_calendar_event_link,
  cancelledAt: reservation.cancelled_at,
  createdAt: reservation.created_at,
});

const getReservation = async (reservationId: string, userId: string) => {
  const rows = (await sql`
    SELECT
      id,
      service_id,
      service_name,
      service_price,
      service_duration_minutes,
      barber_name,
      reservation_date,
      reservation_time,
      status,
      google_calendar_event_id,
      google_calendar_event_link,
      cancelled_at,
      created_at
    FROM reservations
    WHERE id = ${reservationId} AND user_id = ${userId}
    LIMIT 1
  `) as ReservationRow[];

  return rows[0] ?? null;
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  await ensureSchema();

  const user = await getAuthenticatedUser(req);

  if (!user) {
    return sendJson(res, 401, { error: "Faca login para continuar." });
  }

  const queryId = req.query?.id;
  const reservationId = Array.isArray(queryId) ? queryId[0]?.trim() ?? "" : String(queryId ?? "").trim();

  if (!reservationId) {
    return sendJson(res, 400, { error: "Reserva invalida." });
  }

  const existingReservation = await getReservation(reservationId, user.id);

  if (!existingReservation) {
    return sendJson(res, 404, { error: "Reserva nao encontrada." });
  }

  if (req.method === "PATCH") {
    const body = await parseJsonBody<CalendarPatchBody>(req);
    const googleCalendarEventId = body.googleCalendarEventId?.trim();

    if (!googleCalendarEventId) {
      return sendJson(res, 400, { error: "Identificador do evento do Google obrigatorio." });
    }

    const updated = (await sql`
      UPDATE reservations
      SET
        google_calendar_event_id = ${googleCalendarEventId},
        google_calendar_event_link = ${body.googleCalendarEventLink?.trim() || null}
      WHERE id = ${reservationId} AND user_id = ${user.id}
      RETURNING
        id,
        service_id,
        service_name,
        service_price,
        service_duration_minutes,
        barber_name,
        reservation_date,
        reservation_time,
        status,
        google_calendar_event_id,
        google_calendar_event_link,
        cancelled_at,
        created_at
    `) as ReservationRow[];

    return sendJson(res, 200, { reservation: mapReservation(updated[0]) });
  }

  if (req.method === "DELETE") {
    if (existingReservation.status === "cancelled") {
      return sendJson(res, 200, { reservation: mapReservation(existingReservation) });
    }

    const updated = (await sql`
      UPDATE reservations
      SET
        status = 'cancelled',
        cancelled_at = NOW()
      WHERE id = ${reservationId} AND user_id = ${user.id}
      RETURNING
        id,
        service_id,
        service_name,
        service_price,
        service_duration_minutes,
        barber_name,
        reservation_date,
        reservation_time,
        status,
        google_calendar_event_id,
        google_calendar_event_link,
        cancelled_at,
        created_at
    `) as ReservationRow[];

    return sendJson(res, 200, { reservation: mapReservation(updated[0]) });
  }

  return sendJson(res, 405, { error: "Method not allowed." });
}
