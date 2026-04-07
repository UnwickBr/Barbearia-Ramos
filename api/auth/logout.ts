import type { VercelRequest, VercelResponse } from "@vercel/node";
import { clearCookie, sendJson } from "../_lib/http";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  clearCookie(res, "barbearia_ramos_session");
  return sendJson(res, 200, { success: true });
}
