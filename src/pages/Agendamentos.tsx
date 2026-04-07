import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { Calendar, Clock, Scissors, ArrowLeft, Check } from "lucide-react";

const services = [
  { id: "corte", name: "Corte Clássico", price: "R$ 45", duration: "30 min" },
  { id: "barba", name: "Barba Completa", price: "R$ 35", duration: "25 min" },
  { id: "combo", name: "Corte + Barba", price: "R$ 70", duration: "50 min" },
  { id: "pigmentacao", name: "Pigmentação", price: "R$ 60", duration: "40 min" },
  { id: "sobrancelha", name: "Sobrancelha", price: "R$ 20", duration: "15 min" },
  { id: "hidratacao", name: "Hidratação Capilar", price: "R$ 50", duration: "30 min" },
];

const barbers = ["Carlos", "Rafael", "André", "Lucas"];

const timeSlots = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30"];

const Agendamentos = () => {
  const { user, logout } = useAuth();
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedBarber, setSelectedBarber] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  if (!user) return <Navigate to="/" replace />;

  const canConfirm = selectedService && selectedBarber && selectedDate && selectedTime;

  const handleConfirm = () => {
    if (canConfirm) setConfirmed(true);
  };

  if (confirmed) {
    const service = services.find((s) => s.id === selectedService);
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-card border border-border rounded-lg p-8 max-w-md w-full text-center"
        >
          <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-primary" />
          </div>
          <h2 className="font-display text-3xl font-bold mb-2">Agendado!</h2>
          <p className="text-muted-foreground mb-6">Seu horário foi reservado com sucesso.</p>
          <div className="space-y-3 text-left bg-secondary/50 rounded-md p-4 mb-6">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Serviço</span>
              <span className="font-semibold">{service?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Barbeiro</span>
              <span className="font-semibold">{selectedBarber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Data</span>
              <span className="font-semibold">{new Date(selectedDate + "T12:00:00").toLocaleDateString("pt-BR")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Horário</span>
              <span className="font-semibold">{selectedTime}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Valor</span>
              <span className="font-semibold text-primary">{service?.price}</span>
            </div>
          </div>
          <Link
            to="/"
            className="inline-block bg-primary text-primary-foreground font-semibold px-6 py-3 rounded-md hover:bg-primary/90 transition-colors"
          >
            Voltar ao Início
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-20 pb-12">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link to="/" className="font-display text-2xl text-primary font-bold tracking-wide">
            BARBEARIA <span className="text-foreground">RAMOS</span>
          </Link>
          <div className="flex items-center gap-3">
            <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full" />
            <span className="text-sm font-medium">{user.name}</span>
            <button onClick={logout} className="text-sm text-muted-foreground hover:text-foreground transition-colors ml-2">
              Sair
            </button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>

        <h1 className="font-display text-4xl font-bold mb-2">
          Agendar <span className="text-primary">Horário</span>
        </h1>
        <p className="text-muted-foreground mb-10">Escolha o serviço, barbeiro, data e horário.</p>

        <div className="mb-10">
          <h3 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
            <Scissors className="w-5 h-5 text-primary" /> Serviço
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedService(s.id)}
                className={`text-left p-4 rounded-lg border transition-all ${
                  selectedService === s.id
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className="font-semibold">{s.name}</span>
                  <span className="text-primary font-display font-bold">{s.price}</span>
                </div>
                <span className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <Clock className="w-3 h-3" /> {s.duration}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="mb-10">
          <h3 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
            <Scissors className="w-5 h-5 text-primary" /> Barbeiro
          </h3>
          <div className="flex flex-wrap gap-3">
            {barbers.map((b) => (
              <button
                key={b}
                onClick={() => setSelectedBarber(b)}
                className={`px-6 py-3 rounded-lg border font-medium transition-all ${
                  selectedBarber === b
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40"
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-10">
          <h3 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" /> Data
          </h3>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            min={new Date().toISOString().split("T")[0]}
            className="bg-card border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        <div className="mb-12">
          <h3 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" /> Horário
          </h3>
          <div className="flex flex-wrap gap-2">
            {timeSlots.map((t) => (
              <button
                key={t}
                onClick={() => setSelectedTime(t)}
                className={`px-4 py-2 rounded-md border text-sm font-medium transition-all ${
                  selectedTime === t
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleConfirm}
          disabled={!canConfirm}
          className={`px-8 py-4 rounded-md text-lg font-semibold transition-all ${
            canConfirm
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          }`}
        >
          Confirmar Agendamento
        </button>
      </div>
    </div>
  );
};

export default Agendamentos;
