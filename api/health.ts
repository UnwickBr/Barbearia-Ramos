import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sendJson } from "./_lib/http";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const env = {
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
    hasSessionSecret: Boolean(process.env.SESSION_SECRET),
    node: process.version,
  };

  try {
    const { ensureSchema, sql } = await import("./_lib/db");
    await ensureSchema();
    const result = await sql`SELECT NOW() as now`;

    return sendJson(res, 200, {
      ok: true,
      env,
      db: {
        connected: true,
        now: result[0]?.now ?? null,
      },
    });
  } catch (error) {
    return sendJson(res, 500, {
      ok: false,
      env,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
