import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, Navigate } from "react-router-dom";
import { ArrowLeft, CalendarDays, LoaderCircle, ShieldCheck, XCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { adminApi, reservationsApi } from "@/lib/api";
import { barbers } from "@/lib/barbershop";
import { formatReservationDate } from "@/lib/dates";
import { buildAdminCancellationEmail, sendGmailMessage } from "@/lib/google";
import type { Reservation } from "@/lib/types";

const AdminAgendamentos = () => {
  const { user, loading, logout, googleAccessToken } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [cancelInputs, setCancelInputs] = useState<Record<string, string>>({});

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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-reservations", selectedDate] });
      void queryClient.invalidateQueries({ queryKey: ["reservations"] });
    },
  });

  const reservationsByBarber = useMemo(() => {
    const allReservations = dailyReservationsQuery.data ?? [];

    return barbers.map((barber) => ({
      barber,
      reservations: allReservations.filter((reservation) => reservation.barberName === barber),
    }));
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
      description: "O cliente foi cancelado no sistema e a justificativa foi registrada.",
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

        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-display text-4xl font-bold">Agenda do dia</h1>
            <p className="text-muted-foreground">Visualize os agendamentos separados por barbeiro e cancele com justificativa.</p>
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

        {dailyReservationsQuery.isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Carregando agenda...
          </div>
        ) : (
          <div className="grid gap-6">
            {reservationsByBarber.map(({ barber, reservations }) => (
              <section key={barber} className="rounded-xl border border-border bg-card p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="font-display text-2xl font-bold">{barber}</h2>
                    <p className="text-sm text-muted-foreground">
                      {reservations.length > 0
                        ? `${reservations.length} agendamento(s) em ${formatReservationDate(selectedDate)}`
                        : `Nenhum agendamento em ${formatReservationDate(selectedDate)}`}
                    </p>
                  </div>
                </div>

                {reservations.length > 0 ? (
                  <div className="grid gap-4">
                    {reservations.map((reservation) => {
                      const isCancelled = reservation.status === "cancelled";

                      return (
                        <div key={reservation.id} className="rounded-lg border border-border bg-background/60 p-4">
                          <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                            <div>
                              <h3 className="font-display text-xl font-semibold">{reservation.serviceName}</h3>
                              <p className="text-sm text-muted-foreground">
                                {reservation.customerName || "Cliente"} - {reservation.customerEmail || "sem e-mail"}
                              </p>
                            </div>
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-widest ${isCancelled ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"}`}>
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
                            <div className="mt-4 space-y-3">
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
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAgendamentos;
