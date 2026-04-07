export type ReservationRow = {
  id: string;
  user_id?: string;
  barber_user_id?: string | null;
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
  cancellation_reason: string | null;
  cancelled_by_email: string | null;
  created_at: string;
  customer_name?: string;
  customer_email?: string;
};

const extractDateString = (value: string | Date) => {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : String(value);
};

export const mapReservation = (reservation: ReservationRow) => ({
  id: reservation.id,
  serviceId: reservation.service_id,
  serviceName: reservation.service_name,
  servicePrice: Number(reservation.service_price),
  serviceDurationMinutes: reservation.service_duration_minutes,
  barberUserId: reservation.barber_user_id ?? null,
  barberName: reservation.barber_name,
  reservationDate: extractDateString(reservation.reservation_date),
  reservationTime: reservation.reservation_time.slice(0, 5),
  status: reservation.status,
  googleCalendarEventId: reservation.google_calendar_event_id,
  googleCalendarEventLink: reservation.google_calendar_event_link,
  cancelledAt: reservation.cancelled_at,
  cancellationReason: reservation.cancellation_reason,
  cancelledByEmail: reservation.cancelled_by_email,
  customerName: reservation.customer_name,
  customerEmail: reservation.customer_email,
  createdAt: reservation.created_at,
});
