import { verifySessionToken } from "./auth.js";
import { isAdminEmail } from "./admin.js";
import { sql } from "./db.js";
import { getCookie } from "./http.js";
import type { ApiRequest } from "./types.js";

type DatabaseUser = {
  id: string;
  name: string;
  email: string;
  is_admin?: boolean;
  avatar_url: string;
  created_at: string;
};

export type AuthenticatedUser = {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  avatarUrl: string;
  createdAt: string;
};

export const mapUser = (user: DatabaseUser): AuthenticatedUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  isAdmin: user.is_admin ?? isAdminEmail(user.email),
  avatarUrl: user.avatar_url,
  createdAt: user.created_at,
});

export const getAuthenticatedUser = async (req: ApiRequest) => {
  const token = getCookie(req, "barbearia_ramos_session");
  const session = verifySessionToken(token);

  if (!session) {
    return null;
  }

  const result = (await sql`
    SELECT id, name, email, is_admin, avatar_url, created_at
    FROM users
    WHERE id = ${session.sub}
    LIMIT 1
  `) as DatabaseUser[];

  const user = result[0];
  return user ? mapUser(user) : null;
};
