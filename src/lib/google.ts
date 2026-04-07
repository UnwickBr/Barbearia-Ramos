import { buildReservationDateTime, formatReservationDateTime } from "@/lib/dates";

const GOOGLE_ACCESS_TOKEN_KEY = "barbearia_ramos_google_access_token";
const GOOGLE_SCOPE_KEY = "barbearia_ramos_google_scopes";
const GOOGLE_API_TIMEZONE = "America/Sao_Paulo";

export const GOOGLE_CALENDAR_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar.events",
].join(" ");

export const GOOGLE_EMAIL_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/gmail.send",
].join(" ");

export const GOOGLE_LOGIN_SCOPES = [
  "openid",
  "email",
  "profile",
].join(" ");

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

const GOOGLE_CALENDAR_REQUIRED_SCOPES = ["https://www.googleapis.com/auth/calendar.events"];
const GOOGLE_EMAIL_REQUIRED_SCOPES = ["https://www.googleapis.com/auth/gmail.send"];

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

export const hasGoogleCalendarScopes = () => GOOGLE_CALENDAR_REQUIRED_SCOPES.every((scope) => hasStoredGoogleScope(scope));

export const hasGoogleEmailScopes = () => GOOGLE_EMAIL_REQUIRED_SCOPES.every((scope) => hasStoredGoogleScope(scope));

export const ensureGoogleIdentityScript = async () => {
  if (window.google?.accounts?.oauth2) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]');

    const handleLoad = () => resolve();
    const handleError = () => reject(new Error("Nao foi possivel carregar o script do Google."));

    if (existingScript) {
      existingScript.addEventListener("load", handleLoad, { once: true });
      existingScript.addEventListener("error", handleError, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.addEventListener("load", handleLoad, { once: true });
    script.addEventListener("error", handleError, { once: true });
    document.head.appendChild(script);
  });

  if (!window.google?.accounts?.oauth2) {
    throw new Error("O SDK do Google foi carregado, mas o cliente OAuth nao ficou disponivel.");
  }
};

const requestGoogleAccessToken = async (scope: string, prompt: "" | "consent" = "consent") => {
  if (!googleClientId) {
    throw new Error("O login Google nao esta configurado neste ambiente.");
  }

  await ensureGoogleIdentityScript();

  return await new Promise<{ accessToken: string; scope?: string }>((resolve, reject) => {
    const tokenClient = window.google?.accounts?.oauth2.initTokenClient({
      client_id: googleClientId,
      scope,
      callback: (response) => {
        if (response.error) {
          reject(new Error(response.error));
          return;
        }

        if (!response.access_token) {
          reject(new Error("O Google nao retornou um token de acesso.")); 
          return;
        }

        resolve({
          accessToken: response.access_token,
          scope: response.scope,
        });
      },
    });

    if (!tokenClient) {
      reject(new Error("Nao foi possivel iniciar o cliente OAuth do Google."));
      return;
    }

    tokenClient.requestAccessToken({ prompt });
  });
};

export const requestGoogleCalendarAccessToken = async (prompt: "" | "consent" = "consent") =>
  await requestGoogleAccessToken(GOOGLE_CALENDAR_SCOPES, prompt);

export const requestGoogleEmailAccessToken = async (prompt: "" | "consent" = "consent") =>
  await requestGoogleAccessToken(GOOGLE_EMAIL_SCOPES, prompt);

export const requestGoogleLoginAccessToken = async (prompt: "" | "consent" = "consent") => {
  if (!googleClientId) {
    throw new Error("O login Google nao esta configurado neste ambiente.");
  }

  await ensureGoogleIdentityScript();

  return await new Promise<{ accessToken: string; scope?: string }>((resolve, reject) => {
    const tokenClient = window.google?.accounts?.oauth2.initTokenClient({
      client_id: googleClientId,
      scope: GOOGLE_LOGIN_SCOPES,
      callback: (response) => {
        if (response.error) {
          reject(new Error(response.error));
          return;
        }

        if (!response.access_token) {
          reject(new Error("O Google nao retornou um token de acesso."));
          return;
        }

        resolve({
          accessToken: response.access_token,
          scope: response.scope,
        });
      },
    });

    if (!tokenClient) {
      reject(new Error("Nao foi possivel iniciar o cliente OAuth do Google."));
      return;
    }

    tokenClient.requestAccessToken({ prompt });
  });
};

export const isGoogleAuthError = (error: unknown) => {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("insufficient") ||
    message.includes("login required") ||
    message.includes("invalid credentials") ||
    message.includes("unauthorized") ||
    message.includes("token") ||
    message.includes("scope")
  );
};

export const isGoogleNotFoundError = (error: unknown) => {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return message.includes("not found") || message.includes("404");
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

export const updateGoogleCalendarEvent = async ({
  accessToken,
  eventId,
  serviceName,
  barberName,
  reservationDate,
  reservationTime,
  serviceDurationMinutes,
  userEmail,
}: CalendarPayload & { eventId: string }) => {
  const startDate = buildReservationDateTime(reservationDate, reservationTime);

  if (!startDate) {
    throw new Error("Nao foi possivel interpretar a data do agendamento.");
  }

  const endDate = new Date(startDate.getTime() + serviceDurationMinutes * 60 * 1000);
  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}?sendUpdates=all`, {
    method: "PATCH",
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
    throw new Error(data.error?.message || "O Google Calendar recusou a atualizacao do evento.");
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

export const getGoogleCalendarEvent = async (accessToken: string, eventId: string) => {
  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = (await response.json().catch(() => ({}))) as { id?: string; htmlLink?: string; error?: { message?: string } };

  if (!response.ok || !data.id) {
    throw new Error(data.error?.message || "Nao foi possivel confirmar o evento no Google Calendar.");
  }

  return {
    eventId: data.id,
    eventLink: data.htmlLink ?? null,
  };
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
  justification: string,
) => ({
  subject: "Seu agendamento foi remarcado - Barbearia Ramos",
  text: [
    "Seu agendamento foi remarcado por um administrador da Barbearia Ramos.",
    "",
    `Servico: ${serviceName}`,
    `Barbeiro: ${barberName}`,
    `Nova data: ${formatReservationDateTime(reservationDate, reservationTime)}`,
    "",
    "Justificativa:",
    justification,
    "",
    "Se precisar, responda este e-mail para falar com a barbearia.",
  ].join("\n"),
});
