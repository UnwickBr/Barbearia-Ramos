import { clearCookie, sendJson } from "../../server/http";
import type { ApiRequest, ApiResponse } from "../../server/types";

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  clearCookie(res, "barbearia_ramos_session");
  return sendJson(res, 200, { success: true });
}
