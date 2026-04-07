import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, Navigate } from "react-router-dom";
import { ArrowLeft, CalendarDays, CheckCircle2, LoaderCircle, RefreshCcw, Search, ShieldCheck, UserCog, Wallet, XCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { adminApi, reservationsApi } from "@/lib/api";
import { barbers, timeSlots } from "@/lib/barbershop";
import { formatReservationDate } from "@/lib/dates";
import { buildAdminCancellationEmail, buildAdminRescheduleEmail, sendGmailMessage } from "@/lib/google";
import type { Reservation, User } from "@/lib/types";

type AdminView = "agenda" | "users" | "dashboard";
type DashboardPeriod = "day" | "week" | "month";

const todayDate = () => new Date().toISOString().slice(0, 10);
const addDays = (dateValue: string, amount: number) => {
  const date = new Date(`${dateValue}T12:00:00`);
  date.setDate(date.getDate() + amount);
  return date.toISOString().slice(0, 10);
};

const roleLabel: Record<User["role"], string> = {
  admin: "Admin",
  collaborator: "Colaborador",
  customer: "Cliente",
};

type UserDraft = {
  role: User["role"];
  barberName: string;
  photoUrl: string;
  phone: string;
  notes: string;
};

const AdminAgendamentos = () => {
  const { user, loading, logout, googleAccessToken } = useAuth();
  const queryClient = useQueryClient();
  const [view, setView] = useState<AdminView>("agenda");
  const [agendaDate, setAgendaDate] = useState(todayDate());
  const [dashboardDate, setDashboardDate] = useState(todayDate());
  const [dashboardPeriod, setDashboardPeriod] = useState<DashboardPeriod>("day");
  const [search, setSearch] = useState("");
  const [cancelInputs, setCancelInputs] = useState<Record<string, string>>({});
  const [rescheduleInputs, setRescheduleInputs] = useState<Record<string, { barberName: string; reservationDate: string; reservationTime: string }>>({});
  const [userDrafts, setUserDrafts] = useState<Record<string, UserDraft>>({});

  const invalidateAll = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-reservations"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    void queryClient.invalidateQueries({ queryKey: ["reservations"] });
  };

  const agendaQuery = useQuery({
    queryKey: ["admin-reservations", agendaDate],
    queryFn: async () => (await adminApi.listReservations(agendaDate)).reservations,
    enabled: Boolean(user?.isAdmin),
  });

  const usersQuery = useQuery({
    queryKey: ["admin-users", search],
    queryFn: async () => (await adminApi.listUsers(search)).users,
    enabled: Boolean(user?.isAdmin),
  });

  const dashboardQuery = useQuery({
    queryKey: ["admin-dashboard", dashboardPeriod, dashboardDate],
    queryFn: async () => adminApi.dashboard(dashboardPeriod, dashboardDate),
    enabled: Boolean(user?.isAdmin),
  });

  const cancelMutation = useMutation({
    mutationFn: ({ reservationId, reason }: { reservationId: string; reason: string }) =>
      reservationsApi.cancel(reservationId, { cancellationReason: reason }),
    onSuccess: invalidateAll,
  });

  const completeMutation = useMutation({
    mutationFn: reservationsApi.complete,
    onSuccess: invalidateAll,
  });

  const rescheduleMutation = useMutation({
    mutationFn: ({ reservationId, barberName, reservationDate, reservationTime }: { reservationId: string; barberName: string; reservationDate: string; reservationTime: string }) =>
      reservationsApi.reschedule(reservationId, { barberName, reservationDate, reservationTime }),
    onSuccess: invalidateAll,
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ userId, draft }: { userId: string; draft: UserDraft }) =>
      adminApi.updateUser(userId, {
        role: draft.role,
        barberName: draft.role === "collaborator" ? draft.barberName : null,
        photoUrl: draft.photoUrl || null,
        phone: draft.phone || null,
        notes: draft.notes || null,
      }),
    onSuccess: invalidateAll,
  });

  const getUserDraft = (account: User): UserDraft =>
    userDrafts[account.id] ?? {
      role: account.role,
      barberName: account.barberName ?? "",
      photoUrl: account.photoUrl ?? "",
      phone: account.phone ?? "",
      notes: account.notes ?? "",
    };

  const agendaSummary = useMemo(() => {
    const reservations = agendaQuery.data ?? [];
    const byBarber = barbers.map((barber) => {
      const items = reservations.filter((reservation) => reservation.barberName === barber);
      return {
        barber,
        reservations: items,
        pending: items.filter((reservation) => reservation.status === "confirmed").length,
        completed: items.filter((reservation) => reservation.status === "completed").length,
        cancelled: items.filter((reservation) => reservation.status === "cancelled").length,
      };
    });
    return {
      byBarber,
      total: reservations.length,
      pending: reservations.filter((reservation) => reservation.status === "confirmed").length,
      completed: reservations.filter((reservation) => reservation.status === "completed").length,
      cancelled: reservations.filter((reservation) => reservation.status === "cancelled").length,
    };
  }, [agendaQuery.data]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><LoaderCircle className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  if (!user) return <Navigate to="/" replace />;
  if (!user.isAdmin) return <Navigate to="/agendamentos" replace />;

  const notify = async (to: string | undefined, subject: string, text: string, fallbackTitle: string) => {
    if (!googleAccessToken || !to) return;
    try {
      await sendGmailMessage({ accessToken: googleAccessToken, to, subject, text });
    } catch (error) {
      toast({ title: fallbackTitle, description: error instanceof Error ? error.message : "Falha ao notificar por e-mail.", variant: "destructive" });
    }
  };

  const handleCancel = async (reservation: Reservation) => {
    const reason = cancelInputs[reservation.id]?.trim();
    if (!reason) {
      toast({ title: "Justificativa obrigatoria", description: "Escreva o motivo do cancelamento.", variant: "destructive" });
      return;
    }
    const response = await cancelMutation.mutateAsync({ reservationId: reservation.id, reason });
    const email = buildAdminCancellationEmail(response.reservation.serviceName, response.reservation.barberName, response.reservation.reservationDate, response.reservation.reservationTime, reason);
    await notify(reservation.customerEmail, email.subject, email.text, "Cancelado sem notificacao");
    setCancelInputs((current) => ({ ...current, [reservation.id]: "" }));
    toast({ title: "Agendamento cancelado", description: "O motivo foi registrado." });
  };

  const handleComplete = async (reservationId: string) => {
    await completeMutation.mutateAsync(reservationId);
    toast({ title: "Agendamento realizado", description: "Atendimento concluido com sucesso." });
  };

  const handleReschedule = async (reservation: Reservation) => {
    const draft = rescheduleInputs[reservation.id] ?? { barberName: reservation.barberName, reservationDate: reservation.reservationDate, reservationTime: reservation.reservationTime };
    const response = await rescheduleMutation.mutateAsync({ reservationId: reservation.id, ...draft });
    const email = buildAdminRescheduleEmail(response.reservation.serviceName, response.reservation.barberName, response.reservation.reservationDate, response.reservation.reservationTime);
    await notify(reservation.customerEmail, email.subject, email.text, "Remarcado sem notificacao");
    toast({ title: "Agendamento remarcado", description: "Horario atualizado com sucesso." });
  };

  const handleUpdateUser = async (account: User) => {
    const draft = getUserDraft(account);
    await updateUserMutation.mutateAsync({ userId: account.id, draft });
    toast({ title: "Perfil atualizado", description: `Perfil de ${account.name} atualizado.` });
  };

  return (
    <div className="min-h-screen bg-background pb-12 pt-20">
      <nav className="fixed left-0 right-0 top-0 z-50 border-b border-border bg-background/90 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="font-display text-2xl font-bold tracking-wide text-primary">BARBEARIA <span className="text-foreground">RAMOS</span></Link>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-2 text-sm text-muted-foreground"><ShieldCheck className="h-4 w-4 text-primary" /> Admin</span>
            <img src={user.avatarUrl} alt={user.name} className="h-8 w-8 rounded-full" />
            <span className="text-sm font-medium">{user.name}</span>
            <button onClick={() => void logout()} className="text-sm text-muted-foreground transition-colors hover:text-foreground">Sair</button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4">
        <Link to="/" className="mb-8 inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Voltar</Link>

        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-display text-4xl font-bold">Painel administrativo</h1>
            <p className="text-muted-foreground">Gerencie agenda, contas e desempenho da equipe.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["agenda", "users", "dashboard"] as AdminView[]).map((item) => (
              <button key={item} onClick={() => setView(item)} className={`rounded-md border px-4 py-2 text-sm ${view === item ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"}`}>
                {item === "agenda" ? "Agenda" : item === "users" ? "Contas" : "Dashboard"}
              </button>
            ))}
          </div>
        </div>

        {view === "agenda" ? (
          <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="font-display text-3xl font-bold">Agenda por data</h2>
                <p className="text-muted-foreground">Remarque, conclua ou cancele com justificativa.</p>
              </div>
              <label className="flex w-full max-w-xs flex-col gap-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-2 font-medium text-foreground"><CalendarDays className="h-4 w-4 text-primary" /> Data</span>
                <input type="date" value={agendaDate} onChange={(event) => setAgendaDate(event.target.value)} className="rounded-lg border border-border bg-card px-4 py-3 text-foreground focus:border-primary focus:outline-none" />
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setAgendaDate(addDays(agendaDate, -1))} className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground">Dia anterior</button>
              <button onClick={() => setAgendaDate(todayDate())} className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground">Hoje</button>
              <button onClick={() => setAgendaDate(addDays(agendaDate, 1))} className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground">Proximo dia</button>
            </div>
            {agendaQuery.isLoading ? <div className="flex items-center gap-2 text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin" /> Carregando agenda...</div> : (
              <>
                <div className="grid gap-4 md:grid-cols-4">
                  {[["Total", agendaSummary.total], ["Pendentes", agendaSummary.pending], ["Realizados", agendaSummary.completed], ["Cancelados", agendaSummary.cancelled]].map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-border bg-card p-4"><p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p><p className="mt-2 font-display text-3xl font-bold">{value}</p></div>
                  ))}
                </div>
                <div className="grid gap-6">
                  {agendaSummary.byBarber.map(({ barber, reservations, pending, completed, cancelled }) => (
                    <section key={barber} className="rounded-xl border border-border bg-card p-5">
                      <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div><h2 className="font-display text-2xl font-bold">{barber}</h2><p className="text-sm text-muted-foreground">{reservations.length} agendamento(s) em {formatReservationDate(agendaDate)}</p></div>
                        <div className="grid grid-cols-3 gap-2 text-center text-xs uppercase tracking-widest text-muted-foreground">
                          <div className="rounded-md border border-border px-3 py-2">Pend.: {pending}</div>
                          <div className="rounded-md border border-border px-3 py-2">Real.: {completed}</div>
                          <div className="rounded-md border border-border px-3 py-2">Canc.: {cancelled}</div>
                        </div>
                      </div>
                      <div className="grid gap-4">
                        {reservations.length > 0 ? reservations.map((reservation) => {
                          const isCancelled = reservation.status === "cancelled";
                          const isCompleted = reservation.status === "completed";
                          const draft = rescheduleInputs[reservation.id] ?? { barberName: reservation.barberName, reservationDate: reservation.reservationDate, reservationTime: reservation.reservationTime };
                          return (
                            <div key={reservation.id} className="rounded-lg border border-border bg-background/60 p-4">
                              <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                <div><h3 className="font-display text-xl font-semibold">{reservation.serviceName}</h3><p className="text-sm text-muted-foreground">{reservation.customerName || "Cliente"} - {reservation.customerEmail || "sem e-mail"}</p></div>
                                <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-widest ${isCancelled ? "bg-muted text-muted-foreground" : isCompleted ? "bg-emerald-500/10 text-emerald-300" : "bg-primary/10 text-primary"}`}>{reservation.status}</span>
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
                                      <select value={draft.barberName} onChange={(event) => setRescheduleInputs((current) => ({ ...current, [reservation.id]: { ...draft, barberName: event.target.value } }))} className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none">{barbers.map((option) => <option key={option} value={option}>{option}</option>)}</select>
                                      <input type="date" value={draft.reservationDate} onChange={(event) => setRescheduleInputs((current) => ({ ...current, [reservation.id]: { ...draft, reservationDate: event.target.value } }))} className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
                                      <select value={draft.reservationTime} onChange={(event) => setRescheduleInputs((current) => ({ ...current, [reservation.id]: { ...draft, reservationTime: event.target.value } }))} className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none">{timeSlots.map((slot) => <option key={slot} value={slot}>{slot}</option>)}</select>
                                    </div>
                                    <button onClick={() => void handleReschedule(reservation)} disabled={rescheduleMutation.isPending} className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm text-foreground hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-60"><RefreshCcw className="h-4 w-4" /> Remarcar</button>
                                  </div>
                                  <div className="space-y-3 rounded-lg border border-border bg-card/70 p-4">
                                    <p className="text-sm font-semibold text-foreground">Acoes</p>
                                    {!isCompleted ? <button onClick={() => void handleComplete(reservation.id)} disabled={completeMutation.isPending} className="inline-flex items-center gap-2 rounded-md border border-emerald-500/40 px-4 py-2 text-sm text-emerald-300 hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"><CheckCircle2 className="h-4 w-4" /> Agendamento realizado</button> : null}
                                    <textarea value={cancelInputs[reservation.id] ?? ""} onChange={(event) => setCancelInputs((current) => ({ ...current, [reservation.id]: event.target.value }))} rows={3} placeholder="Justificativa obrigatoria para cancelar este agendamento" className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none" />
                                    <button onClick={() => void handleCancel(reservation)} disabled={cancelMutation.isPending} className="inline-flex items-center gap-2 rounded-md border border-destructive/40 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-60"><XCircle className="h-4 w-4" /> Cancelar com justificativa</button>
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          );
                        }) : <div className="rounded-lg border border-dashed border-border bg-background/40 p-4 text-sm text-muted-foreground">Nenhum agendamento para este barbeiro.</div>}
                      </div>
                    </section>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : null}

        {view === "users" ? (
          <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div><h2 className="font-display text-3xl font-bold">Contas criadas</h2><p className="text-muted-foreground">Pesquise por nome ou e-mail e ajuste o tipo de acesso.</p></div>
              <label className="flex w-full max-w-md items-center gap-2 rounded-lg border border-border bg-card px-4 py-3"><Search className="h-4 w-4 text-muted-foreground" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar por nome ou e-mail" className="w-full bg-transparent text-sm text-foreground outline-none" /></label>
            </div>
            {usersQuery.isLoading ? <div className="flex items-center gap-2 text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin" /> Carregando contas...</div> : (
              <div className="grid gap-4">
                {(usersQuery.data ?? []).map((account) => {
                  const draft = getUserDraft(account);
                  return (
                    <div key={account.id} className="rounded-xl border border-border bg-card p-5">
                      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-3"><img src={draft.photoUrl || account.avatarUrl} alt={account.name} className="h-12 w-12 rounded-full border border-border object-cover" /><div><h3 className="font-display text-xl font-semibold">{account.name}</h3><p className="text-sm text-muted-foreground">{account.email}</p>{account.phone ? <p className="text-xs text-muted-foreground">{account.phone}</p> : null}</div></div>
                        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">{roleLabel[account.role]}</span>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <select value={draft.role} onChange={(event) => setUserDrafts((current) => ({ ...current, [account.id]: { ...draft, role: event.target.value as User["role"] } }))} className="rounded-lg border border-border bg-background px-3 py-3 text-sm text-foreground focus:border-primary focus:outline-none">
                          <option value="customer">Cliente</option><option value="collaborator">Colaborador</option><option value="admin">Admin</option>
                        </select>
                        <select value={draft.barberName} onChange={(event) => setUserDrafts((current) => ({ ...current, [account.id]: { ...draft, barberName: event.target.value } }))} disabled={draft.role !== "collaborator"} className="rounded-lg border border-border bg-background px-3 py-3 text-sm text-foreground focus:border-primary focus:outline-none disabled:opacity-50">
                          <option value="">Selecione o barbeiro</option>{barbers.map((barber) => <option key={barber} value={barber}>{barber}</option>)}
                        </select>
                        <input value={draft.phone} onChange={(event) => setUserDrafts((current) => ({ ...current, [account.id]: { ...draft, phone: event.target.value } }))} placeholder="Telefone" className="rounded-lg border border-border bg-background px-3 py-3 text-sm text-foreground focus:border-primary focus:outline-none" />
                        <input value={draft.photoUrl} onChange={(event) => setUserDrafts((current) => ({ ...current, [account.id]: { ...draft, photoUrl: event.target.value } }))} placeholder="URL da foto do perfil" className="rounded-lg border border-border bg-background px-3 py-3 text-sm text-foreground focus:border-primary focus:outline-none" />
                        <textarea value={draft.notes} onChange={(event) => setUserDrafts((current) => ({ ...current, [account.id]: { ...draft, notes: event.target.value } }))} rows={3} placeholder="Observacoes internas do perfil" className="md:col-span-2 w-full rounded-lg border border-border bg-background px-3 py-3 text-sm text-foreground focus:border-primary focus:outline-none" />
                      </div>
                      <div className="mt-3">
                        <button onClick={() => void handleUpdateUser(account)} disabled={updateUserMutation.isPending} className="inline-flex items-center justify-center gap-2 rounded-md border border-border px-4 py-3 text-sm text-foreground hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-60"><UserCog className="h-4 w-4" /> Alterar perfil</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}

        {view === "dashboard" ? (
          <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div><h2 className="font-display text-3xl font-bold">Rendimento por funcionario</h2><p className="text-muted-foreground">Filtro de dia, semana e mes.</p></div>
              <div className="flex flex-col gap-3 md:flex-row">
                <select value={dashboardPeriod} onChange={(event) => setDashboardPeriod(event.target.value as DashboardPeriod)} className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none">
                  <option value="day">Dia</option><option value="week">Semana</option><option value="month">Mes</option>
                </select>
                <input type="date" value={dashboardDate} onChange={(event) => setDashboardDate(event.target.value)} className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none" />
              </div>
            </div>
            {dashboardQuery.isLoading ? <div className="flex items-center gap-2 text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin" /> Carregando dashboard...</div> : (
              <>
                <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">Periodo analisado: {formatReservationDate(dashboardQuery.data?.startDate ?? dashboardDate)} a {formatReservationDate(dashboardQuery.data?.endDate ?? dashboardDate)}</div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {(dashboardQuery.data?.stats ?? []).map((stat) => (
                    <div key={stat.barberName} className="rounded-xl border border-border bg-card p-5">
                      <div className="mb-4 flex items-center justify-between"><h3 className="font-display text-2xl font-bold">{stat.barberName}</h3><Wallet className="h-5 w-5 text-primary" /></div>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <p>Rendimento: R$ {stat.totalRevenue.toFixed(2).replace(".", ",")}</p>
                        <p>Pendentes: {stat.pendingCount}</p>
                        <p>Concluidos: {stat.completedCount}</p>
                        <p>Cancelados: {stat.cancelledCount}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default AdminAgendamentos;
