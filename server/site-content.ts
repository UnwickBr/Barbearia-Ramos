import { sql } from "./db.js";
import { barbers as defaultBarbers, services as defaultServices } from "./barbershop.js";

type ServiceInput = {
  id?: unknown;
  name?: unknown;
  price?: unknown;
  durationMinutes?: unknown;
};

type SocialLinksInput = {
  instagram?: unknown;
  facebook?: unknown;
  whatsapp?: unknown;
};

export type SiteService = {
  id: string;
  name: string;
  price: number;
  durationMinutes: number;
};

export type SiteSocialLinks = {
  instagram: string;
  facebook: string;
  whatsapp: string;
};

export type SiteContentRow = {
  id: string;
  hero_title: string;
  hero_subtitle: string;
  hero_primary_cta: string;
  hero_image_url: string | null;
  services_eyebrow: string;
  services_title: string;
  services_json: unknown;
  barbers_json: unknown;
  contact_eyebrow: string;
  contact_title: string;
  address_label: string;
  address_text: string;
  phone_label: string;
  phone_text: string;
  hours_label: string;
  hours_text: string;
  social_links_json: unknown;
  footer_text: string;
  updated_at: string;
};

const defaultServiceList: SiteService[] = defaultServices.map((service) => ({
  id: service.id,
  name: service.name,
  price: service.price,
  durationMinutes: service.duration,
}));

const defaultBarberList = [...defaultBarbers];

const defaultSocialLinks: SiteSocialLinks = {
  instagram: "",
  facebook: "",
  whatsapp: "",
};

export const defaultSiteContent = {
  heroTitle: "Barbearia Ramos",
  heroSubtitle: "Estilo na rua. Tradicao no corte.",
  heroPrimaryCta: "Agendar horario",
  heroImageUrl: "",
  servicesEyebrow: "O que fazemos",
  servicesTitle: "Servicos",
  services: defaultServiceList,
  barbers: defaultBarberList,
  contactEyebrow: "Encontre-nos",
  contactTitle: "Contato",
  addressLabel: "Endereco",
  addressText: "Rua das Barbearias, 123 - Centro",
  phoneLabel: "Telefone",
  phoneText: "(11) 99999-9999",
  hoursLabel: "Horario",
  hoursText: "Seg-Sab: 9h - 20h",
  socialLinks: defaultSocialLinks,
  footerText: "2026 Barbearia Ramos. Todos os direitos reservados.",
};

const parseJsonField = <T>(value: unknown): T | null => {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  return value as T;
};

const normalizeServices = (value: unknown): SiteService[] => {
  const parsed = parseJsonField<ServiceInput[]>(value);

  if (!Array.isArray(parsed) || parsed.length === 0) {
    return defaultServiceList;
  }

  const normalized = parsed
    .map((service, index) => {
      const name = typeof service.name === "string" ? service.name.trim() : "";
      const idSource = typeof service.id === "string" ? service.id.trim() : "";
      const price = Number(service.price);
      const durationMinutes = Number(service.durationMinutes);

      if (!name || !Number.isFinite(price) || price < 0 || !Number.isFinite(durationMinutes) || durationMinutes <= 0) {
        return null;
      }

      return {
        id: idSource || `service-${index + 1}`,
        name,
        price,
        durationMinutes,
      };
    })
    .filter((service): service is SiteService => Boolean(service));

  return normalized.length > 0 ? normalized : defaultServiceList;
};

const normalizeBarbers = (value: unknown): string[] => {
  const parsed = parseJsonField<unknown[]>(value);

  if (!Array.isArray(parsed) || parsed.length === 0) {
    return defaultBarberList;
  }

  const normalized = parsed
    .map((barber) => (typeof barber === "string" ? barber.trim() : ""))
    .filter(Boolean);

  return normalized.length > 0 ? normalized : defaultBarberList;
};

const normalizeSocialLinks = (value: unknown): SiteSocialLinks => {
  const parsed = parseJsonField<SocialLinksInput>(value);

  return {
    instagram: typeof parsed?.instagram === "string" ? parsed.instagram.trim() : "",
    facebook: typeof parsed?.facebook === "string" ? parsed.facebook.trim() : "",
    whatsapp: typeof parsed?.whatsapp === "string" ? parsed.whatsapp.trim() : "",
  };
};

export const mapSiteContent = (row?: SiteContentRow | null) => ({
  heroTitle: row?.hero_title ?? defaultSiteContent.heroTitle,
  heroSubtitle: row?.hero_subtitle ?? defaultSiteContent.heroSubtitle,
  heroPrimaryCta: row?.hero_primary_cta ?? defaultSiteContent.heroPrimaryCta,
  heroImageUrl: row?.hero_image_url ?? defaultSiteContent.heroImageUrl,
  servicesEyebrow: row?.services_eyebrow ?? defaultSiteContent.servicesEyebrow,
  servicesTitle: row?.services_title ?? defaultSiteContent.servicesTitle,
  services: normalizeServices(row?.services_json),
  barbers: normalizeBarbers(row?.barbers_json),
  contactEyebrow: row?.contact_eyebrow ?? defaultSiteContent.contactEyebrow,
  contactTitle: row?.contact_title ?? defaultSiteContent.contactTitle,
  addressLabel: row?.address_label ?? defaultSiteContent.addressLabel,
  addressText: row?.address_text ?? defaultSiteContent.addressText,
  phoneLabel: row?.phone_label ?? defaultSiteContent.phoneLabel,
  phoneText: row?.phone_text ?? defaultSiteContent.phoneText,
  hoursLabel: row?.hours_label ?? defaultSiteContent.hoursLabel,
  hoursText: row?.hours_text ?? defaultSiteContent.hoursText,
  socialLinks: normalizeSocialLinks(row?.social_links_json),
  footerText: row?.footer_text ?? defaultSiteContent.footerText,
});

export const getSiteContentRow = async () => {
  const rows = (await sql`
    SELECT
      id,
      hero_title,
      hero_subtitle,
      hero_primary_cta,
      hero_image_url,
      services_eyebrow,
      services_title,
      services_json,
      barbers_json,
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
    FROM site_content
    WHERE id = 'main'
    LIMIT 1
  `) as SiteContentRow[];

  return rows[0] ?? null;
};
