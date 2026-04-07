import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, Check, Clock, LoaderCircle, Scissors } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { reservationsApi } from "@/lib/api";
import { barbers, services, timeSlots } from "@/lib/barbershop";
import type { Reservation } from "@/lib/types";
import { toast } from "@/hooks/use-toast";

const Agendamentos = () => {
  const { user, logout, loading } = useAuth();
  const queryClient = useQueryClient();
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedBarber, setSelectedBarber] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [confirmedReservation, setConfirmedReservation] = useState<Reservation | null>(null);

  const canConfirm = Boolean(selectedService && selectedBarber && selectedDate && selectedTime);

  const reservationsQuery = useQuery({
    queryKey: ["reservations", user?.id],
    queryFn: async () => {
      const response = await reservationsApi.list();
      return response.reservations;
    },
    enabled: Boolean(user),
  });

  const createReservation = useMutation({
    mutationFn: reservationsApi.create,
    onSuccess: (data) => {
      setConfirmedReservation(data.reservation);
      void queryClient.invalidateQueries({ queryKey: ["reservations", user?.id] });
      toast({
        title: "Reserva confirmada",
        description: "Seu horário foi salvo no sistema.",
      });
    },
  });

  const selectedServiceData = useMemo(
    () => services.find((service) => service.id === selectedService) ?? null,
    [selectedService],
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  const handleConfirm = async () => {
    if (!canConfirm || !selectedService || !selectedBarber || !selectedDate || !selectedTime) {
      return;
    }

    await createReservation.mutateAsync({
      serviceId: selectedService,
      barberName: selectedBarber,
      reservationDate: selectedDate,
      reservationTime: selectedTime,
    });
  };

  return (
    <div className="min-h-screen bg-background pb-12 pt-20">
      <nav className="fixed left-0 right-0 top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="font-display text-2xl font-bold tracking-wide text-primary">
            BARBEARIA <span className="text-foreground">RAMOS</span>
          </Link>
          <div className="flex items-center gap-3">
            <img src={user.avatarUrl} alt={user.name} className="h-8 w-8 rounded-full" />
            <span className="text-sm font-medium">{user.name}</span>
            <button onClick={() => void logout()} className="ml-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
              Sair
            </button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4">
        <Link to="/" className="mb-8 inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>

        <h1 className="mb-2 font-display text-4xl font-bold">
          Agendar <span className="text-primary">Horário</span>
        </h1>
        <p className="mb-10 text-muted-foreground">Escolha o serviço, barbeiro, data e horário.</p>

        {confirmedReservation ? (
          <motion.div
            initial={{ scale: 0.98, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mb-10 rounded-lg border border-primary/30 bg-card p-6"
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15">
                <Check className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="font-display text-2xl font-bold">Reserva confirmada</h2>
                <p className="text-sm text-muted-foreground">Seus dados já foram salvos no banco.</p>
              </div>
            </div>

            <div className="grid gap-3 rounded-md bg-secondary/50 p-4 md:grid-cols-2">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Serviço</span>
                <span className="font-semibold">{confirmedReservation.serviceName}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Barbeiro</span>
                <span className="font-semibold">{confirmedReservation.barberName}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Data</span>
                <span className="font-semibold">
                  {new Date(`${confirmedReservation.reservationDate}T12:00:00`).toLocaleDateString("pt-BR")}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Horário</span>
                <span className="font-semibold">{confirmedReservation.reservationTime}</span>
              </div>
            </div>
          </motion.div>
        ) : null}

        <div className="mb-10">
          <h3 className="mb-4 flex items-center gap-2 font-display text-xl font-semibold">
            <Scissors className="h-5 w-5 text-primary" /> Serviço
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <button
                key={service.id}
                onClick={() => setSelectedService(service.id)}
                className={`rounded-lg border p-4 text-left transition-all ${
                  selectedService === service.id
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <div className="flex items-start justify-between">
                  <span className="font-semibold">{service.name}</span>
                  <span className="font-display font-bold text-primary">{service.price}</span>
                </div>
                <span className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="h-3 w-3" /> {service.duration}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="mb-10">
          <h3 className="mb-4 flex items-center gap-2 font-display text-xl font-semibold">
            <Scissors className="h-5 w-5 text-primary" /> Barbeiro
          </h3>
          <div className="flex flex-wrap gap-3">
            {barbers.map((barber) => (
              <button
                key={barber}
                onClick={() => setSelectedBarber(barber)}
                className={`rounded-lg border px-6 py-3 font-medium transition-all ${
                  selectedBarber === barber
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40"
                }`}
              >
                {barber}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-10">
          <h3 className="mb-4 flex items-center gap-2 font-display text-xl font-semibold">
            <Calendar className="h-5 w-5 text-primary" /> Data
          </h3>
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            min={new Date().toISOString().split("T")[0]}
            className="rounded-lg border border-border bg-card px-4 py-3 text-foreground transition-colors focus:border-primary focus:outline-none"
          />
        </div>

        <div className="mb-12">
          <h3 className="mb-4 flex items-center gap-2 font-display text-xl font-semibold">
            <Clock className="h-5 w-5 text-primary" /> Horário
          </h3>
          <div className="flex flex-wrap gap-2">
            {timeSlots.map((time) => (
              <button
                key={time}
                onClick={() => setSelectedTime(time)}
                className={`rounded-md border px-4 py-2 text-sm font-medium transition-all ${
                  selectedTime === time
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40"
                }`}
              >
                {time}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => void handleConfirm()}
          disabled={!canConfirm || createReservation.isPending}
          className={`rounded-md px-8 py-4 text-lg font-semibold transition-all ${
            canConfirm && !createReservation.isPending
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "cursor-not-allowed bg-muted text-muted-foreground"
          }`}
        >
          {createReservation.isPending ? "Salvando..." : "Confirmar Agendamento"}
        </button>

        {createReservation.isError ? (
          <p className="mt-4 text-sm text-destructive">{createReservation.error.message}</p>
        ) : null}

        <section className="mt-16 border-t border-border pt-10">
          <div className="mb-6">
            <h2 className="font-display text-3xl font-bold">Minhas reservas</h2>
              <p className="text-muted-foreground">Agendamentos vinculados ao seu login.</p>
          </div>

          {reservationsQuery.isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Carregando reservas...
            </div>
          ) : reservationsQuery.data && reservationsQuery.data.length > 0 ? (
            <div className="grid gap-4">
              {reservationsQuery.data.map((reservation) => (
                <div key={reservation.id} className="rounded-lg border border-border bg-card p-5">
                  <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <h3 className="font-display text-xl font-semibold">{reservation.serviceName}</h3>
                    <span className="w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
                      {reservation.status}
                    </span>
                  </div>
                  <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                    <span>Barbeiro: {reservation.barberName}</span>
                    <span>Horario: {reservation.reservationTime}</span>
                    <span>Data: {new Date(`${reservation.reservationDate}T12:00:00`).toLocaleDateString("pt-BR")}</span>
                    <span>Valor: R$ {reservation.servicePrice.toFixed(2).replace(".", ",")}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-card/40 p-6 text-muted-foreground">
              Você ainda não tem reservas salvas.
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Agendamentos;
