import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createSessionToken, verifyPassword } from "../_lib/auth";
import { ensureSchema, sql } from "../_lib/db";
import { parseJsonBody, sendJson, setCookie } from "../_lib/http";
import { mapUser } from "../_lib/user";

type LoginBody = {
  email?: string;
  password?: string;
};

type LoginUserRow = {
  id: string;
  name: string;
  email: string;
  avatar_url: string;
  created_at: string;
  password_hash: string;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  await ensureSchema();

  const body = await parseJsonBody<LoginBody>(req);
  const email = body.email?.trim().toLowerCase();
  const password = body.password?.trim();

  if (!email || !password) {
    return sendJson(res, 400, { error: "E-mail e senha são obrigatórios." });
  }

  const result = (await sql`
    SELECT id, name, email, avatar_url, created_at, password_hash
    FROM users
    WHERE email = ${email}
    LIMIT 1
  `) as LoginUserRow[];

  const user = result[0];

  if (!user || !verifyPassword(password, user.password_hash)) {
    return sendJson(res, 401, { error: "Credenciais inválidas." });
  }

  const mappedUser = mapUser(user);
  const token = createSessionToken({ sub: mappedUser.id, email: mappedUser.email, name: mappedUser.name });
  setCookie(res, "barbearia_ramos_session", token, 60 * 60 * 24 * 7);

  return sendJson(res, 200, { user: mappedUser });
}
