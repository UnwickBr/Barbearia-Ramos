export interface User {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  role: "admin" | "collaborator" | "customer";
  barberName: string | null;
  photoUrl: string | null;
  avatarUrl: string;
  phone: string | null;
  notes: string | null;
  createdAt: string;
}

export interface Reservation {
  id: string;
  serviceId: string;
  serviceName: string;
  servicePrice: number;
  serviceDurationMinutes: number;
  barberUserId?: string | null;
  barberName: string;
  reservationDate: string;
  reservationTime: string;
  status: string;
  googleCalendarEventId?: string | null;
  googleCalendarEventLink?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  cancelledByEmail?: string | null;
  rescheduledAt?: string | null;
  rescheduleReason?: string | null;
  rescheduledByEmail?: string | null;
  customerName?: string;
  customerEmail?: string;
  createdAt: string;
}

export interface EmployeeDashboardStat {
  barberName: string;
  totalRevenue: number;
  pendingCount: number;
  completedCount: number;
  cancelledCount: number;
}

export interface DashboardSummary {
  totalProfit: number;
  pendingCount: number;
  completedCount: number;
  cancelledCount: number;
}

export interface AdminDashboardResponse {
  period: string;
  startDate: string;
  endDate: string;
  summary: DashboardSummary;
  stats: EmployeeDashboardStat[];
}

export interface SiteContent {
  heroTitle: string;
  heroSubtitle: string;
  heroPrimaryCta: string;
  servicesEyebrow: string;
  servicesTitle: string;
  contactEyebrow: string;
  contactTitle: string;
  addressLabel: string;
  addressText: string;
  phoneLabel: string;
  phoneText: string;
  hoursLabel: string;
  hoursText: string;
  footerText: string;
}
