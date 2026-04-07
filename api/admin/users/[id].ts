import { barbers } from "../../../server/barbershop.js";
import { ensureSchema, sql } from "../../../server/db.js";
import { parseJsonBody, sendJson } from "../../../server/http.js";
import type { ApiRequest, ApiResponse } from "../../../server/types.js";
import { getAuthenticatedUser } from "../../../server/user.js";

type UpdateUserBody = {
  role?: "admin" | "collaborator" | "customer";
  barberName?: string | null;
};

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

  const currentUser = await getAuthenticatedUser(req);

  if (!currentUser) {
    return sendJson(res, 401, { error: "Faca login para continuar." });
  }

  if (!currentUser.isAdmin) {
    return sendJson(res, 403, { error: "Acesso restrito a administradores." });
  }

  if (req.method !== "PATCH") {
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  const queryId = req.query?.id;
  const userId = Array.isArray(queryId) ? queryId[0]?.trim() ?? "" : String(queryId ?? "").trim();

  if (!userId) {
    return sendJson(res, 400, { error: "Usuario invalido." });
  }

  const body = await parseJsonBody<UpdateUserBody>(req);
  const role = body.role;
  const barberName = body.barberName?.trim() || null;

  if (!role || !["admin", "collaborator", "customer"].includes(role)) {
    return sendJson(res, 400, { error: "Perfil invalido." });
  }

  if (role === "collaborator" && (!barberName || !barbers.includes(barberName as (typeof barbers)[number]))) {
    return sendJson(res, 400, { error: "Selecione um barbeiro valido para o colaborador." });
  }

  const updated = (await sql`
    UPDATE users
    SET
      is_admin = ${role === "admin"},
      role = ${role},
      barber_name = ${role === "collaborator" ? barberName : null}
    WHERE id = ${userId}
    RETURNING id, name, email, is_admin, role, barber_name, avatar_url, created_at
  `) as UserRow[];

  if (!updated[0]) {
    return sendJson(res, 404, { error: "Usuario nao encontrado." });
  }

  return sendJson(res, 200, { user: mapAdminUser(updated[0]) });
}
