import type { ApiRequest, ApiResponse } from "./types.js";

const jsonHeaders = {
  "Content-Type": "application/json; charset=utf-8",
};

export const sendJson = (res: ApiResponse, status: number, body: unknown) => {
  res.status(status).setHeader("Content-Type", jsonHeaders["Content-Type"]);
  return res.send(JSON.stringify(body));
};

export const parseJsonBody = async <T>(req: ApiRequest): Promise<T> => {
  if (typeof req.body === "object" && req.body !== null) {
    return req.body as T;
  }

  const rawBody = await new Promise<string>((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });

  return JSON.parse(rawBody || "{}") as T;
};

export const getCookie = (req: ApiRequest, name: string) => {
  const header = req.headers.cookie;

  if (!header) {
    return null;
  }

  const cookie = header
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));

  return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : null;
};

export const setCookie = (res: ApiResponse, name: string, value: string, maxAgeSeconds: number) => {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader("Set-Cookie", `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure}`);
};

export const clearCookie = (res: ApiResponse, name: string) => {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader("Set-Cookie", `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`);
};
