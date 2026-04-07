import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, Navigate } from "react-router-dom";
import { ArrowLeft, CalendarDays, LoaderCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { adminApi } from "@/lib/api";
import { formatReservationDate } from "@/lib/dates";

const ColaboradorAgendamentos = () => {
  const { user, loading, logout } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));

  const dailyReservationsQuery = useQuery({
    queryKey: ["collaborator-reservations", selectedDate],
    queryFn: async () => {
      const response = await adminApi.listReservations(selectedDate);
      return response.reservations;
    },
    enabled: Boolean(user?.role === "collaborator"),
  });

  const myReservations = useMemo(
    () => (dailyReservationsQuery.data ?? []).filter((reservation) => reservation.barberName === user?.barberName),
    [dailyReservationsQuery.data, user?.barberName],
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

  if (user.role !== "collaborator") {
    return <Navigate to="/agendamentos" replace />;
  }

  return (
    <div className="min-h-screen bg-background pb-12 pt-20">
      <nav className="fixed left-0 right-0 top-0 z-50 border-b border-border bg-background/90 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="font-display text-2xl font-bold tracking-wide text-primary">
            BARBEARIA <span className="text-foreground">RAMOS</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user.barberName || user.name}</span>
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
            <h1 className="font-display text-4xl font-bold">Minha agenda</h1>
            <p className="text-muted-foreground">Agendamentos destinados a {user.barberName || user.name}.</p>
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
        ) : myReservations.length > 0 ? (
          <div className="grid gap-4">
            {myReservations.map((reservation) => (
              <div key={reservation.id} className="rounded-lg border border-border bg-card p-5">
                <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <h3 className="font-display text-xl font-semibold">{reservation.serviceName}</h3>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
                    {reservation.status}
                  </span>
                </div>
                <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                  <span>Cliente: {reservation.customerName || "Nao informado"}</span>
                  <span>E-mail: {reservation.customerEmail || "Nao informado"}</span>
                  <span>Horario: {reservation.reservationTime}</span>
                  <span>Data: {formatReservationDate(reservation.reservationDate)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-card/40 p-6 text-muted-foreground">
            Nenhum agendamento destinado a voce nesta data.
          </div>
        )}
      </div>
    </div>
  );
};

export default ColaboradorAgendamentos;
