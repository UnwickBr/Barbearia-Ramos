import { randomUUID } from "node:crypto";
import { buildAvatarUrl, createSessionToken, hashPassword } from "../_lib/auth";
import { ensureSchema, sql } from "../_lib/db";
import { parseJsonBody, sendJson, setCookie } from "../_lib/http";
import type { ApiRequest, ApiResponse } from "../_lib/types";
import { mapUser } from "../_lib/user";

type RegisterBody = {
  name?: string;
  email?: string;
  password?: string;
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  await ensureSchema();

  const body = await parseJsonBody<RegisterBody>(req);
  const name = body.name?.trim();
  const email = body.email?.trim().toLowerCase();
  const password = body.password?.trim();

  if (!name || !email || !password) {
    return sendJson(res, 400, { error: "Nome, e-mail e senha são obrigatórios." });
  }

  if (password.length < 6) {
    return sendJson(res, 400, { error: "A senha precisa ter pelo menos 6 caracteres." });
  }

  const avatarUrl = buildAvatarUrl(name);

  try {
    const result = (await sql`
      INSERT INTO users (id, name, email, password_hash, avatar_url)
      VALUES (${randomUUID()}, ${name}, ${email}, ${hashPassword(password)}, ${avatarUrl})
      RETURNING id, name, email, avatar_url, created_at
    `) as Array<{ id: string; name: string; email: string; avatar_url: string; created_at: string }>;

    const user = mapUser(result[0]);
    const token = createSessionToken({ sub: user.id, email: user.email, name: user.name });
    setCookie(res, "barbearia_ramos_session", token, 60 * 60 * 24 * 7);

    return sendJson(res, 201, { user });
  } catch (error) {
    if (error instanceof Error && error.message.toLowerCase().includes("duplicate")) {
      return sendJson(res, 409, { error: "Já existe um usuário com esse e-mail." });
    }

    return sendJson(res, 500, { error: "Não foi possível criar a conta." });
  }
}
