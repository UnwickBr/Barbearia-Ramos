import type { Reservation, User } from "@/lib/types";

type JsonRequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
};

async function apiRequest<T>(url: string, options: JsonRequestOptions = {}) {
  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers: options.body ? { "Content-Type": "application/json" } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
    credentials: "include",
  });

  const data = (await response.json().catch(() => ({}))) as T & { error?: string };

  if (!response.ok) {
    throw new Error(data.error || "Ocorreu um erro inesperado.");
  }

  return data;
}

export const authApi = {
  me: () => apiRequest<{ user: User | null }>("/api/auth/me"),
  google: (credential: string) =>
    apiRequest<{ user: User }>("/api/auth/google", { method: "POST", body: { credential } }),
  googleAccessToken: (accessToken: string) =>
    apiRequest<{ user: User }>("/api/auth/google", { method: "POST", body: { accessToken } }),
  logout: () => apiRequest<{ success: boolean }>("/api/auth/logout", { method: "POST" }),
};

export const reservationsApi = {
  list: () => apiRequest<{ reservations: Reservation[] }>("/api/reservations"),
  create: (payload: { serviceId: string; barberName: string; reservationDate: string; reservationTime: string }) =>
    apiRequest<{ reservation: Reservation }>("/api/reservations", { method: "POST", body: payload }),
  attachCalendarEvent: (reservationId: string, payload: { googleCalendarEventId: string; googleCalendarEventLink?: string | null }) =>
    apiRequest<{ reservation: Reservation }>(`/api/reservations/${reservationId}`, { method: "PATCH", body: payload }),
  cancel: (reservationId: string) => apiRequest<{ reservation: Reservation }>(`/api/reservations/${reservationId}`, { method: "DELETE" }),
};
