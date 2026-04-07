import { ensureSchema, sql } from "../../../server/db.js";
import { sendJson } from "../../../server/http.js";
import type { ApiRequest, ApiResponse } from "../../../server/types.js";
import { getAuthenticatedUser } from "../../../server/user.js";

type UserRow = {
  id: string;
  name: string;
  email: string;
  is_admin: boolean;
  role: "admin" | "collaborator" | "customer";
  barber_name: string | null;
  avatar_url: string;
  created_at: string;
};

const mapAdminUser = (user: UserRow) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  isAdmin: user.is_admin,
  role: user.is_admin ? "admin" : user.role,
  barberName: user.barber_name,
  avatarUrl: user.avatar_url,
  createdAt: user.created_at,
});

export default async function handler(req: ApiRequest, res: ApiResponse) {
  await ensureSchema();

  const user = await getAuthenticatedUser(req);

  if (!user) {
    return sendJson(res, 401, { error: "Faca login para continuar." });
  }

  if (!user.isAdmin) {
    return sendJson(res, 403, { error: "Acesso restrito a administradores." });
  }

  if (req.method !== "GET") {
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  const querySearch = Array.isArray(req.query?.search) ? req.query?.search[0]?.trim() : req.query?.search?.trim();
  const search = querySearch?.toLowerCase() ?? "";

  const rows = search
    ? ((await sql`
        SELECT id, name, email, is_admin, role, barber_name, avatar_url, created_at
        FROM users
        WHERE LOWER(name) LIKE ${`%${search}%`} OR LOWER(email) LIKE ${`%${search}%`}
        ORDER BY created_at DESC
      `) as UserRow[])
    : ((await sql`
        SELECT id, name, email, is_admin, role, barber_name, avatar_url, created_at
        FROM users
        ORDER BY created_at DESC
      `) as UserRow[]);

  return sendJson(res, 200, { users: rows.map(mapAdminUser) });
}
