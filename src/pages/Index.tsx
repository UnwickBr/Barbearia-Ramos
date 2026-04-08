import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Clock, Facebook, Instagram, MapPin, Phone, Scissors } from "lucide-react";
import { AuthDialog } from "@/components/AuthDialog";
import logoRamos from "@/assets/logo-ramos.png";
import heroImage from "@/assets/hero-barbershop.png";
import { useAuth } from "@/contexts/AuthContext";
import { siteContentApi } from "@/lib/api";
import type { SiteContent } from "@/lib/types";

const defaultContent: SiteContent = {
  heroTitle: "Barbearia Ramos",
  heroSubtitle: "Estilo na rua. Tradicao no corte.",
  heroPrimaryCta: "Agendar horario",
  heroImageUrl: "",
  servicesEyebrow: "O que fazemos",
  servicesTitle: "Servicos",
  services: [
    { id: "corte", name: "Corte Classico", price: 45, durationMinutes: 30 },
    { id: "barba", name: "Barba Completa", price: 35, durationMinutes: 25 },
    { id: "combo", name: "Corte + Barba", price: 70, durationMinutes: 50 },
  ],
  barbers: ["Carlos", "Rafael", "Andre", "Lucas"],
  contactEyebrow: "Encontre-nos",
  contactTitle: "Contato",
  addressLabel: "Endereco",
  addressText: "Rua das Barbearias, 123 - Centro",
  phoneLabel: "Telefone",
  phoneText: "(11) 99999-9999",
  hoursLabel: "Horario",
  hoursText: "Seg-Sab: 9h - 20h",
  socialLinks: {
    instagram: "",
    facebook: "",
    whatsapp: "",
  },
  footerText: "2026 Barbearia Ramos. Todos os direitos reservados.",
};

