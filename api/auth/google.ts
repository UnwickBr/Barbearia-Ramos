import type { ApiRequest, ApiResponse } from "../../server/types.js";
import { isAdminEmail } from "../../server/admin.js";
import { createSessionToken } from "../../server/auth.js";
import { ensureSchema, sql } from "../../server/db.js";
import { verifyGoogleAccessToken, verifyGoogleCredential } from "../../server/google.js";
import { parseJsonBody, sendJson, setCookie } from "../../server/http.js";
import { mapUser } from "../../server/user.js";

type GoogleAuthBody = {
  credential?: string;
  accessToken?: string;
};

type UserRow = {
  id: string;
  name: string;
  email: string;
  is_admin: boolean;
  avatar_url: string;
  created_at: string;
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  await ensureSchema();

  const body = await parseJsonBody<GoogleAuthBody>(req);
  const credential = body.credential?.trim();
  const accessToken = body.accessToken?.trim();

  if (!credential && !accessToken) {
    return sendJson(res, 400, { error: "Credencial do Google obrigatória." });
  }

  try {
    const googleUser = credential
      ? await verifyGoogleCredential(credential)
      : await verifyGoogleAccessToken(accessToken as string);
    const isAdmin = isAdminEmail(googleUser.email);

    const existingByGoogle = (await sql`
      SELECT id, name, email, is_admin, avatar_url, created_at
      FROM users
      WHERE google_sub = ${googleUser.sub}
      LIMIT 1
    `) as UserRow[];

    let userRow = existingByGoogle[0];

    if (!userRow) {
      const existingByEmail = (await sql`
        SELECT id, name, email, is_admin, avatar_url, created_at
        FROM users
        WHERE email = ${googleUser.email}
        LIMIT 1
      `) as UserRow[];

      if (existingByEmail[0]) {
        const updated = (await sql`
          UPDATE users
          SET
            google_sub = ${googleUser.sub},
            name = ${googleUser.name},
            is_admin = ${isAdmin},
            avatar_url = ${googleUser.picture}
          WHERE email = ${googleUser.email}
          RETURNING id, name, email, is_admin, avatar_url, created_at
        `) as UserRow[];

        userRow = updated[0];
      } else {
        const created = (await sql`
          INSERT INTO users (id, name, email, is_admin, google_sub, password_hash, avatar_url)
          VALUES (${googleUser.sub}, ${googleUser.name}, ${googleUser.email}, ${isAdmin}, ${googleUser.sub}, ${"google-oauth"}, ${googleUser.picture})
          RETURNING id, name, email, is_admin, avatar_url, created_at
        `) as UserRow[];

        userRow = created[0];
      }
    } else {
      const refreshed = (await sql`
        UPDATE users
        SET
          name = ${googleUser.name},
          email = ${googleUser.email},
          is_admin = ${isAdmin},
          avatar_url = ${googleUser.picture}
        WHERE google_sub = ${googleUser.sub}
        RETURNING id, name, email, is_admin, avatar_url, created_at
      `) as UserRow[];

      userRow = refreshed[0];
    }

    const user = mapUser(userRow);
    const token = createSessionToken({ sub: user.id, email: user.email, name: user.name });
    setCookie(res, "barbearia_ramos_session", token, 60 * 60 * 24 * 7);

    return sendJson(res, 200, { user });
  } catch {
    return sendJson(res, 401, { error: "Não foi possível autenticar com Google." });
  }
}
