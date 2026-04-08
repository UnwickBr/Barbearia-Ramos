import { ensureSchema, sql } from "../../server/db.js";
import { parseJsonBody, sendJson } from "../../server/http.js";
import { mapReservation, type ReservationRow } from "../../server/reservations.js";
import type { ApiRequest, ApiResponse } from "../../server/types.js";
import { getBarberTimeSlots, getSiteContentRow, mapSiteContent } from "../../server/site-content.js";
import { getAuthenticatedUser } from "../../server/user.js";

type ReservationPatchBody = {
  googleCalendarEventId?: string;
  googleCalendarEventLink?: string | null;
  action?: "complete" | "reschedule";
  barberName?: string;
  reservationDate?: string;
  reservationTime?: string;
  rescheduleReason?: string;
};

type CancelReservationBody = {
  cancellationReason?: string;
};

const findCollaboratorIdByBarberName = async (barberName: string) => {
  const rows = (await sql`
    SELECT id
    FROM users
    WHERE role = 'collaborator' AND barber_name = ${barberName}
    ORDER BY created_at ASC
    LIMIT 1
  `) as Array<{ id: string }>;

  return rows[0]?.id ?? null;
};

const getReservation = async (reservationId: string, userId: string, isAdmin: boolean) => {
  const rows = (await sql`
    SELECT
      id,
      user_id,
      barber_user_id,
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
  const siteContent = mapSiteContent(await getSiteContentRow());

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
    const body = await parseJsonBody<ReservationPatchBody>(req);
    const googleCalendarEventId = body.googleCalendarEventId?.trim();

    if (googleCalendarEventId) {
      const updated = (await sql`
        UPDATE reservations
        SET
          google_calendar_event_id = ${googleCalendarEventId},
          google_calendar_event_link = ${body.googleCalendarEventLink?.trim() || null}
        WHERE id = ${reservationId} AND user_id = ${user.id}
        RETURNING
          id,
          barber_user_id,
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
          rescheduled_at,
          reschedule_reason,
          rescheduled_by_email,
          created_at
      `) as ReservationRow[];

      return sendJson(res, 200, { reservation: mapReservation(updated[0]) });
    }

    if (!user.isAdmin) {
      return sendJson(res, 403, { error: "Acesso restrito a administradores." });
    }

    if (body.action === "complete") {
      const updated = (await sql`
        UPDATE reservations
        SET status = 'completed'
        WHERE id = ${reservationId}
        RETURNING
          id,
          barber_user_id,
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
          rescheduled_at,
          reschedule_reason,
          rescheduled_by_email,
          created_at
      `) as ReservationRow[];

      return sendJson(res, 200, { reservation: mapReservation(updated[0]) });
    }

    if (body.action === "reschedule") {
      const barberName = body.barberName?.trim();
      const reservationDate = body.reservationDate?.trim();
      const reservationTime = body.reservationTime?.trim();
      const rescheduleReason = body.rescheduleReason?.trim();

      if (!barberName || !reservationDate || !reservationTime || !rescheduleReason) {
        return sendJson(res, 400, { error: "Informe barbeiro, data, horario e justificativa para remarcar." });
      }

      if (!siteContent.barbers.includes(barberName)) {
        return sendJson(res, 400, { error: "Barbeiro invalido." });
      }

      if (siteContent.barberDaysOff[barberName]) {
        return sendJson(res, 400, { error: "Esse barbeiro esta de folga no momento." });
      }

      const allowedTimeSlots = getBarberTimeSlots(siteContent, barberName);

      if (!allowedTimeSlots.includes(reservationTime)) {
        return sendJson(res, 400, { error: "Horario invalido." });
      }

      const selectedDate = new Date(`${reservationDate}T12:00:00`);

      if (Number.isNaN(selectedDate.getTime())) {
        return sendJson(res, 400, { error: "Data invalida." });
      }

      try {
        const barberUserId = await findCollaboratorIdByBarberName(barberName);
        const updated = (await sql`
          UPDATE reservations
          SET
            barber_user_id = ${barberUserId},
            barber_name = ${barberName},
            reservation_date = ${reservationDate},
            reservation_time = ${reservationTime},
            status = 'confirmed',
            cancelled_at = NULL,
            cancellation_reason = NULL,
            cancelled_by_email = NULL,
            rescheduled_at = NOW(),
            reschedule_reason = ${rescheduleReason},
            rescheduled_by_email = ${user.email}
          WHERE id = ${reservationId}
          RETURNING
            id,
            barber_user_id,
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
            rescheduled_at,
            reschedule_reason,
            rescheduled_by_email,
            created_at
        `) as ReservationRow[];

        return sendJson(res, 200, { reservation: mapReservation(updated[0]) });
      } catch (error) {
        if (error instanceof Error && error.message.toLowerCase().includes("reservations_active_unique_slot_idx")) {
          return sendJson(res, 409, { error: "Esse horario ja esta ocupado para esse barbeiro." });
        }

        return sendJson(res, 500, { error: "Nao foi possivel remarcar o agendamento." });
      }
    }

    return sendJson(res, 400, { error: "Acao de atualizacao invalida." });
  }

  if (req.method === "DELETE") {
    const body = await parseJsonBody<CancelReservationBody>(req);
    const cancellationReason = body.cancellationReason?.trim() || null;

    if (user.isAdmin && existingReservation.user_id !== user.id && !cancellationReason) {
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
        barber_user_id,
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
        rescheduled_at,
        reschedule_reason,
        rescheduled_by_email,
        created_at
    `) as ReservationRow[];

    return sendJson(res, 200, { reservation: mapReservation(updated[0]) });
  }

  return sendJson(res, 405, { error: "Method not allowed." });
}
