import { ensureSchema, sql } from "../server/db.js";
import { sendJson } from "../server/http.js";
import { mapSiteContent, type SiteContentRow } from "../server/site-content.js";
import type { ApiRequest, ApiResponse } from "../server/types.js";

export default async function handler(req: ApiRequest, res: ApiResponse) {
  await ensureSchema();

  if (req.method !== "GET") {
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  const rows = (await sql`
    SELECT
      id,
      hero_title,
      hero_subtitle,
      hero_primary_cta,
      services_eyebrow,
      services_title,
      contact_eyebrow,
      contact_title,
      address_label,
      address_text,
      phone_label,
      phone_text,
      hours_label,
      hours_text,
      footer_text,
      updated_at
    FROM site_content
    WHERE id = 'main'
    LIMIT 1
  `) as SiteContentRow[];

  return sendJson(res, 200, { content: mapSiteContent(rows[0]) });
}
