import { ensureSchema } from "../../server/db";
import { sendJson } from "../../server/http";
import type { ApiRequest, ApiResponse } from "../../server/types";
import { getAuthenticatedUser } from "../../server/user";

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== "GET") {
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  await ensureSchema();
  const user = await getAuthenticatedUser(req);

  if (!user) {
    return sendJson(res, 401, { user: null });
  }

  return sendJson(res, 200, { user });
}
