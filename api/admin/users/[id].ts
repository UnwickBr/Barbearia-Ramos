import { ensureSchema, sql } from "../../../server/db.js";
import { parseJsonBody, sendJson } from "../../../server/http.js";
import { getSiteContentRow, mapSiteContent } from "../../../server/site-content.js";
import type { ApiRequest, ApiResponse } from "../../../server/types.js";
import { getAuthenticatedUser } from "../../../server/user.js";

type UpdateUserBody = {
  role?: "admin" | "collaborator" | "customer";
  barberName?: string | null;
  photoUrl?: string | null;
  phone?: string | null;
  notes?: string | null;
};

type UserRow = {
  id: string;
  name: string;
  email: string;
  is_admin: boolean;
  role: "admin" | "collaborator" | "customer";
  barber_name: string | null;
  photo_url: string | null;
  phone: string | null;
  notes: string | null;
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
  photoUrl: user.photo_url,
  avatarUrl: user.photo_url || user.avatar_url,
  phone: user.phone,
  notes: user.notes,
  createdAt: user.created_at,
});

export default async function handler(req: ApiRequest, res: ApiResponse) {
  await ensureSchema();
  const siteContent = mapSiteContent(await getSiteContentRow());

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

  const existing = (await sql`
    SELECT id, name, email, is_admin, role, barber_name, photo_url, phone, notes, avatar_url, created_at
    FROM users
    WHERE id = ${userId}
    LIMIT 1
  `) as UserRow[];

  if (!existing[0]) {
    return sendJson(res, 404, { error: "Usuario nao encontrado." });
  }

  const body = await parseJsonBody<UpdateUserBody>(req);
  const role = body.role;
  const barberName = body.barberName?.trim() || null;
  const photoUrl = body.photoUrl?.trim() || null;
  const phone = body.phone?.trim() || null;
  const notes = body.notes?.trim() || null;

  if (!role || !["admin", "collaborator", "customer"].includes(role)) {
    return sendJson(res, 400, { error: "Perfil invalido." });
  }

  if (role === "collaborator" && (!barberName || !siteContent.barbers.includes(barberName))) {
    return sendJson(res, 400, { error: "Selecione um barbeiro valido para o colaborador." });
  }

  const updated = (await sql`
    UPDATE users
    SET
      is_admin = ${role === "admin"},
      role = ${role},
      barber_name = ${role === "collaborator" ? barberName : null},
      photo_url = ${photoUrl},
      phone = ${phone},
      notes = ${notes}
    WHERE id = ${userId}
    RETURNING id, name, email, is_admin, role, barber_name, photo_url, phone, notes, avatar_url, created_at
  `) as UserRow[];

  if (role === "collaborator" && barberName) {
    await sql`
      UPDATE reservations
      SET barber_user_id = NULL
      WHERE barber_user_id = ${userId}
        AND barber_name <> ${barberName}
    `;

    await sql`
      UPDATE reservations
      SET barber_user_id = ${userId}
      WHERE barber_name = ${barberName}
        AND (barber_user_id IS NULL OR barber_user_id = ${userId})
    `;
  } else {
    await sql`
      UPDATE reservations
      SET barber_user_id = NULL
      WHERE barber_user_id = ${userId}
    `;
  }

  return sendJson(res, 200, { user: mapAdminUser(updated[0]) });
}
