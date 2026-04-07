import { Scissors, Clock, MapPin, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import heroImage from "@/assets/hero-barbershop.jpg";
import logoRamos from "@/assets/logo-ramos.png";

const services = [
  { name: "Corte Clássico", price: "R$ 45", duration: "30 min", icon: Scissors },
  { name: "Barba Completa", price: "R$ 35", duration: "25 min", icon: Scissors },
  { name: "Corte + Barba", price: "R$ 70", duration: "50 min", icon: Scissors },
  { name: "Pigmentação", price: "R$ 60", duration: "40 min", icon: Scissors },
  { name: "Sobrancelha", price: "R$ 20", duration: "15 min", icon: Scissors },
  { name: "Hidratação Capilar", price: "R$ 50", duration: "30 min", icon: Scissors },
];

const Index = () => {
  const { user, login, logout } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link to="/" className="flex items-center gap-3">
            <img src={logoRamos} alt="Barbearia Ramos" className="h-10 w-auto invert" />
            <span className="font-display text-xl text-foreground font-bold tracking-widest">BARBEARIA RAMOS</span>
          </Link>
          <div className="flex items-center gap-6">
            <a href="#servicos" className="text-xs font-body uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">Serviços</a>
            <a href="#contato" className="text-xs font-body uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">Contato</a>
            {user ? (
              <div className="flex items-center gap-3">
                <Link
                  to="/agendamentos"
                  className="text-xs font-body uppercase tracking-widest font-semibold bg-foreground text-background px-5 py-2 hover:bg-foreground/80 transition-colors"
                >
                  Agendar
                </Link>
                <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full border border-border" />
                <button onClick={logout} className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">
                  Sair
                </button>
              </div>
            ) : (
              <button
                onClick={login}
                className="flex items-center gap-2 text-xs font-body uppercase tracking-widest font-semibold bg-foreground text-background px-5 py-2 hover:bg-foreground/80 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Entrar
              </button>
            )}
          </div>
        </div>
      </nav>

      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroImage} alt="Barbearia" className="w-full h-full object-cover grayscale" width={1920} height={1080} />
          <div className="absolute inset-0 bg-background/80" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative text-center max-w-4xl px-4"
        >
          <img src={logoRamos} alt="Barbearia Ramos" className="h-32 md:h-44 w-auto mx-auto mb-8 invert" />
          <h1 className="font-display text-5xl md:text-8xl font-bold mb-4 tracking-wider">
            BARBEARIA RAMOS
          </h1>
          <div className="w-24 h-[2px] bg-foreground mx-auto mb-6" />
          <p className="text-base md:text-lg text-muted-foreground mb-10 font-body tracking-wide uppercase">
            Estilo na rua. Tradição no corte.
          </p>
          {user ? (
            <Link
              to="/agendamentos"
              className="inline-block bg-foreground text-background font-display font-bold px-10 py-4 text-sm uppercase tracking-[0.3em] hover:bg-foreground/80 transition-colors"
            >
              Agendar Horário
            </Link>
          ) : (
            <button
              onClick={login}
              className="inline-flex items-center gap-3 bg-foreground text-background font-display font-bold px-10 py-4 text-sm uppercase tracking-[0.3em] hover:bg-foreground/80 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Entre para Agendar
            </button>
          )}
        </motion.div>
      </section>

      <section id="servicos" className="py-24 border-t border-border">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground mb-2 font-body">O que fazemos</p>
            <h2 className="font-display text-4xl md:text-6xl font-bold tracking-wide">
              SERVIÇOS
            </h2>
            <div className="w-16 h-[2px] bg-foreground mt-4" />
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[1px] bg-border">
            {services.map((service, i) => (
              <motion.div
                key={service.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="bg-background p-8 hover:bg-secondary transition-colors group"
              >
                <div className="flex items-center justify-between mb-6">
                  <service.icon className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  <span className="font-display text-2xl font-bold">{service.price}</span>
                </div>
                <h3 className="font-display text-lg font-semibold tracking-wide mb-2">{service.name}</h3>
                <div className="flex items-center gap-1 text-muted-foreground text-xs uppercase tracking-widest font-body">
                  <Clock className="w-3 h-3" />
                  {service.duration}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="contato" className="py-24 border-t border-border bg-card">
        <div className="container mx-auto px-4">
          <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground mb-2 font-body">Encontre-nos</p>
          <h2 className="font-display text-4xl md:text-6xl font-bold tracking-wide mb-12">
            CONTATO
          </h2>
          <div className="w-16 h-[2px] bg-foreground mb-12" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex items-start gap-4">
              <MapPin className="w-5 h-5 text-muted-foreground mt-1 shrink-0" />
              <div>
                <p className="font-display text-sm font-semibold tracking-wider mb-1">ENDEREÇO</p>
                <p className="text-muted-foreground text-sm font-body">Rua das Barbearias, 123 - Centro</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <Phone className="w-5 h-5 text-muted-foreground mt-1 shrink-0" />
              <div>
                <p className="font-display text-sm font-semibold tracking-wider mb-1">TELEFONE</p>
                <p className="text-muted-foreground text-sm font-body">(11) 99999-9999</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <Clock className="w-5 h-5 text-muted-foreground mt-1 shrink-0" />
              <div>
                <p className="font-display text-sm font-semibold tracking-wider mb-1">HORÁRIO</p>
                <p className="text-muted-foreground text-sm font-body">Seg-Sáb: 9h - 20h</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="py-8 border-t border-border">
        <div className="container mx-auto px-4 text-center text-xs text-muted-foreground uppercase tracking-[0.3em] font-body">
          © 2026 Barbearia Ramos. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
};

export default Index;
