import { randomUUID } from "node:crypto";
import { barbers, servicesById, timeSlots } from "../../server/barbershop.js";
import { ensureSchema, sql } from "../../server/db.js";
import { parseJsonBody, sendJson } from "../../server/http.js";
import { mapReservation, type ReservationRow } from "../../server/reservations.js";
import type { ApiRequest, ApiResponse } from "../../server/types.js";
import { getAuthenticatedUser } from "../../server/user.js";

type ReservationBody = {
  serviceId?: string;
  barberName?: string;
  reservationDate?: string;
  reservationTime?: string;
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

export default async function handler(req: ApiRequest, res: ApiResponse) {
  await ensureSchema();

  if (req.method === "GET") {
    const barberName = Array.isArray(req.query?.barberName) ? req.query?.barberName[0]?.trim() : req.query?.barberName?.trim();
    const reservationDate = Array.isArray(req.query?.reservationDate)
      ? req.query?.reservationDate[0]?.trim()
      : req.query?.reservationDate?.trim();

    if (barberName && reservationDate) {
      if (!barbers.includes(barberName as (typeof barbers)[number])) {
        return sendJson(res, 400, { error: "Barbeiro invalido." });
      }

      const rows = (await sql`
        SELECT reservation_time
        FROM reservations
        WHERE barber_name = ${barberName}
          AND reservation_date = ${reservationDate}
          AND status <> 'cancelled'
        ORDER BY reservation_time ASC
      `) as Array<{ reservation_time: string }>;

      return sendJson(res, 200, {
        unavailableTimes: rows.map((row) => row.reservation_time.slice(0, 5)),
      });
    }

    const user = await getAuthenticatedUser(req);

    if (!user) {
      return sendJson(res, 401, { error: "Faca login para continuar." });
    }

    const rows = (await sql`
      SELECT
        barber_user_id,
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
      WHERE user_id = ${user.id}
      ORDER BY reservation_date DESC, reservation_time DESC, created_at DESC
    `) as ReservationRow[];

    return sendJson(res, 200, { reservations: rows.map(mapReservation) });
  }

  const user = await getAuthenticatedUser(req);

  if (!user) {
    return sendJson(res, 401, { error: "Faca login para continuar." });
  }

  if (req.method === "POST") {
    const body = await parseJsonBody<ReservationBody>(req);
    const serviceId = body.serviceId?.trim();
    const barberName = body.barberName?.trim();
    const reservationDate = body.reservationDate?.trim();
    const reservationTime = body.reservationTime?.trim();

    if (!serviceId || !barberName || !reservationDate || !reservationTime) {
      return sendJson(res, 400, { error: "Todos os dados da reserva sao obrigatorios." });
    }

    const service = servicesById[serviceId];

    if (!service) {
      return sendJson(res, 400, { error: "Servico invalido." });
    }

    if (!barbers.includes(barberName as (typeof barbers)[number])) {
      return sendJson(res, 400, { error: "Barbeiro invalido." });
    }

    if (!timeSlots.includes(reservationTime as (typeof timeSlots)[number])) {
      return sendJson(res, 400, { error: "Horario invalido." });
    }

    const selectedDate = new Date(`${reservationDate}T12:00:00`);

    if (Number.isNaN(selectedDate.getTime())) {
      return sendJson(res, 400, { error: "Data invalida." });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      return sendJson(res, 400, { error: "Escolha uma data de hoje em diante." });
    }

    try {
      const barberUserId = await findCollaboratorIdByBarberName(barberName);
      const result = (await sql`
        INSERT INTO reservations (
          id,
          user_id,
          service_id,
          service_name,
          service_price,
          service_duration_minutes,
          barber_user_id,
          barber_name,
          reservation_date,
          reservation_time
        )
        VALUES (
          ${randomUUID()},
          ${user.id},
          ${service.id},
          ${service.name},
          ${service.price},
          ${service.duration},
          ${barberUserId},
          ${barberName},
          ${reservationDate},
          ${reservationTime}
        )
        RETURNING
          barber_user_id,
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

      return sendJson(res, 201, { reservation: mapReservation(result[0]) });
    } catch (error) {
      if (error instanceof Error && error.message.toLowerCase().includes("reservations_active_unique_slot_idx")) {
        return sendJson(res, 409, { error: "Esse horario ja foi reservado para esse barbeiro." });
      }

      return sendJson(res, 500, { error: "Nao foi possivel concluir a reserva." });
    }
  }

  return sendJson(res, 405, { error: "Method not allowed." });
}
