import type { ApiRequest, ApiResponse } from "../../server/types.js";
import { sendJson } from "../../server/http.js";

export default async function handler(_req: ApiRequest, res: ApiResponse) {
  return sendJson(res, 410, {
    error: "Login por e-mail e senha foi desativado. Use sua conta Google.",
  });
}
