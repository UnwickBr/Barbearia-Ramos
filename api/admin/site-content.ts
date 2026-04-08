import { ensureSchema, sql } from "../../server/db.js";
import { parseJsonBody, sendJson } from "../../server/http.js";
import { getAuthenticatedUser } from "../../server/user.js";
import { mapSiteContent, type SiteContentRow } from "../../server/site-content.js";
import type { ApiRequest, ApiResponse } from "../../server/types.js";

type SiteContentBody = {
  heroTitle?: string;
  heroSubtitle?: string;
  heroPrimaryCta?: string;
  servicesEyebrow?: string;
  servicesTitle?: string;
  contactEyebrow?: string;
  contactTitle?: string;
  addressLabel?: string;
  addressText?: string;
  phoneLabel?: string;
  phoneText?: string;
  hoursLabel?: string;
  hoursText?: string;
  footerText?: string;
};

const trimValue = (value: string | undefined, fallback: string) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  await ensureSchema();

  const user = await getAuthenticatedUser(req);

  if (!user) {
    return sendJson(res, 401, { error: "Faca login para continuar." });
  }

  if (!user.isAdmin) {
    return sendJson(res, 403, { error: "Acesso restrito a administradores." });
  }

  if (req.method !== "PATCH") {
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  const body = await parseJsonBody<SiteContentBody>(req);

  const updatedRows = (await sql`
    UPDATE site_content
    SET
      hero_title = ${trimValue(body.heroTitle, "Barbearia Ramos")},
      hero_subtitle = ${trimValue(body.heroSubtitle, "Estilo na rua. Tradicao no corte.")},
      hero_primary_cta = ${trimValue(body.heroPrimaryCta, "Agendar horario")},
      services_eyebrow = ${trimValue(body.servicesEyebrow, "O que fazemos")},
      services_title = ${trimValue(body.servicesTitle, "Servicos")},
      contact_eyebrow = ${trimValue(body.contactEyebrow, "Encontre-nos")},
      contact_title = ${trimValue(body.contactTitle, "Contato")},
      address_label = ${trimValue(body.addressLabel, "Endereco")},
      address_text = ${trimValue(body.addressText, "Rua das Barbearias, 123 - Centro")},
      phone_label = ${trimValue(body.phoneLabel, "Telefone")},
      phone_text = ${trimValue(body.phoneText, "(11) 99999-9999")},
      hours_label = ${trimValue(body.hoursLabel, "Horario")},
      hours_text = ${trimValue(body.hoursText, "Seg-Sab: 9h - 20h")},
      footer_text = ${trimValue(body.footerText, "2026 Barbearia Ramos. Todos os direitos reservados.")},
      updated_at = NOW()
    WHERE id = 'main'
    RETURNING
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
  `) as SiteContentRow[];

  return sendJson(res, 200, { content: mapSiteContent(updatedRows[0]) });
}
