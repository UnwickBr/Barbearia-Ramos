export interface User {
  id: string;
  name: string;
  email: string;
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
  createdAt: string;
}
