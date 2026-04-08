import { randomUUID } from "node:crypto";
import { buildAvatarUrl, createSessionToken, hashPassword, verifyPassword } from "../../server/auth.js";
import { isAdminEmail } from "../../server/admin.js";
import { ensureSchema, sql } from "../../server/db.js";
import { parseJsonBody, sendJson, setCookie } from "../../server/http.js";
import { mapUser } from "../../server/user.js";
import type { ApiRequest, ApiResponse } from "../../server/types.js";

type PasswordAuthBody = {
  action?: "register" | "login";
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
};

type UserRow = {
  id: string;
  name: string;
  email: string;
  is_admin: boolean;
  role: "admin" | "collaborator" | "customer";
  barber_name: string | null;
  birth_date: string | null;
  photo_url: string | null;
  phone: string | null;
  notes: string | null;
  avatar_url: string;
  created_at: string;
  password_hash?: string | null;
};

const isValidBirthDate = (value?: string) => {
  if (!value) {
    return false;
  }

  const date = new Date(`${value}T12:00:00`);
  return !Number.isNaN(date.getTime());
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  await ensureSchema();

  const body = await parseJsonBody<PasswordAuthBody>(req);
  const action = body.action;
  const email = body.email?.trim().toLowerCase();
  const password = body.password?.trim();

  if (!action || !email || !password) {
    return sendJson(res, 400, { error: "Informe a acao, o e-mail e a senha." });
  }

  if (action === "register") {
    const firstName = body.firstName?.trim();
    const lastName = body.lastName?.trim();
    const confirmPassword = body.confirmPassword?.trim();
    const birthDate = body.birthDate?.trim();

    if (!firstName || !lastName || !confirmPassword || !birthDate) {
      return sendJson(res, 400, { error: "Preencha nome, sobrenome, data de nascimento e confirmacao de senha." });
    }

    if (password.length < 6) {
      return sendJson(res, 400, { error: "A senha deve ter pelo menos 6 caracteres." });
    }

    if (password !== confirmPassword) {
      return sendJson(res, 400, { error: "A confirmacao de senha nao confere." });
    }

    if (!isValidBirthDate(birthDate)) {
      return sendJson(res, 400, { error: "Data de nascimento invalida." });
    }

    const existing = (await sql`
      SELECT id
      FROM users
      WHERE email = ${email}
      LIMIT 1
    `) as Array<{ id: string }>;

    if (existing[0]) {
      return sendJson(res, 409, { error: "Ja existe uma conta com esse e-mail." });
    }

    const fullName = `${firstName} ${lastName}`.trim();
    const isAdmin = isAdminEmail(email);
    const created = (await sql`
      INSERT INTO users (
        id,
        name,
        email,
        is_admin,
        role,
        barber_name,
        password_hash,
        birth_date,
        avatar_url
      )
      VALUES (
        ${randomUUID()},
        ${fullName},
        ${email},
        ${isAdmin},
        ${isAdmin ? "admin" : "customer"},
        ${null},
        ${hashPassword(password)},
        ${birthDate},
        ${buildAvatarUrl(fullName)}
      )
      RETURNING
        id, name, email, is_admin, role, barber_name, birth_date, photo_url, phone, notes, avatar_url, created_at
    `) as UserRow[];

    const user = mapUser(created[0]);
    const token = createSessionToken({ sub: user.id, email: user.email, name: user.name });
    setCookie(res, "barbearia_ramos_session", token, 60 * 60 * 24 * 7);

    return sendJson(res, 201, { user });
  }

  if (action === "login") {
    const existing = (await sql`
      SELECT
        id, name, email, is_admin, role, barber_name, birth_date, photo_url, phone, notes, avatar_url, created_at, password_hash
      FROM users
      WHERE email = ${email}
      LIMIT 1
    `) as UserRow[];

    const account = existing[0];

    if (!account?.password_hash || !verifyPassword(password, account.password_hash)) {
      return sendJson(res, 401, { error: "E-mail ou senha invalidos." });
    }

    const user = mapUser(account);
    const token = createSessionToken({ sub: user.id, email: user.email, name: user.name });
    setCookie(res, "barbearia_ramos_session", token, 60 * 60 * 24 * 7);

    return sendJson(res, 200, { user });
  }

  return sendJson(res, 400, { error: "Acao invalida." });
}
