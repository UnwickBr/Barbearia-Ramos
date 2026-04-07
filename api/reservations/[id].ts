import { ensureSchema, sql } from "../../server/db.js";
import { parseJsonBody, sendJson } from "../../server/http.js";
import { mapReservation, type ReservationRow } from "../../server/reservations.js";
import type { ApiRequest, ApiResponse } from "../../server/types.js";
import { getAuthenticatedUser } from "../../server/user.js";

type CalendarPatchBody = {
  googleCalendarEventId?: string;
  googleCalendarEventLink?: string | null;
};

type CancelReservationBody = {
  cancellationReason?: string;
};

const getReservation = async (reservationId: string, userId: string, isAdmin: boolean) => {
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
      cancellation_reason,
      cancelled_by_email,
      created_at
    FROM reservations
    WHERE id = ${reservationId} AND (${isAdmin} OR user_id = ${userId})
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

  const existingReservation = await getReservation(reservationId, user.id, user.isAdmin);

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
        cancellation_reason,
        cancelled_by_email,
        created_at
    `) as ReservationRow[];

    return sendJson(res, 200, { reservation: mapReservation(updated[0]) });
  }

  if (req.method === "DELETE") {
    const body = await parseJsonBody<CancelReservationBody>(req);
    const cancellationReason = body.cancellationReason?.trim() || null;

    if (user.isAdmin && !cancellationReason) {
      return sendJson(res, 400, { error: "Informe a justificativa do cancelamento." });
    }

    if (existingReservation.status === "cancelled") {
      return sendJson(res, 200, { reservation: mapReservation(existingReservation) });
    }

    const updated = (await sql`
      UPDATE reservations
      SET
        status = 'cancelled',
        cancelled_at = NOW(),
        cancellation_reason = ${cancellationReason},
        cancelled_by_email = ${user.email}
      WHERE id = ${reservationId} AND (${user.isAdmin} OR user_id = ${user.id})
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
        cancellation_reason,
        cancelled_by_email,
        created_at
    `) as ReservationRow[];

    return sendJson(res, 200, { reservation: mapReservation(updated[0]) });
  }

  return sendJson(res, 405, { error: "Method not allowed." });
}
