import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, Navigate } from "react-router-dom";
import { ArrowLeft, CalendarDays, CheckCircle2, LoaderCircle, RefreshCcw, ShieldCheck, XCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { adminApi, reservationsApi } from "@/lib/api";
import { barbers, timeSlots } from "@/lib/barbershop";
import { formatReservationDate } from "@/lib/dates";
import { buildAdminCancellationEmail, buildAdminRescheduleEmail, sendGmailMessage } from "@/lib/google";
import type { Reservation } from "@/lib/types";

const addDays = (dateValue: string, amount: number) => {
  const date = new Date(`${dateValue}T12:00:00`);
  date.setDate(date.getDate() + amount);
  return date.toISOString().slice(0, 10);
};

const todayDate = () => new Date().toISOString().slice(0, 10);

const AdminAgendamentos = () => {
  const { user, loading, logout, googleAccessToken } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(todayDate());
  const [cancelInputs, setCancelInputs] = useState<Record<string, string>>({});
  const [rescheduleInputs, setRescheduleInputs] = useState<Record<string, { barberName: string; reservationDate: string; reservationTime: string }>>({});

  const refreshAdminQueries = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-reservations", selectedDate] });
    void queryClient.invalidateQueries({ queryKey: ["reservations"] });
  };

  const dailyReservationsQuery = useQuery({
    queryKey: ["admin-reservations", selectedDate],
    queryFn: async () => {
      const response = await adminApi.listReservations(selectedDate);
      return response.reservations;
    },
    enabled: Boolean(user?.isAdmin),
  });

  const cancelMutation = useMutation({
    mutationFn: async ({ reservationId, reason }: { reservationId: string; reason: string }) =>
      reservationsApi.cancel(reservationId, { cancellationReason: reason }),
    onSuccess: refreshAdminQueries,
  });

  const completeMutation = useMutation({
    mutationFn: reservationsApi.complete,
    onSuccess: refreshAdminQueries,
  });

  const rescheduleMutation = useMutation({
    mutationFn: async ({
      reservationId,
      barberName,
      reservationDate,
      reservationTime,
    }: {
      reservationId: string;
      barberName: string;
      reservationDate: string;
      reservationTime: string;
    }) => reservationsApi.reschedule(reservationId, { barberName, reservationDate, reservationTime }),
    onSuccess: refreshAdminQueries,
  });

  const reservationsByBarber = useMemo(() => {
    const allReservations = dailyReservationsQuery.data ?? [];

    return barbers.map((barber) => {
      const reservations = allReservations.filter((reservation) => reservation.barberName === barber);
      const confirmed = reservations.filter((reservation) => reservation.status === "confirmed").length;
      const completed = reservations.filter((reservation) => reservation.status === "completed").length;
      const cancelled = reservations.filter((reservation) => reservation.status === "cancelled").length;

      return {
        barber,
        reservations,
        summary: {
          total: reservations.length,
          confirmed,
          completed,
          cancelled,
        },
      };
    });
  }, [dailyReservationsQuery.data]);

  const totalSummary = useMemo(() => {
    const reservations = dailyReservationsQuery.data ?? [];

    return {
      total: reservations.length,
      confirmed: reservations.filter((reservation) => reservation.status === "confirmed").length,
      completed: reservations.filter((reservation) => reservation.status === "completed").length,
      cancelled: reservations.filter((reservation) => reservation.status === "cancelled").length,
    };
  }, [dailyReservationsQuery.data]);

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

  if (!user.isAdmin) {
    return <Navigate to="/agendamentos" replace />;
  }

  const handleAdminCancel = async (reservation: Reservation) => {
    const reason = cancelInputs[reservation.id]?.trim();

    if (!reason) {
      toast({
        title: "Justificativa obrigatoria",
        description: "Escreva o motivo do cancelamento antes de continuar.",
        variant: "destructive",
      });
      return;
    }

    const response = await cancelMutation.mutateAsync({ reservationId: reservation.id, reason });

    if (googleAccessToken && reservation.customerEmail) {
      try {
        const email = buildAdminCancellationEmail(
          response.reservation.serviceName,
          response.reservation.barberName,
          response.reservation.reservationDate,
          response.reservation.reservationTime,
          reason,
        );

        await sendGmailMessage({
          accessToken: googleAccessToken,
          to: reservation.customerEmail,
          subject: email.subject,
          text: email.text,
        });
      } catch (error) {
        toast({
          title: "Cancelado sem notificacao",
          description: error instanceof Error ? error.message : "Nao foi possivel notificar o cliente por e-mail.",
          variant: "destructive",
        });
      }
    }

    setCancelInputs((current) => ({ ...current, [reservation.id]: "" }));
    toast({
      title: "Agendamento cancelado",
      description: "O agendamento foi cancelado e a justificativa ficou registrada.",
    });
  };

  const handleCompleteReservation = async (reservation: Reservation) => {
    await completeMutation.mutateAsync(reservation.id);
    toast({
      title: "Agendamento realizado",
      description: "O atendimento foi marcado como concluido.",
    });
  };

  const handleRescheduleReservation = async (reservation: Reservation) => {
    const draft = rescheduleInputs[reservation.id] ?? {
      barberName: reservation.barberName,
      reservationDate: reservation.reservationDate,
      reservationTime: reservation.reservationTime,
    };

    if (!draft.barberName || !draft.reservationDate || !draft.reservationTime) {
      toast({
        title: "Dados incompletos",
        description: "Preencha barbeiro, data e horario da remarcacao.",
        variant: "destructive",
      });
      return;
    }

    const response = await rescheduleMutation.mutateAsync({
      reservationId: reservation.id,
      barberName: draft.barberName,
      reservationDate: draft.reservationDate,
      reservationTime: draft.reservationTime,
    });

    if (googleAccessToken && reservation.customerEmail) {
      try {
        const email = buildAdminRescheduleEmail(
          response.reservation.serviceName,
          response.reservation.barberName,
          response.reservation.reservationDate,
          response.reservation.reservationTime,
        );

        await sendGmailMessage({
          accessToken: googleAccessToken,
          to: reservation.customerEmail,
          subject: email.subject,
          text: email.text,
        });
      } catch (error) {
        toast({
          title: "Remarcado sem notificacao",
          description: error instanceof Error ? error.message : "Nao foi possivel notificar o cliente da remarcacao.",
          variant: "destructive",
        });
      }
    }

    toast({
      title: "Agendamento remarcado",
      description: "O horario foi atualizado com sucesso.",
    });
  };

  return (
    <div className="min-h-screen bg-background pb-12 pt-20">
      <nav className="fixed left-0 right-0 top-0 z-50 border-b border-border bg-background/90 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="font-display text-2xl font-bold tracking-wide text-primary">
            BARBEARIA <span className="text-foreground">RAMOS</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" /> Admin
            </span>
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

        <div className="mb-8 flex flex-col gap-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="font-display text-4xl font-bold">Agenda por data</h1>
              <p className="text-muted-foreground">Acompanhe os agendamentos por barbeiro, remarque, conclua ou cancele com justificativa.</p>
            </div>

            <label className="flex w-full max-w-xs flex-col gap-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-2 font-medium text-foreground">
                <CalendarDays className="h-4 w-4 text-primary" /> Data
              </span>
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="rounded-lg border border-border bg-card px-4 py-3 text-foreground focus:border-primary focus:outline-none"
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={() => setSelectedDate(addDays(selectedDate, -1))} className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground">
              Dia anterior
            </button>
            <button onClick={() => setSelectedDate(todayDate())} className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground">
              Hoje
            </button>
            <button onClick={() => setSelectedDate(addDays(selectedDate, 1))} className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground">
              Proximo dia
            </button>
          </div>
        </div>

        {dailyReservationsQuery.isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Carregando agenda...
          </div>
        ) : (
          <>
            <div className="mb-8 grid gap-4 md:grid-cols-4">
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Total</p>
                <p className="mt-2 font-display text-3xl font-bold">{totalSummary.total}</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Confirmados</p>
                <p className="mt-2 font-display text-3xl font-bold text-primary">{totalSummary.confirmed}</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Realizados</p>
                <p className="mt-2 font-display text-3xl font-bold">{totalSummary.completed}</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Cancelados</p>
                <p className="mt-2 font-display text-3xl font-bold">{totalSummary.cancelled}</p>
              </div>
            </div>

            <div className="grid gap-6">
              {reservationsByBarber.map(({ barber, reservations, summary }) => (
                <section key={barber} className="rounded-xl border border-border bg-card p-5">
                  <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h2 className="font-display text-2xl font-bold">{barber}</h2>
                      <p className="text-sm text-muted-foreground">
                        {summary.total > 0
                          ? `${summary.total} agendamento(s) em ${formatReservationDate(selectedDate)}`
                          : `Nenhum agendamento em ${formatReservationDate(selectedDate)}`}
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs uppercase tracking-widest text-muted-foreground">
                      <div className="rounded-md border border-border px-3 py-2">Conf.: {summary.confirmed}</div>
                      <div className="rounded-md border border-border px-3 py-2">Real.: {summary.completed}</div>
                      <div className="rounded-md border border-border px-3 py-2">Canc.: {summary.cancelled}</div>
                    </div>
                  </div>

                  {reservations.length > 0 ? (
                    <div className="grid gap-4">
                      {reservations.map((reservation) => {
                        const isCancelled = reservation.status === "cancelled";
                        const isCompleted = reservation.status === "completed";
                        const rescheduleDraft = rescheduleInputs[reservation.id] ?? {
                          barberName: reservation.barberName,
                          reservationDate: reservation.reservationDate,
                          reservationTime: reservation.reservationTime,
                        };

                        return (
                          <div key={reservation.id} className="rounded-lg border border-border bg-background/60 p-4">
                            <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                              <div>
                                <h3 className="font-display text-xl font-semibold">{reservation.serviceName}</h3>
                                <p className="text-sm text-muted-foreground">
                                  {reservation.customerName || "Cliente"} - {reservation.customerEmail || "sem e-mail"}
                                </p>
                              </div>
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-widest ${
                                  isCancelled
                                    ? "bg-muted text-muted-foreground"
                                    : isCompleted
                                      ? "bg-emerald-500/10 text-emerald-300"
                                      : "bg-primary/10 text-primary"
                                }`}
                              >
                                {reservation.status}
                              </span>
                            </div>

                            <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                              <span>Horario: {reservation.reservationTime}</span>
                              <span>Valor: R$ {reservation.servicePrice.toFixed(2).replace(".", ",")}</span>
                              {reservation.cancellationReason ? <span>Motivo: {reservation.cancellationReason}</span> : null}
                              {reservation.cancelledByEmail ? <span>Cancelado por: {reservation.cancelledByEmail}</span> : null}
                            </div>

                            {!isCancelled ? (
                              <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.9fr]">
                                <div className="space-y-3 rounded-lg border border-border bg-card/70 p-4">
                                  <p className="text-sm font-semibold text-foreground">Remarcar</p>
                                  <div className="grid gap-3 md:grid-cols-3">
                                    <select
                                      value={rescheduleDraft.barberName}
                                      onChange={(event) =>
                                        setRescheduleInputs((current) => ({
                                          ...current,
                                          [reservation.id]: { ...rescheduleDraft, barberName: event.target.value },
                                        }))
                                      }
                                      className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                                    >
                                      {barbers.map((barberOption) => (
                                        <option key={barberOption} value={barberOption}>
                                          {barberOption}
                                        </option>
                                      ))}
                                    </select>

                                    <input
                                      type="date"
                                      value={rescheduleDraft.reservationDate}
                                      onChange={(event) =>
                                        setRescheduleInputs((current) => ({
                                          ...current,
                                          [reservation.id]: { ...rescheduleDraft, reservationDate: event.target.value },
                                        }))
                                      }
                                      className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                                    />

                                    <select
                                      value={rescheduleDraft.reservationTime}
                                      onChange={(event) =>
                                        setRescheduleInputs((current) => ({
                                          ...current,
                                          [reservation.id]: { ...rescheduleDraft, reservationTime: event.target.value },
                                        }))
                                      }
                                      className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                                    >
                                      {timeSlots.map((slot) => (
                                        <option key={slot} value={slot}>
                                          {slot}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  <button
                                    onClick={() => void handleRescheduleReservation(reservation)}
                                    disabled={rescheduleMutation.isPending}
                                    className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm text-foreground transition-colors hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    <RefreshCcw className="h-4 w-4" /> Remarcar
                                  </button>
                                </div>

                                <div className="space-y-3 rounded-lg border border-border bg-card/70 p-4">
                                  <p className="text-sm font-semibold text-foreground">Acoes do atendimento</p>
                                  {!isCompleted ? (
                                    <button
                                      onClick={() => void handleCompleteReservation(reservation)}
                                      disabled={completeMutation.isPending}
                                      className="inline-flex items-center gap-2 rounded-md border border-emerald-500/40 px-4 py-2 text-sm text-emerald-300 transition-colors hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      <CheckCircle2 className="h-4 w-4" /> Agendamento realizado
                                    </button>
                                  ) : null}

                                  <textarea
                                    value={cancelInputs[reservation.id] ?? ""}
                                    onChange={(event) =>
                                      setCancelInputs((current) => ({ ...current, [reservation.id]: event.target.value }))
                                    }
                                    rows={3}
                                    placeholder="Justificativa obrigatoria para cancelar este agendamento"
                                    className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none"
                                  />
                                  <button
                                    onClick={() => void handleAdminCancel(reservation)}
                                    disabled={cancelMutation.isPending}
                                    className="inline-flex items-center gap-2 rounded-md border border-destructive/40 px-4 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    <XCircle className="h-4 w-4" /> Cancelar com justificativa
                                  </button>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </section>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminAgendamentos;
