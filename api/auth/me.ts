import { ensureSchema } from "../_lib/db";
import { sendJson } from "../_lib/http";
import type { ApiRequest, ApiResponse } from "../_lib/types";
import { getAuthenticatedUser } from "../_lib/user";

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