const Index = () => {
  const { user, logout, loading } = useAuth();
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const siteContentQuery = useQuery({
    queryKey: ["site-content"],
    queryFn: async () => (await siteContentApi.get()).content,
  });
  const content = siteContentQuery.data ?? defaultContent;

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <nav className="fixed left-0 right-0 top-0 z-50 border-b border-border bg-background/90 backdrop-blur-sm">
        <div className="container mx-auto flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <Link to="/" className="flex min-w-0 items-center gap-3 self-start">
            <img src={logoRamos} alt="Barbearia Ramos" className="h-9 w-auto shrink-0 sm:h-10" />
            <span className="font-display text-base font-bold tracking-[0.2em] text-foreground sm:text-xl sm:tracking-widest">
              BARBEARIA RAMOS
            </span>
          </Link>

          <div className="flex w-full flex-wrap items-center justify-start gap-3 sm:w-auto sm:justify-end sm:gap-6">
            <a href="#servicos" className="text-xs font-body uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground">
              Servicos
            </a>
            <a href="#contato" className="text-xs font-body uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground">
              Contato
            </a>

            {loading ? (
              <span className="text-xs uppercase tracking-widest text-muted-foreground">Carregando</span>
            ) : user ? (
              <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto sm:justify-end">
                <Link
                  to="/agendamentos#minhas-reservas"
                  className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground sm:text-xs sm:tracking-widest"
                >
                  Meus agendamentos
                </Link>
                {user.isAdmin ? (
                  <Link
                    to="/admin/agendamentos"
                    className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground sm:text-xs sm:tracking-widest"
                  >
                    Painel admin
                  </Link>
                ) : user.role === "collaborator" ? (
                  <Link
                    to="/colaborador/agendamentos"
                    className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground sm:text-xs sm:tracking-widest"
                  >
                    Minha agenda
                  </Link>
                ) : null}
                <Link
                  to="/agendamentos"
                  className="bg-foreground px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-background transition-colors hover:bg-foreground/80 sm:px-5 sm:text-xs sm:tracking-widest"
                >
                  Agendar
                </Link>
                <Link
                  to="/perfil"
                  className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground sm:text-xs sm:tracking-widest"
                >
                  Perfil
                </Link>
                <img src={user.avatarUrl} alt={user.name} className="h-8 w-8 rounded-full border border-border" />
                <button
                  onClick={() => void logout()}
                  className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground sm:text-xs sm:tracking-widest"
                >
                  Sair
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAuthDialogOpen(true)}
                className="bg-foreground px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-background transition-colors hover:bg-foreground/80 sm:px-5 sm:text-xs sm:tracking-widest"
              >
                Entrar
              </button>
            )}
          </div>
        </div>
      </nav>

      <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 pb-16 pt-36 sm:px-0 sm:pb-0 sm:pt-24">
        <div className="absolute inset-0">
          <img
            src={content.heroImageUrl || heroImage}
            alt="Interior da Barbearia Ramos"
            className="h-full w-full object-cover grayscale brightness-[0.35] contrast-125"
            width={1920}
            height={1080}
          />
          <div className="absolute inset-0 bg-background/70" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative max-w-4xl px-2 text-center sm:px-4"
        >
          <img src={logoRamos} alt="Barbearia Ramos" className="mx-auto mb-6 h-24 w-auto sm:mb-8 sm:h-32 md:h-44" />
          <h1 className="street-brand street-brand-hero mb-4 text-3xl leading-none text-foreground sm:text-4xl md:text-7xl">
            {content.heroTitle}
          </h1>
          <div className="mx-auto mb-5 h-[2px] w-20 bg-foreground sm:mb-6 sm:w-24" />
          <p className="mb-8 px-2 font-body text-sm uppercase tracking-[0.18em] text-muted-foreground sm:mb-10 sm:text-base sm:tracking-wide md:text-lg">
            {content.heroSubtitle}
          </p>

          {user ? (
            <Link
              to="/agendamentos"
              className="inline-flex w-full max-w-xs items-center justify-center bg-foreground px-6 py-4 text-xs font-bold uppercase tracking-[0.28em] text-background transition-colors hover:bg-foreground/80 sm:w-auto sm:max-w-none sm:px-10 sm:text-sm sm:tracking-[0.3em]"
            >
              {content.heroPrimaryCta}
            </Link>
          ) : (
            <button
              onClick={() => setAuthDialogOpen(true)}
              className="inline-flex w-full max-w-xs items-center justify-center gap-3 bg-foreground px-6 py-4 text-xs font-bold uppercase tracking-[0.28em] text-background transition-colors hover:bg-foreground/80 sm:w-auto sm:max-w-none sm:px-10 sm:text-sm sm:tracking-[0.3em]"
            >
              Entrar para agendar
            </button>
          )}
        </motion.div>
      </section>

      <section id="servicos" className="border-t border-border py-16 sm:py-24">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="mb-12 sm:mb-16">
            <p className="mb-2 font-body text-xs uppercase tracking-[0.4em] text-muted-foreground">{content.servicesEyebrow}</p>
            <h2 className="font-display text-3xl font-bold tracking-wide sm:text-4xl md:text-6xl">{content.servicesTitle}</h2>
            <div className="mt-4 h-[2px] w-16 bg-foreground" />
          </motion.div>

          <div className="grid grid-cols-1 gap-[1px] bg-border md:grid-cols-2 lg:grid-cols-3">
            {content.services.map((service, index) => (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
                className="group bg-background p-6 sm:p-8"
              >
                <div className="mb-6 flex items-center justify-between">
                  <Scissors className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-foreground" />
                  <span className="font-display text-2xl font-bold">R$ {service.price.toFixed(2).replace(".", ",")}</span>
                </div>
                <h3 className="mb-2 font-display text-lg font-semibold tracking-wide">{service.name}</h3>
                <div className="flex items-center gap-1 font-body text-xs uppercase tracking-widest text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {service.durationMinutes} min
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="contato" className="border-t border-border bg-card py-16 sm:py-24">
        <div className="container mx-auto px-4">
          <p className="mb-2 font-body text-xs uppercase tracking-[0.4em] text-muted-foreground">{content.contactEyebrow}</p>
          <h2 className="mb-10 font-display text-3xl font-bold tracking-wide sm:text-4xl md:text-6xl">{content.contactTitle}</h2>
          <div className="mb-12 h-[2px] w-16 bg-foreground" />

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="flex items-start gap-4">
              <MapPin className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />
              <div>
                <p className="mb-1 font-display text-sm font-semibold tracking-wider">{content.addressLabel}</p>
                <p className="font-body text-sm text-muted-foreground">{content.addressText}</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <Phone className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />
              <div>
                <p className="mb-1 font-display text-sm font-semibold tracking-wider">{content.phoneLabel}</p>
                <p className="font-body text-sm text-muted-foreground">{content.phoneText}</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <Clock className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />
              <div>
                <p className="mb-1 font-display text-sm font-semibold tracking-wider">{content.hoursLabel}</p>
                <p className="font-body text-sm text-muted-foreground">{content.hoursText}</p>
              </div>
            </div>
          </div>

          {content.socialLinks.instagram || content.socialLinks.facebook || content.socialLinks.whatsapp ? (
            <div className="mt-10 flex flex-wrap gap-3">
              {content.socialLinks.instagram ? (
                <a href={content.socialLinks.instagram} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-3 text-sm text-muted-foreground transition-colors hover:text-foreground">
                  <Instagram className="h-4 w-4" /> Instagram
                </a>
              ) : null}
              {content.socialLinks.facebook ? (
                <a href={content.socialLinks.facebook} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-3 text-sm text-muted-foreground transition-colors hover:text-foreground">
                  <Facebook className="h-4 w-4" /> Facebook
                </a>
              ) : null}
              {content.socialLinks.whatsapp ? (
                <a href={content.socialLinks.whatsapp} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-3 text-sm text-muted-foreground transition-colors hover:text-foreground">
                  <Phone className="h-4 w-4" /> WhatsApp
                </a>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center font-body text-[10px] uppercase tracking-[0.24em] text-muted-foreground sm:text-xs sm:tracking-[0.3em]">
          {content.footerText}
        </div>
      </footer>

      <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />
    </div>
  );
};

export default Index;
