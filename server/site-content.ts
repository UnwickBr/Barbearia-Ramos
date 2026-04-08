export type SiteContentRow = {
  id: string;
  hero_title: string;
  hero_subtitle: string;
  hero_primary_cta: string;
  services_eyebrow: string;
  services_title: string;
  contact_eyebrow: string;
  contact_title: string;
  address_label: string;
  address_text: string;
  phone_label: string;
  phone_text: string;
  hours_label: string;
  hours_text: string;
  footer_text: string;
  updated_at: string;
};

export const defaultSiteContent = {
  heroTitle: "Barbearia Ramos",
  heroSubtitle: "Estilo na rua. Tradicao no corte.",
  heroPrimaryCta: "Agendar horario",
  servicesEyebrow: "O que fazemos",
  servicesTitle: "Servicos",
  contactEyebrow: "Encontre-nos",
  contactTitle: "Contato",
  addressLabel: "Endereco",
  addressText: "Rua das Barbearias, 123 - Centro",
  phoneLabel: "Telefone",
  phoneText: "(11) 99999-9999",
  hoursLabel: "Horario",
  hoursText: "Seg-Sab: 9h - 20h",
  footerText: "2026 Barbearia Ramos. Todos os direitos reservados.",
};

export const mapSiteContent = (row?: SiteContentRow | null) => ({
  heroTitle: row?.hero_title ?? defaultSiteContent.heroTitle,
  heroSubtitle: row?.hero_subtitle ?? defaultSiteContent.heroSubtitle,
  heroPrimaryCta: row?.hero_primary_cta ?? defaultSiteContent.heroPrimaryCta,
  servicesEyebrow: row?.services_eyebrow ?? defaultSiteContent.servicesEyebrow,
  servicesTitle: row?.services_title ?? defaultSiteContent.servicesTitle,
  contactEyebrow: row?.contact_eyebrow ?? defaultSiteContent.contactEyebrow,
  contactTitle: row?.contact_title ?? defaultSiteContent.contactTitle,
  addressLabel: row?.address_label ?? defaultSiteContent.addressLabel,
  addressText: row?.address_text ?? defaultSiteContent.addressText,
  phoneLabel: row?.phone_label ?? defaultSiteContent.phoneLabel,
  phoneText: row?.phone_text ?? defaultSiteContent.phoneText,
  hoursLabel: row?.hours_label ?? defaultSiteContent.hoursLabel,
  hoursText: row?.hours_text ?? defaultSiteContent.hoursText,
  footerText: row?.footer_text ?? defaultSiteContent.footerText,
});
