export interface User {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  avatarUrl: string;
  createdAt: string;
}

export interface Reservation {
  id: string;
  serviceId: string;
  serviceName: string;
  servicePrice: number;
  serviceDurationMinutes: number;
  barberName: string;
  reservationDate: string;
  reservationTime: string;
  status: string;
  googleCalendarEventId?: string | null;
  googleCalendarEventLink?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  cancelledByEmail?: string | null;
  customerName?: string;
  customerEmail?: string;
  createdAt: string;
}
