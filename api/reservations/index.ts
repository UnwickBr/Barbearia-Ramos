import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomUUID } from "node:crypto";
import { barbers, servicesById, timeSlots } from "../_lib/barbershop";
import { ensureSchema, sql } from "../_lib/db";
import { parseJsonBody, sendJson } from "../_lib/http";
import { getAuthenticatedUser } from "../_lib/user";

type ReservationBody = {
  serviceId?: string;
  barberName?: string;
  reservationDate?: string;
  reservationTime?: string;
};

type ReservationRow = {
  id: string;
  service_id: string;
  service_name: string;
  service_price: string;
  service_duration_minutes: number;
  barber_name: string;
  reservation_date: string;
  reservation_time: string;
  status: string;
  created_at: string;
};

const mapReservation = (reservation: ReservationRow) => ({
  id: reservation.id,
  serviceId: reservation.service_id,
  serviceName: reservation.service_name,
  servicePrice: Number(reservation.service_price),
  serviceDurationMinutes: reservation.service_duration_minutes,
  barberName: reservation.barber_name,
  reservationDate: reservation.reservation_date,
  reservationTime: reservation.reservation_time.slice(0, 5),
  status: reservation.status,
  createdAt: reservation.created_at,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await ensureSchema();

  const user = await getAuthenticatedUser(req);

  if (!user) {
    return sendJson(res, 401, { error: "Faça login para continuar." });
  }

  if (req.method === "GET") {
    const rows = (await sql`
      SELECT id, service_id, service_name, service_price, service_duration_minutes, barber_name, reservation_date, reservation_time, status, created_at
      FROM reservations
      WHERE user_id = ${user.id}
      ORDER BY reservation_date DESC, reservation_time DESC, created_at DESC
    `) as ReservationRow[];

    return sendJson(res, 200, { reservations: rows.map(mapReservation) });
  }

  if (req.method === "POST") {
    const body = await parseJsonBody<ReservationBody>(req);
    const serviceId = body.serviceId?.trim();
    const barberName = body.barberName?.trim();
    const reservationDate = body.reservationDate?.trim();
    const reservationTime = body.reservationTime?.trim();

    if (!serviceId || !barberName || !reservationDate || !reservationTime) {
      return sendJson(res, 400, { error: "Todos os dados da reserva são obrigatórios." });
    }

    const service = servicesById[serviceId];

    if (!service) {
      return sendJson(res, 400, { error: "Serviço inválido." });
    }

    if (!barbers.includes(barberName as (typeof barbers)[number])) {
      return sendJson(res, 400, { error: "Barbeiro inválido." });
    }

    if (!timeSlots.includes(reservationTime as (typeof timeSlots)[number])) {
      return sendJson(res, 400, { error: "Horário inválido." });
    }

    const selectedDate = new Date(`${reservationDate}T12:00:00`);

    if (Number.isNaN(selectedDate.getTime())) {
      return sendJson(res, 400, { error: "Data inválida." });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      return sendJson(res, 400, { error: "Escolha uma data de hoje em diante." });
    }

    try {
      const result = (await sql`
        INSERT INTO reservations (
          id,
          user_id,
          service_id,
          service_name,
          service_price,
          service_duration_minutes,
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
          ${barberName},
          ${reservationDate},
          ${reservationTime}
        )
        RETURNING id, service_id, service_name, service_price, service_duration_minutes, barber_name, reservation_date, reservation_time, status, created_at
      `) as ReservationRow[];

      return sendJson(res, 201, { reservation: mapReservation(result[0]) });
    } catch (error) {
      if (error instanceof Error && error.message.toLowerCase().includes("reservations_unique_slot")) {
        return sendJson(res, 409, { error: "Esse horário já foi reservado para esse barbeiro." });
      }

      return sendJson(res, 500, { error: "Não foi possível concluir a reserva." });
    }
  }

  return sendJson(res, 405, { error: "Method not allowed." });
}
