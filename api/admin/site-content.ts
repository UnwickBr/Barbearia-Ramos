import { ensureSchema, sql } from "../../server/db.js";
import { parseJsonBody, sendJson } from "../../server/http.js";
import { getAuthenticatedUser } from "../../server/user.js";
import { mapSiteContent, type SiteBarberDaysOff, type SiteBarberSchedules, type SiteContentRow, type SiteService } from "../../server/site-content.js";
import type { ApiRequest, ApiResponse } from "../../server/types.js";

type SiteContentBody = {
  heroTitle?: string;
  heroSubtitle?: string;
  heroPrimaryCta?: string;
  heroImageUrl?: string;
  servicesEyebrow?: string;
  servicesTitle?: string;
  services?: SiteService[];
  barbers?: string[];
  barberSchedules?: SiteBarberSchedules;
  barberDaysOff?: SiteBarberDaysOff;
  contactEyebrow?: string;
  contactTitle?: string;
  addressLabel?: string;
  addressText?: string;
  phoneLabel?: string;
  phoneText?: string;
  hoursLabel?: string;
  hoursText?: string;
  socialLinks?: {
    instagram?: string;
    facebook?: string;
    whatsapp?: string;
  };
  footerText?: string;
};

const trimValue = (value: string | undefined, fallback: string) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
};

const sanitizeServices = (value: SiteService[] | undefined) => {
  const normalized = (value ?? [])
    .map((service, index) => ({
      id: String(service.id || `service-${index + 1}`).trim(),
      name: String(service.name || "").trim(),
      price: Number(service.price),
      durationMinutes: Number(service.durationMinutes),
    }))
    .filter((service) => service.id && service.name && Number.isFinite(service.price) && service.price >= 0 && Number.isFinite(service.durationMinutes) && service.durationMinutes > 0);

  return normalized;
};

const sanitizeBarbers = (value: string[] | undefined) =>
  (value ?? []).map((barber) => barber.trim()).filter(Boolean);

const sanitizeBarberSchedules = (barbers: string[], value: SiteBarberSchedules | undefined) =>
  Object.fromEntries(
    barbers.map((barber) => {
      const slots = Array.isArray(value?.[barber])
        ? value[barber]
            .map((slot) => String(slot).trim())
            .filter((slot) => /^\d{2}:\d{2}$/.test(slot))
        : [];

      return [barber, slots];
    }),
  );

const sanitizeBarberDaysOff = (barbers: string[], value: SiteBarberDaysOff | undefined) =>
  Object.fromEntries(
    barbers.map((barber) => [barber, Boolean(value?.[barber])]),
  );

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
  const sanitizedBarbers = sanitizeBarbers(body.barbers);

  const updatedRows = (await sql`
    UPDATE site_content
    SET
      hero_title = ${trimValue(body.heroTitle, "Barbearia Ramos")},
      hero_subtitle = ${trimValue(body.heroSubtitle, "Estilo na rua. Tradicao no corte.")},
      hero_primary_cta = ${trimValue(body.heroPrimaryCta, "Agendar horario")},
      hero_image_url = ${body.heroImageUrl?.trim() || null},
      services_eyebrow = ${trimValue(body.servicesEyebrow, "O que fazemos")},
      services_title = ${trimValue(body.servicesTitle, "Servicos")},
      services_json = ${JSON.stringify(sanitizeServices(body.services))}::jsonb,
      barbers_json = ${JSON.stringify(sanitizedBarbers)}::jsonb,
      barber_hours_json = ${JSON.stringify(sanitizeBarberSchedules(sanitizedBarbers, body.barberSchedules))}::jsonb,
      barber_days_off_json = ${JSON.stringify(sanitizeBarberDaysOff(sanitizedBarbers, body.barberDaysOff))}::jsonb,
      contact_eyebrow = ${trimValue(body.contactEyebrow, "Encontre-nos")},
      contact_title = ${trimValue(body.contactTitle, "Contato")},
      address_label = ${trimValue(body.addressLabel, "Endereco")},
      address_text = ${trimValue(body.addressText, "Rua das Barbearias, 123 - Centro")},
      phone_label = ${trimValue(body.phoneLabel, "Telefone")},
      phone_text = ${trimValue(body.phoneText, "(11) 99999-9999")},
      hours_label = ${trimValue(body.hoursLabel, "Horario")},
      hours_text = ${trimValue(body.hoursText, "Seg-Sab: 9h - 20h")},
      social_links_json = ${JSON.stringify({
        instagram: body.socialLinks?.instagram?.trim() || "",
        facebook: body.socialLinks?.facebook?.trim() || "",
        whatsapp: body.socialLinks?.whatsapp?.trim() || "",
      })}::jsonb,
      footer_text = ${trimValue(body.footerText, "2026 Barbearia Ramos. Todos os direitos reservados.")},
      updated_at = NOW()
    WHERE id = 'main'
    RETURNING
      id,
      hero_title,
      hero_subtitle,
      hero_primary_cta,
      hero_image_url,
      services_eyebrow,
      services_title,
      services_json,
      barbers_json,
      barber_hours_json,
      barber_days_off_json,
      contact_eyebrow,
      contact_title,
      address_label,
      address_text,
      phone_label,
      phone_text,
      hours_label,
      hours_text,
      social_links_json,
      footer_text,
      updated_at
  `) as SiteContentRow[];

  return sendJson(res, 200, { content: mapSiteContent(updatedRows[0]) });
}
