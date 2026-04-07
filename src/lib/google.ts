import { buildReservationDateTime, formatReservationDateTime } from "@/lib/dates";

const GOOGLE_ACCESS_TOKEN_KEY = "barbearia_ramos_google_access_token";
const GOOGLE_SCOPE_KEY = "barbearia_ramos_google_scopes";
const GOOGLE_API_TIMEZONE = "America/Sao_Paulo";

export const GOOGLE_BOOKING_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/gmail.send",
].join(" ");

const formatCalendarDateTime = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
};

const toBase64Url = (value: string) => {
  const bytes = new TextEncoder().encode(value);
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

export const storeGoogleAccessToken = (accessToken: string, scopes?: string) => {
  sessionStorage.setItem(GOOGLE_ACCESS_TOKEN_KEY, accessToken);

  if (scopes) {
    sessionStorage.setItem(GOOGLE_SCOPE_KEY, scopes);
  }
};

export const getStoredGoogleAccessToken = () => sessionStorage.getItem(GOOGLE_ACCESS_TOKEN_KEY);

export const clearStoredGoogleAccessToken = () => {
  sessionStorage.removeItem(GOOGLE_ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(GOOGLE_SCOPE_KEY);
};

export const hasStoredGoogleScope = (scope: string) => {
  const scopes = sessionStorage.getItem(GOOGLE_SCOPE_KEY);

  if (!scopes) {
    return false;
  }

  return scopes.split(/\s+/).includes(scope);
};

type CalendarPayload = {
  accessToken: string;
  serviceName: string;
  barberName: string;
  reservationDate: string;
  reservationTime: string;
  serviceDurationMinutes: number;
  userEmail: string;
};

export const createGoogleCalendarEvent = async ({
  accessToken,
  serviceName,
  barberName,
  reservationDate,
  reservationTime,
  serviceDurationMinutes,
  userEmail,
}: CalendarPayload) => {
  const startDate = buildReservationDateTime(reservationDate, reservationTime);

  if (!startDate) {
    throw new Error("Nao foi possivel interpretar a data do agendamento.");
  }

  const endDate = new Date(startDate.getTime() + serviceDurationMinutes * 60 * 1000);
  const response = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      summary: `${serviceName} - Barbearia Ramos`,
      description: `Agendamento confirmado com ${barberName} na Barbearia Ramos.`,
      start: {
        dateTime: formatCalendarDateTime(startDate),
        timeZone: GOOGLE_API_TIMEZONE,
      },
      end: {
        dateTime: formatCalendarDateTime(endDate),
        timeZone: GOOGLE_API_TIMEZONE,
      },
      attendees: [{ email: userEmail }],
      reminders: {
        useDefault: true,
      },
    }),
  });

  const data = (await response.json().catch(() => ({}))) as { id?: string; htmlLink?: string; error?: { message?: string } };

  if (!response.ok || !data.id) {
    throw new Error(data.error?.message || "O Google Calendar recusou a criacao do evento.");
  }

  return {
    eventId: data.id,
    eventLink: data.htmlLink ?? null,
  };
};

export const deleteGoogleCalendarEvent = async (accessToken: string, eventId: string) => {
  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}?sendUpdates=all`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    const data = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(data.error?.message || "Nao foi possivel remover o evento do Google Calendar.");
  }
};

type EmailPayload = {
  accessToken: string;
  to: string;
  subject: string;
  text: string;
};

export const sendGmailMessage = async ({ accessToken, to, subject, text }: EmailPayload) => {
  const raw = toBase64Url(
    [
      `To: ${to}`,
      "Content-Type: text/plain; charset=UTF-8",
      "MIME-Version: 1.0",
      `Subject: ${subject}`,
      "",
      text,
    ].join("\r\n"),
  );

  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw }),
  });

  const data = (await response.json().catch(() => ({}))) as { id?: string; error?: { message?: string } };

  if (!response.ok || !data.id) {
    throw new Error(data.error?.message || "Nao foi possivel enviar o e-mail de confirmacao.");
  }
};

export const buildReservationConfirmationEmail = (serviceName: string, barberName: string, reservationDate: string, reservationTime: string) => ({
  subject: "Confirmacao do seu agendamento - Barbearia Ramos",
  text: [
    "Seu agendamento foi confirmado na Barbearia Ramos.",
    "",
    `Servico: ${serviceName}`,
    `Barbeiro: ${barberName}`,
    `Data: ${formatReservationDateTime(reservationDate, reservationTime)}`,
    "",
    "Aguardamos voce.",
  ].join("\n"),
});

export const buildReservationCancellationEmail = (serviceName: string, barberName: string, reservationDate: string, reservationTime: string) => ({
  subject: "Cancelamento do seu agendamento - Barbearia Ramos",
  text: [
    "Seu agendamento foi cancelado na Barbearia Ramos.",
    "",
    `Servico: ${serviceName}`,
    `Barbeiro: ${barberName}`,
    `Data: ${formatReservationDateTime(reservationDate, reservationTime)}`,
    "",
    "Se quiser, voce pode agendar um novo horario pelo site.",
  ].join("\n"),
});

export const buildAdminCancellationEmail = (
  serviceName: string,
  barberName: string,
  reservationDate: string,
  reservationTime: string,
  justification: string,
) => ({
  subject: "Seu agendamento foi cancelado pela Barbearia Ramos",
  text: [
    "Seu agendamento foi cancelado por um administrador da Barbearia Ramos.",
    "",
    `Servico: ${serviceName}`,
    `Barbeiro: ${barberName}`,
    `Data: ${formatReservationDateTime(reservationDate, reservationTime)}`,
    "",
    "Justificativa:",
    justification,
    "",
    "Se precisar, entre em contato para remarcar.",
  ].join("\n"),
});

export const buildAdminRescheduleEmail = (
  serviceName: string,
  barberName: string,
  reservationDate: string,
  reservationTime: string,
) => ({
  subject: "Seu agendamento foi remarcado - Barbearia Ramos",
  text: [
    "Seu agendamento foi remarcado por um administrador da Barbearia Ramos.",
    "",
    `Servico: ${serviceName}`,
    `Barbeiro: ${barberName}`,
    `Nova data: ${formatReservationDateTime(reservationDate, reservationTime)}`,
    "",
    "Se precisar, responda este e-mail para falar com a barbearia.",
  ].join("\n"),
});
