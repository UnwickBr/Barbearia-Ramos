import { buildAvatarUrl } from "../../server/auth.js";
import { ensureSchema, sql } from "../../server/db.js";
import { parseJsonBody, sendJson } from "../../server/http.js";
import type { ApiRequest, ApiResponse } from "../../server/types.js";
import { getAuthenticatedUser, mapUser } from "../../server/user.js";

type ProfileBody = {
  firstName?: string;
  lastName?: string;
  birthDate?: string | null;
  phone?: string | null;
  photoUrl?: string | null;
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  await ensureSchema();
  const user = await getAuthenticatedUser(req);

  if (!user) {
    return sendJson(res, 401, { user: null });
  }

  if (req.method === "GET") {
    return sendJson(res, 200, { user });
  }

  if (req.method === "PATCH") {
    const body = await parseJsonBody<ProfileBody>(req);
    const firstName = body.firstName?.trim();
    const lastName = body.lastName?.trim();
    const birthDate = body.birthDate?.trim() || null;
    const phone = body.phone?.trim() || null;
    const photoUrl = body.photoUrl?.trim() || null;

    if (!firstName || !lastName) {
      return sendJson(res, 400, { error: "Informe nome e sobrenome." });
    }

    if (birthDate) {
      const parsedDate = new Date(`${birthDate}T12:00:00`);

      if (Number.isNaN(parsedDate.getTime())) {
        return sendJson(res, 400, { error: "Data de nascimento invalida." });
      }
    }

    const fullName = `${firstName} ${lastName}`.trim();
    const updated = (await sql`
      UPDATE users
      SET
        name = ${fullName},
        birth_date = ${birthDate},
        phone = ${phone},
        photo_url = ${photoUrl},
        avatar_url = ${photoUrl || buildAvatarUrl(fullName)}
      WHERE id = ${user.id}
      RETURNING id, name, email, is_admin, role, barber_name, birth_date, photo_url, phone, notes, avatar_url, created_at
    `) as Array<{
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
    }>;

    return sendJson(res, 200, { user: mapUser(updated[0]) });
  }

  return sendJson(res, 405, { error: "Method not allowed." });
}
