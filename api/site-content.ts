import { ensureSchema } from "../server/db.js";
import { sendJson } from "../server/http.js";
import { getSiteContentRow, mapSiteContent } from "../server/site-content.js";
import type { ApiRequest, ApiResponse } from "../server/types.js";

export default async function handler(req: ApiRequest, res: ApiResponse) {
  await ensureSchema();

  if (req.method !== "GET") {
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  const row = await getSiteContentRow();
  return sendJson(res, 200, { content: mapSiteContent(row) });
}
