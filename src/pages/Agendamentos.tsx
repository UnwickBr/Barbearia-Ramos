import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, CalendarCheck2, Check, Clock, LoaderCircle, Scissors, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { barbers, services, timeSlots } from "@/lib/barbershop";
import { formatReservationDate } from "@/lib/dates";
import {
  buildReservationCancellationEmail,
  buildReservationConfirmationEmail,
  createGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  sendGmailMessage,
} from "@/lib/google";
import { reservationsApi } from "@/lib/api";
import type { Reservation } from "@/lib/types";

const Agendamentos = () => {
  const { user, logout, loading, googleAccessToken } = useAuth();
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

  const availabilityQuery = useQuery({
    queryKey: ["availability", selectedBarber, selectedDate],
    queryFn: async () => {
      if (!selectedBarber || !selectedDate) {
        return [] as string[];
      }

      const response = await reservationsApi.availability(selectedBarber, selectedDate);
      return response.unavailableTimes;
    },
    enabled: Boolean(selectedBarber && selectedDate),
  });

  const createReservation = useMutation({
    mutationFn: reservationsApi.create,
  });

  const cancelReservation = useMutation({
    mutationFn: reservationsApi.cancel,
    onSuccess: (data) => {
      setConfirmedReservation((current) => (current?.id === data.reservation.id ? data.reservation : current));
      void queryClient.invalidateQueries({ queryKey: ["reservations", user?.id] });
    },
  });

  const selectedServiceData = useMemo(
    () => services.find((service) => service.id === selectedService) ?? null,
    [selectedService],
  );

  const unavailableTimes = useMemo(() => availabilityQuery.data ?? [], [availabilityQuery.data]);

  useEffect(() => {
    if (selectedTime && unavailableTimes.includes(selectedTime)) {
      setSelectedTime(null);
    }
  }, [selectedTime, unavailableTimes]);

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

  const syncReservationWithGoogle = async (reservation: Reservation) => {
    if (!googleAccessToken) {
      toast({
        title: "Reserva salva",
        description: "O horario foi salvo, mas o token do Google nao estava ativo para sincronizar calendario e e-mail.",
      });
      return reservation;
    }

    let updatedReservation = reservation;

    try {
      const calendarEvent = await createGoogleCalendarEvent({
        accessToken: googleAccessToken,
        serviceName: reservation.serviceName,
        barberName: reservation.barberName,
        reservationDate: reservation.reservationDate,
        reservationTime: reservation.reservationTime,
        serviceDurationMinutes: reservation.serviceDurationMinutes,
        userEmail: user.email,
      });

      const response = await reservationsApi.attachCalendarEvent(reservation.id, {
        googleCalendarEventId: calendarEvent.eventId,
        googleCalendarEventLink: calendarEvent.eventLink,
      });

      updatedReservation = response.reservation;
    } catch (error) {
      toast({
        title: "Reserva salva sem Google Calendar",
        description: error instanceof Error ? error.message : "Nao foi possivel criar o evento no Google Calendar.",
        variant: "destructive",
      });
      return updatedReservation;
    }

    try {
      const email = buildReservationConfirmationEmail(
        updatedReservation.serviceName,
        updatedReservation.barberName,
        updatedReservation.reservationDate,
        updatedReservation.reservationTime,
      );

      await sendGmailMessage({
        accessToken: googleAccessToken,
        to: user.email,
        subject: email.subject,
        text: email.text,
      });
    } catch (error) {
      toast({
        title: "Evento criado, mas sem e-mail",
        description: error instanceof Error ? error.message : "Nao foi possivel enviar o e-mail de confirmacao.",
        variant: "destructive",
      });
    }

    return updatedReservation;
  };

  const handleConfirm = async () => {
    if (!canConfirm || !selectedService || !selectedBarber || !selectedDate || !selectedTime) {
      return;
    }

    if (unavailableTimes.includes(selectedTime)) {
      toast({
        title: "Horario indisponivel",
        description: "Esse horario acabou de ser ocupado. Escolha outro horario.",
        variant: "destructive",
      });
      setSelectedTime(null);
      return;
    }

    const data = await createReservation.mutateAsync({
      serviceId: selectedService,
      barberName: selectedBarber,
      reservationDate: selectedDate,
      reservationTime: selectedTime,
    });

    const syncedReservation = await syncReservationWithGoogle(data.reservation);
    setConfirmedReservation(syncedReservation);
    setSelectedService(null);
    setSelectedBarber(null);
    setSelectedDate("");
    setSelectedTime(null);
    void queryClient.invalidateQueries({ queryKey: ["reservations", user?.id] });

    toast({
      title: "Reserva confirmada",
      description: syncedReservation.googleCalendarEventId
        ? "Seu horario foi salvo e sincronizado com o Google."
        : "Seu horario foi salvo no sistema.",
    });
  };

  const handleCancelReservation = async (reservation: Reservation) => {
    const confirmed = window.confirm("Deseja cancelar este agendamento?");

    if (!confirmed) {
      return;
    }

    if (reservation.googleCalendarEventId && googleAccessToken) {
      try {
        await deleteGoogleCalendarEvent(googleAccessToken, reservation.googleCalendarEventId);
      } catch (error) {
        toast({
          title: "Reserva cancelada no site",
          description: error instanceof Error ? error.message : "Nao foi possivel remover o evento do Google Calendar.",
          variant: "destructive",
        });
      }
    }

    const response = await cancelReservation.mutateAsync(reservation.id);

    if (googleAccessToken) {
      try {
        const email = buildReservationCancellationEmail(
          response.reservation.serviceName,
          response.reservation.barberName,
          response.reservation.reservationDate,
          response.reservation.reservationTime,
        );

        await sendGmailMessage({
          accessToken: googleAccessToken,
          to: user.email,
          subject: email.subject,
          text: email.text,
        });
      } catch (error) {
        toast({
          title: "Cancelado sem e-mail",
          description: error instanceof Error ? error.message : "Nao foi possivel enviar o e-mail de cancelamento.",
          variant: "destructive",
        });
      }
    }

    toast({
      title: "Agendamento cancelado",
      description: "O horario foi liberado novamente.",
    });
  };

  return (
    <div className="min-h-screen bg-background pb-12 pt-20">
      <nav className="fixed left-0 right-0 top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="street-brand text-sm text-primary sm:text-lg">
            Barbearia <span className="street-brand-word text-base text-foreground sm:text-xl">Ramos</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/agendamentos#minhas-reservas" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Meus agendamentos
            </Link>
            <img src={user.avatarUrl} alt={user.name} className="h-8 w-8 rounded-full" />
            <span className="text-sm font-medium">{user.name}</span>
            <button onClick={() => void logout()} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
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
          Agendar <span className="text-primary">Horario</span>
        </h1>
        <p className="mb-10 text-muted-foreground">Escolha o servico, barbeiro, data e horario.</p>

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
                <p className="text-sm text-muted-foreground">
                  {confirmedReservation.googleCalendarEventId
                    ? "Seus dados foram salvos e o evento entrou no Google."
                    : "Seus dados ja foram salvos no sistema."}
                </p>
              </div>
            </div>

            <div className="grid gap-3 rounded-md bg-secondary/50 p-4 md:grid-cols-2">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Servico</span>
                <span className="font-semibold">{confirmedReservation.serviceName}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Barbeiro</span>
                <span className="font-semibold">{confirmedReservation.barberName}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Data</span>
                <span className="font-semibold">{formatReservationDate(confirmedReservation.reservationDate)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Horario</span>
                <span className="font-semibold">{confirmedReservation.reservationTime}</span>
              </div>
            </div>

            {confirmedReservation.googleCalendarEventLink ? (
              <a
                href={confirmedReservation.googleCalendarEventLink}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-primary/80"
              >
                <CalendarCheck2 className="h-4 w-4" /> Abrir no Google Calendar
              </a>
            ) : null}
          </motion.div>
        ) : null}

        <div className="mb-10">
          <h3 className="mb-4 flex items-center gap-2 font-display text-xl font-semibold">
            <Scissors className="h-5 w-5 text-primary" /> Servico
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
            <Clock className="h-5 w-5 text-primary" /> Horario
          </h3>
          <div className="flex flex-wrap gap-2">
            {timeSlots.map((time) => {
              const isUnavailable = unavailableTimes.includes(time);
              const isSelected = selectedTime === time;

              return (
                <button
                  key={time}
                  onClick={() => {
                    if (!isUnavailable) {
                      setSelectedTime(time);
                    }
                  }}
                  disabled={isUnavailable}
                  className={`rounded-md border px-4 py-2 text-sm font-medium transition-all ${
                    isUnavailable
                      ? "cursor-not-allowed border-border/60 bg-muted/60 text-muted-foreground line-through opacity-60"
                      : isSelected
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-card text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {time}
                </button>
              );
            })}
          </div>
          {selectedBarber && selectedDate ? (
            availabilityQuery.isLoading ? (
              <p className="mt-3 text-sm text-muted-foreground">Verificando horarios indisponiveis...</p>
            ) : unavailableTimes.length > 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Horarios riscados ja estao reservados para {selectedBarber} em {formatReservationDate(selectedDate)}.
              </p>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                Nenhum horario reservado para {selectedBarber} em {formatReservationDate(selectedDate)} ate agora.
              </p>
            )
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">Escolha barbeiro e data para ver os horarios disponiveis.</p>
          )}
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

        {selectedServiceData ? (
          <p className="mt-4 text-sm text-muted-foreground">
            O evento vai ocupar {selectedServiceData.duration} com {selectedBarber || "o barbeiro escolhido"}.
          </p>
        ) : null}

        {createReservation.isError ? <p className="mt-4 text-sm text-destructive">{createReservation.error.message}</p> : null}

        <section id="minhas-reservas" className="mt-16 border-t border-border pt-10">
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
              {reservationsQuery.data.map((reservation) => {
                const isCancelled = reservation.status === "cancelled";

                return (
                  <div key={reservation.id} className="rounded-lg border border-border bg-card p-5">
                    <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h3 className="font-display text-xl font-semibold">{reservation.serviceName}</h3>
                        <div className="mt-2 grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                          <span>Barbeiro: {reservation.barberName}</span>
                          <span>Horario: {reservation.reservationTime}</span>
                          <span>Data: {formatReservationDate(reservation.reservationDate)}</span>
                          <span>Valor: R$ {reservation.servicePrice.toFixed(2).replace(".", ",")}</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-start gap-3 md:items-end">
                        <span
                          className={`w-fit rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-widest ${
                            isCancelled ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
                          }`}
                        >
                          {reservation.status}
                        </span>

                        <div className="flex flex-wrap gap-2">
                          {reservation.googleCalendarEventLink && !isCancelled ? (
                            <a
                              href={reservation.googleCalendarEventLink}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm transition-colors hover:border-primary/40 hover:text-foreground"
                            >
                              <CalendarCheck2 className="h-4 w-4" /> Ver no Google
                            </a>
                          ) : null}

                          {!isCancelled ? (
                            <button
                              onClick={() => void handleCancelReservation(reservation)}
                              disabled={cancelReservation.isPending}
                              className="inline-flex items-center gap-2 rounded-md border border-destructive/40 px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <X className="h-4 w-4" /> Cancelar
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-card/40 p-6 text-muted-foreground">
              Voce ainda nao tem reservas salvas.
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Agendamentos;
