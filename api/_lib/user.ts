import type { VercelRequest } from "@vercel/node";
import { verifySessionToken } from "./auth";
import { sql } from "./db";
import { getCookie } from "./http";

type DatabaseUser = {
  id: string;
  name: string;
  email: string;
  avatar_url: string;
  created_at: string;
};

export type AuthenticatedUser = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  createdAt: string;
};

export const mapUser = (user: DatabaseUser): AuthenticatedUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  avatarUrl: user.avatar_url,
  createdAt: user.created_at,
});

export const getAuthenticatedUser = async (req: VercelRequest) => {
  const token = getCookie(req, "barbearia_ramos_session");
  const session = verifySessionToken(token);

  if (!session) {
    return null;
  }

  const result = (await sql`
    SELECT id, name, email, avatar_url, created_at
    FROM users
    WHERE id = ${session.sub}
    LIMIT 1
  `) as DatabaseUser[];

  const user = result[0];
  return user ? mapUser(user) : null;
};
