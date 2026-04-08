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
  role?: string;
  barber_name?: string | null;
  birth_date?: string | null;
  photo_url?: string | null;
  phone?: string | null;
  notes?: string | null;
  avatar_url: string;
  created_at: string;
};

export type AuthenticatedUser = {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  isAdmin: boolean;
  role: "admin" | "collaborator" | "customer";
  barberName: string | null;
  birthDate: string | null;
  photoUrl: string | null;
  avatarUrl: string;
  phone: string | null;
  notes: string | null;
  createdAt: string;
};

export const splitUserName = (name: string) => {
  const trimmed = name.trim();

  if (!trimmed) {
    return { firstName: "", lastName: "" };
  }

  const parts = trimmed.split(/\s+/);
  const firstName = parts[0] ?? "";
  const lastName = parts.slice(1).join(" ");

  return { firstName, lastName };
};

export const mapUser = (user: DatabaseUser): AuthenticatedUser => {
  const { firstName, lastName } = splitUserName(user.name);

  return {
    id: user.id,
    name: user.name,
    firstName,
    lastName,
    email: user.email,
    isAdmin: user.is_admin ?? isAdminEmail(user.email),
    role: (user.is_admin ?? isAdminEmail(user.email)) ? "admin" : ((user.role as "admin" | "collaborator" | "customer" | undefined) ?? "customer"),
    barberName: user.barber_name ?? null,
    birthDate: user.birth_date ?? null,
    photoUrl: user.photo_url ?? null,
    avatarUrl: user.photo_url || user.avatar_url,
    phone: user.phone ?? null,
    notes: user.notes ?? null,
    createdAt: user.created_at,
  };
};

export const getAuthenticatedUser = async (req: ApiRequest) => {
  const token = getCookie(req, "barbearia_ramos_session");
  const session = verifySessionToken(token);

  if (!session) {
    return null;
  }

  const result = (await sql`
    SELECT id, name, email, is_admin, role, barber_name, birth_date, photo_url, phone, notes, avatar_url, created_at
    FROM users
    WHERE id = ${session.sub}
    LIMIT 1
  `) as DatabaseUser[];

  const user = result[0];
  return user ? mapUser(user) : null;
};
