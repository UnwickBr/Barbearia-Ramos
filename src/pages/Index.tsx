import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Clock, MapPin, Phone } from "lucide-react";
import { AuthDialog } from "@/components/AuthDialog";
import logoRamos from "@/assets/logo-ramos.png";
import heroImage from "@/assets/hero-barbershop.png";
import { useAuth } from "@/contexts/AuthContext";
import { services } from "@/lib/barbershop";

const Index = () => {
  const { user, logout, loading } = useAuth();
  const [authDialogOpen, setAuthDialogOpen] = useState(false);

  const handleOpenAuth = () => {
    setAuthDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed left-0 right-0 top-0 z-50 border-b border-border bg-background/90 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-3">
            <img src={logoRamos} alt="Barbearia Ramos" className="h-10 w-auto" />
            <span className="street-brand text-sm text-foreground sm:text-base">
              Barbearia <span className="street-brand-word text-base sm:text-lg">Ramos</span>
            </span>
          </Link>

          <div className="flex items-center gap-6">
            <a href="#servicos" className="text-xs font-body uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground">
              Serviços
            </a>
            <a href="#contato" className="text-xs font-body uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground">
              Contato
            </a>

            {loading ? (
              <span className="text-xs uppercase tracking-widest text-muted-foreground">Carregando</span>
            ) : user ? (
              <div className="flex items-center gap-3">
                <Link
                  to="/agendamentos#minhas-reservas"
                  className="text-xs font-semibold uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
                >
                  Meus agendamentos
                </Link>
                <Link
                  to="/agendamentos"
                  className="bg-foreground px-5 py-2 text-xs font-semibold uppercase tracking-widest text-background transition-colors hover:bg-foreground/80"
                >
                  Agendar
                </Link>
                <img src={user.avatarUrl} alt={user.name} className="h-8 w-8 rounded-full border border-border" />
                <button onClick={() => void logout()} className="text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground">
                  Sair
                </button>
              </div>
            ) : (
              <button
                onClick={handleOpenAuth}
                className="bg-foreground px-5 py-2 text-xs font-semibold uppercase tracking-widest text-background transition-colors hover:bg-foreground/80"
              >
                Entrar
              </button>
            )}
          </div>
        </div>
      </nav>

      <section className="relative flex h-screen items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={heroImage}
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
          className="relative max-w-4xl px-4 text-center"
        >
          <img src={logoRamos} alt="Barbearia Ramos" className="mx-auto mb-8 h-32 w-auto md:h-44" />
          <h1 className="street-brand street-brand-hero mb-4 text-4xl text-foreground md:text-7xl">
            Barbearia <span className="street-brand-word">Ramos</span>
          </h1>
          <div className="mx-auto mb-6 h-[2px] w-24 bg-foreground" />
          <p className="mb-10 font-body text-base uppercase tracking-wide text-muted-foreground md:text-lg">
            Estilo na rua. Tradição no corte.
          </p>

          {user ? (
            <Link
              to="/agendamentos"
              className="inline-block bg-foreground px-10 py-4 text-sm font-bold uppercase tracking-[0.3em] text-background transition-colors hover:bg-foreground/80"
            >
              Agendar Horário
            </Link>
          ) : (
            <button
              onClick={handleOpenAuth}
              className="inline-flex items-center gap-3 bg-foreground px-10 py-4 text-sm font-bold uppercase tracking-[0.3em] text-background transition-colors hover:bg-foreground/80"
            >
              Entrar para Agendar
            </button>
          )}
        </motion.div>
      </section>

      <section id="servicos" className="border-t border-border py-24">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="mb-16">
            <p className="mb-2 font-body text-xs uppercase tracking-[0.4em] text-muted-foreground">O que fazemos</p>
            <h2 className="font-display text-4xl font-bold tracking-wide md:text-6xl">SERVIÇOS</h2>
            <div className="mt-4 h-[2px] w-16 bg-foreground" />
          </motion.div>

          <div className="grid grid-cols-1 gap-[1px] bg-border md:grid-cols-2 lg:grid-cols-3">
            {services.map((service, index) => (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
                className="group bg-background p-8 transition-colors hover:bg-secondary"
              >
                <div className="mb-6 flex items-center justify-between">
                  <service.icon className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-foreground" />
                  <span className="font-display text-2xl font-bold">{service.price}</span>
                </div>
                <h3 className="mb-2 font-display text-lg font-semibold tracking-wide">{service.name}</h3>
                <div className="flex items-center gap-1 font-body text-xs uppercase tracking-widest text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {service.duration}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="contato" className="border-t border-border bg-card py-24">
        <div className="container mx-auto px-4">
          <p className="mb-2 font-body text-xs uppercase tracking-[0.4em] text-muted-foreground">Encontre-nos</p>
          <h2 className="mb-12 font-display text-4xl font-bold tracking-wide md:text-6xl">CONTATO</h2>
          <div className="mb-12 h-[2px] w-16 bg-foreground" />

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="flex items-start gap-4">
              <MapPin className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />
              <div>
                <p className="mb-1 font-display text-sm font-semibold tracking-wider">ENDEREÇO</p>
                <p className="font-body text-sm text-muted-foreground">Rua das Barbearias, 123 - Centro</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <Phone className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />
              <div>
                <p className="mb-1 font-display text-sm font-semibold tracking-wider">TELEFONE</p>
                <p className="font-body text-sm text-muted-foreground">(11) 99999-9999</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <Clock className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />
              <div>
                <p className="mb-1 font-display text-sm font-semibold tracking-wider">HORÁRIO</p>
                <p className="font-body text-sm text-muted-foreground">Seg-Sáb: 9h - 20h</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center font-body text-xs uppercase tracking-[0.3em] text-muted-foreground">
          © 2026 Barbearia Ramos. Todos os direitos reservados.
        </div>
      </footer>

      <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />
    </div>
  );
};

export default Index;
