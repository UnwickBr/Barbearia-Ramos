import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, Navigate } from "react-router-dom";
import { ArrowLeft, CalendarDays, CheckCircle2, LoaderCircle, RefreshCcw, Search, ShieldCheck, UserCog, Wallet, XCircle } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { adminApi, reservationsApi } from "@/lib/api";
import { formatReservationDate } from "@/lib/dates";
import { buildAdminCancellationEmail, buildAdminRescheduleEmail, hasGoogleEmailScopes, isGoogleAuthError, sendGmailMessage } from "@/lib/google";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { Reservation, SiteEditableService, User } from "@/lib/types";

type AdminView = "agenda" | "users" | "dashboard" | "site";
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

const formatCurrency = (value: number) =>
  `R$ ${value.toFixed(2).replace(".", ",")}`;

type UserDraft = {
  role: User["role"];
  barberName: string;
  photoUrl: string;
  phone: string;
  notes: string;
};

type SiteContentDraft = {
  heroTitle: string;
  heroSubtitle: string;
  heroPrimaryCta: string;
  heroImageUrl: string;
  servicesEyebrow: string;
  servicesTitle: string;
  services: SiteEditableService[];
  barbers: string[];
  barberSchedules: Record<string, string[]>;
  contactEyebrow: string;
  contactTitle: string;
  addressLabel: string;
  addressText: string;
  phoneLabel: string;
  phoneText: string;
  hoursLabel: string;
  hoursText: string;
  socialLinks: {
    instagram: string;
    facebook: string;
    whatsapp: string;
  };
  footerText: string;
};

const AdminAgendamentos = () => {
  const { user, loading, logout, googleAccessToken, connectGoogleEmail } = useAuth();
  const queryClient = useQueryClient();
  const [view, setView] = useState<AdminView>("agenda");
  const [agendaDate, setAgendaDate] = useState(todayDate());
  const [dashboardDate, setDashboardDate] = useState(todayDate());
  const [dashboardPeriod, setDashboardPeriod] = useState<DashboardPeriod>("day");
  const [search, setSearch] = useState("");
  const [activeBarberTab, setActiveBarberTab] = useState("");
  const [cancelInputs, setCancelInputs] = useState<Record<string, string>>({});
  const [rescheduleInputs, setRescheduleInputs] = useState<Record<string, { barberName: string; reservationDate: string; reservationTime: string; reason: string }>>({});
  const [userDrafts, setUserDrafts] = useState<Record<string, UserDraft>>({});
  const [siteContentDraft, setSiteContentDraft] = useState<SiteContentDraft | null>(null);
  const [barberScheduleDrafts, setBarberScheduleDrafts] = useState<Record<string, string>>({});

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

  const siteContentQuery = useQuery({
    queryKey: ["admin-site-content"],
    queryFn: async () => (await adminApi.siteContent()).content,
    enabled: Boolean(user?.isAdmin),
  });
  const editableBarbers = useMemo(() => siteContentQuery.data?.barbers ?? [], [siteContentQuery.data?.barbers]);

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
    mutationFn: ({ reservationId, barberName, reservationDate, reservationTime, reason }: { reservationId: string; barberName: string; reservationDate: string; reservationTime: string; reason: string }) =>
      reservationsApi.reschedule(reservationId, { barberName, reservationDate, reservationTime, rescheduleReason: reason }),
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

  const updateSiteContentMutation = useMutation({
    mutationFn: adminApi.updateSiteContent,
    onSuccess: (data) => {
      queryClient.setQueryData(["admin-site-content"], data.content);
      queryClient.setQueryData(["site-content"], data.content);
      setSiteContentDraft(data.content);
    },
  });

  const getUserDraft = (account: User): UserDraft =>
    userDrafts[account.id] ?? {
      role: account.role,
      barberName: account.barberName ?? "",
      photoUrl: account.photoUrl ?? "",
      phone: account.phone ?? "",
      notes: account.notes ?? "",
    };

  const getSiteContentDraft = (): SiteContentDraft | null => siteContentDraft ?? siteContentQuery.data ?? null;
  const siteDraft = getSiteContentDraft();
  const getBarberScheduleOptions = (barberName: string) => siteDraft?.barberSchedules?.[barberName] ?? [];
  const getBarberScheduleDraft = (barberName: string) =>
    barberScheduleDrafts[barberName] ?? (siteDraft?.barberSchedules?.[barberName] ?? []).join(", ");

  const agendaSummary = useMemo(() => {
    const reservations = agendaQuery.data ?? [];
    const sourceBarbers = editableBarbers.length > 0
      ? editableBarbers
      : Array.from(new Set(reservations.map((reservation) => reservation.barberName)));
    const byBarber = sourceBarbers.map((barber) => {
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
  }, [agendaQuery.data, editableBarbers]);

  const dashboardChartData = useMemo(
    () =>
      (dashboardQuery.data?.stats ?? []).map((stat) => ({
        barberName: stat.barberName,
        lucro: Number(stat.totalRevenue.toFixed(2)),
        concluidos: stat.completedCount,
        pendentes: stat.pendingCount,
      })),
    [dashboardQuery.data?.stats],
  );

  useEffect(() => {
    if (siteContentQuery.data && !siteContentDraft) {
      setSiteContentDraft(siteContentQuery.data);
    }
  }, [siteContentDraft, siteContentQuery.data]);

  useEffect(() => {
    if (!siteContentQuery.data) {
      return;
    }

    setBarberScheduleDrafts(
      Object.fromEntries(
        siteContentQuery.data.barbers.map((barber) => [
          barber,
          (siteContentQuery.data.barberSchedules[barber] ?? []).join(", "),
        ]),
      ),
    );
  }, [siteContentQuery.data]);

  useEffect(() => {
    const firstBarber = agendaSummary.byBarber[0]?.barber ?? "";

    if (!firstBarber) {
      if (activeBarberTab) {
        setActiveBarberTab("");
      }
      return;
    }

    if (!agendaSummary.byBarber.some(({ barber }) => barber === activeBarberTab)) {
      setActiveBarberTab(firstBarber);
    }
  }, [activeBarberTab, agendaSummary.byBarber]);

  const dashboardChartConfig = {
    lucro: {
      label: "Lucro bruto",
      color: "hsl(var(--primary))",
    },
    concluidos: {
      label: "Concluidos",
      color: "hsl(142 70% 45%)",
    },
  } as const;

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><LoaderCircle className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  if (!user) return <Navigate to="/" replace />;
  if (!user.isAdmin) return <Navigate to="/agendamentos" replace />;

  const ensureGoogleEmailIntegration = async (forceConsent = false) => {
    if (googleAccessToken && hasGoogleEmailScopes() && !forceConsent) {
      return googleAccessToken;
    }

    return await connectGoogleEmail(forceConsent || !googleAccessToken || !hasGoogleEmailScopes());
  };

  const notify = async (to: string | undefined, subject: string, text: string, fallbackTitle: string) => {
    if (!googleAccessToken || !to) return;

    try {
      const emailAccessToken = await ensureGoogleEmailIntegration();
      await sendGmailMessage({ accessToken: emailAccessToken, to, subject, text });
    } catch (error) {
      if (isGoogleAuthError(error)) {
        try {
          const emailAccessToken = await ensureGoogleEmailIntegration(true);
          await sendGmailMessage({ accessToken: emailAccessToken, to, subject, text });
          return;
        } catch (retryError) {
          toast({ title: fallbackTitle, description: retryError instanceof Error ? retryError.message : "Falha ao notificar por e-mail.", variant: "destructive" });
          return;
        }
      }

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
    const draft = rescheduleInputs[reservation.id] ?? { barberName: reservation.barberName, reservationDate: reservation.reservationDate, reservationTime: reservation.reservationTime, reason: "" };
    const reason = draft.reason.trim();
    if (!reason) {
      toast({ title: "Justificativa obrigatoria", description: "Escreva o motivo da remarcacao.", variant: "destructive" });
      return;
    }
    const response = await rescheduleMutation.mutateAsync({ reservationId: reservation.id, ...draft, reason });
    const email = buildAdminRescheduleEmail(response.reservation.serviceName, response.reservation.barberName, response.reservation.reservationDate, response.reservation.reservationTime, reason);
    await notify(reservation.customerEmail, email.subject, email.text, "Remarcado sem notificacao");
    setRescheduleInputs((current) => ({ ...current, [reservation.id]: { ...draft, reason: "" } }));
    toast({ title: "Agendamento remarcado", description: "Horario atualizado com sucesso." });
  };

  const handleUpdateUser = async (account: User) => {
    const draft = getUserDraft(account);
    await updateUserMutation.mutateAsync({ userId: account.id, draft });
    toast({ title: "Perfil atualizado", description: `Perfil de ${account.name} atualizado.` });
  };

  const handleSaveSiteContent = async () => {
    const draft = getSiteContentDraft();

    if (!draft) {
      return;
    }

    const normalizedSchedules = Object.fromEntries(
      draft.barbers.map((barber) => [
        barber,
        (barberScheduleDrafts[barber] ?? "")
          .split(",")
          .map((slot) => slot.trim())
          .filter((slot) => /^\d{2}:\d{2}$/.test(slot)),
      ]),
    );

    await updateSiteContentMutation.mutateAsync({
      ...draft,
      barberSchedules: normalizedSchedules,
    });
    toast({ title: "Conteudo atualizado", description: "As informacoes do site foram salvas." });
  };

  const updateSiteDraft = (updater: (draft: SiteContentDraft) => SiteContentDraft) => {
    setSiteContentDraft((current) => {
      const base = current ?? siteContentQuery.data;

      if (!base) {
        return current;
      }

      return updater(base);
    });
  };

  const updateServiceDraft = (index: number, patch: Partial<SiteEditableService>) => {
    updateSiteDraft((draft) => ({
      ...draft,
      services: draft.services.map((service, serviceIndex) =>
        serviceIndex === index ? { ...service, ...patch } : service,
      ),
    }));
  };

  const updateBarberScheduleDraft = (barberName: string, value: string) => {
    setBarberScheduleDrafts((current) => ({
      ...current,
      [barberName]: value,
    }));
  };

  const handleHeroImageUpload = async (file: File | null) => {
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast({ title: "Arquivo invalido", description: "Escolha uma imagem valida para a capa.", variant: "destructive" });
      return;
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error("Nao foi possivel ler a imagem selecionada."));
      reader.readAsDataURL(file);
    });

    updateSiteDraft((draft) => ({ ...draft, heroImageUrl: dataUrl }));
    toast({ title: "Imagem carregada", description: "A nova capa foi preparada para salvar." });
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-background pb-12 pt-28 sm:pt-20">
      <nav className="fixed left-0 right-0 top-0 z-50 border-b border-border bg-background/90 backdrop-blur-sm">
        <div className="container mx-auto flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <Link to="/" className="font-display text-xl font-bold tracking-wide text-primary sm:text-2xl">BARBEARIA <span className="text-foreground">RAMOS</span></Link>
          <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto sm:justify-end sm:gap-4">
            <span className="inline-flex items-center gap-2 text-xs text-muted-foreground sm:text-sm"><ShieldCheck className="h-4 w-4 text-primary" /> Admin</span>
            <img src={user.avatarUrl} alt={user.name} className="h-8 w-8 rounded-full" />
            <span className="max-w-[10rem] truncate text-xs font-medium sm:max-w-none sm:text-sm">{user.name}</span>
            <button onClick={() => void logout()} className="text-xs text-muted-foreground transition-colors hover:text-foreground sm:text-sm">Sair</button>
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
            {(["agenda", "users", "dashboard", "site"] as AdminView[]).map((item) => (
              <button key={item} onClick={() => setView(item)} className={`rounded-md border px-4 py-2 text-sm ${view === item ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"}`}>
                {item === "agenda" ? "Agenda" : item === "users" ? "Contas" : item === "dashboard" ? "Dashboard" : "Site"}
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
                <div className="space-y-6">
                  {agendaSummary.byBarber.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {agendaSummary.byBarber.map(({ barber, reservations, pending, completed, cancelled }) => (
                        <button
                          key={barber}
                          onClick={() => setActiveBarberTab(barber)}
                          className={`rounded-md border px-4 py-3 text-left text-sm transition-colors ${
                            activeBarberTab === barber
                              ? "border-primary bg-primary/10 text-foreground"
                              : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                          }`}
                        >
                          <span className="block font-semibold">{barber}</span>
                          <span className="mt-1 block text-xs uppercase tracking-widest">
                            {reservations.length} agendamento(s)
                          </span>
                          <span className="mt-1 block text-[11px] uppercase tracking-widest opacity-80">
                            P {pending} • R {completed} • C {cancelled}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {agendaSummary.byBarber
                    .filter(({ barber }) => barber === activeBarberTab)
                    .map(({ barber, reservations, pending, completed, cancelled }) => (
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
                          const draft = rescheduleInputs[reservation.id] ?? { barberName: reservation.barberName, reservationDate: reservation.reservationDate, reservationTime: reservation.reservationTime, reason: "" };
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
                                {reservation.rescheduleReason ? <span>Motivo da remarcacao: {reservation.rescheduleReason}</span> : null}
                                {reservation.rescheduledByEmail ? <span>Remarcado por: {reservation.rescheduledByEmail}</span> : null}
                              </div>
                              {!isCancelled ? (
                                <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.9fr]">
                                  <div className="space-y-3 rounded-lg border border-border bg-card/70 p-4">
                                    <p className="text-sm font-semibold text-foreground">Remarcar</p>
                                    <div className="grid gap-3 md:grid-cols-3">
                                      <select value={draft.barberName} onChange={(event) => setRescheduleInputs((current) => ({ ...current, [reservation.id]: { ...draft, barberName: event.target.value } }))} className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none">{editableBarbers.map((option) => <option key={option} value={option}>{option}</option>)}</select>
                                      <input type="date" value={draft.reservationDate} onChange={(event) => setRescheduleInputs((current) => ({ ...current, [reservation.id]: { ...draft, reservationDate: event.target.value } }))} className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
                                      <select value={draft.reservationTime} onChange={(event) => setRescheduleInputs((current) => ({ ...current, [reservation.id]: { ...draft, reservationTime: event.target.value } }))} className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none">{getBarberScheduleOptions(draft.barberName).map((slot) => <option key={slot} value={slot}>{slot}</option>)}</select>
                                    </div>
                                    <textarea value={draft.reason} onChange={(event) => setRescheduleInputs((current) => ({ ...current, [reservation.id]: { ...draft, reason: event.target.value } }))} rows={3} placeholder="Justificativa obrigatoria para remarcar este agendamento" className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none" />
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
                  {agendaSummary.byBarber.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border bg-background/40 p-4 text-sm text-muted-foreground">
                      Nenhum colaborador ou agendamento encontrado para esta data.
                    </div>
                  ) : null}
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
                        <div>
                          <label className="mb-2 block text-sm font-medium text-foreground">Tipo de acesso</label>
                          <select value={draft.role} onChange={(event) => setUserDrafts((current) => ({ ...current, [account.id]: { ...draft, role: event.target.value as User["role"] } }))} className="w-full rounded-lg border border-border bg-background px-3 py-3 text-sm text-foreground focus:border-primary focus:outline-none">
                            <option value="customer">Cliente</option><option value="collaborator">Colaborador</option><option value="admin">Admin</option>
                          </select>
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-medium text-foreground">Barbeiro vinculado</label>
                          <select value={draft.barberName} onChange={(event) => setUserDrafts((current) => ({ ...current, [account.id]: { ...draft, barberName: event.target.value } }))} disabled={draft.role !== "collaborator"} className="w-full rounded-lg border border-border bg-background px-3 py-3 text-sm text-foreground focus:border-primary focus:outline-none disabled:opacity-50">
                            <option value="">Selecione o barbeiro</option>{editableBarbers.map((barber) => <option key={barber} value={barber}>{barber}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-medium text-foreground">Telefone</label>
                          <input value={draft.phone} onChange={(event) => setUserDrafts((current) => ({ ...current, [account.id]: { ...draft, phone: event.target.value } }))} className="w-full rounded-lg border border-border bg-background px-3 py-3 text-sm text-foreground focus:border-primary focus:outline-none" />
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-medium text-foreground">URL da foto</label>
                          <input value={draft.photoUrl} onChange={(event) => setUserDrafts((current) => ({ ...current, [account.id]: { ...draft, photoUrl: event.target.value } }))} className="w-full rounded-lg border border-border bg-background px-3 py-3 text-sm text-foreground focus:border-primary focus:outline-none" />
                        </div>
                        <div className="md:col-span-2">
                          <label className="mb-2 block text-sm font-medium text-foreground">Observacoes internas</label>
                          <textarea value={draft.notes} onChange={(event) => setUserDrafts((current) => ({ ...current, [account.id]: { ...draft, notes: event.target.value } }))} rows={3} className="w-full rounded-lg border border-border bg-background px-3 py-3 text-sm text-foreground focus:border-primary focus:outline-none" />
                        </div>
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
                  <div className="rounded-xl border border-border bg-card p-5">
                    <div className="mb-4 flex items-center justify-between"><h3 className="font-display text-2xl font-bold">Lucro</h3><Wallet className="h-5 w-5 text-primary" /></div>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p className="font-display text-3xl font-bold text-foreground">{formatCurrency(dashboardQuery.data?.summary.totalProfit ?? 0)}</p>
                      <p>Lucro bruto do periodo filtrado.</p>
                    </div>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-5">
                    <div className="mb-4 flex items-center justify-between"><h3 className="font-display text-2xl font-bold">Concluidos</h3><CheckCircle2 className="h-5 w-5 text-emerald-300" /></div>
                    <p className="font-display text-3xl font-bold text-foreground">{dashboardQuery.data?.summary.completedCount ?? 0}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-5">
                    <div className="mb-4 flex items-center justify-between"><h3 className="font-display text-2xl font-bold">Pendentes</h3><RefreshCcw className="h-5 w-5 text-primary" /></div>
                    <p className="font-display text-3xl font-bold text-foreground">{dashboardQuery.data?.summary.pendingCount ?? 0}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-5">
                    <div className="mb-4 flex items-center justify-between"><h3 className="font-display text-2xl font-bold">Cancelados</h3><XCircle className="h-5 w-5 text-destructive" /></div>
                    <p className="font-display text-3xl font-bold text-foreground">{dashboardQuery.data?.summary.cancelledCount ?? 0}</p>
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-card p-5">
                  <div className="mb-5">
                    <h3 className="font-display text-2xl font-bold">Grafico por colaborador</h3>
                    <p className="text-sm text-muted-foreground">Comparativo visual de lucro bruto e atendimentos concluidos por barbeiro.</p>
                  </div>
                  <ChartContainer config={dashboardChartConfig} className="h-[320px] w-full">
                    <BarChart data={dashboardChartData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="barberName"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={10}
                      />
                      <YAxis yAxisId="left" tickLine={false} axisLine={false} tickMargin={10} />
                      <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} tickMargin={10} />
                      <ChartTooltip
                        cursor={false}
                        content={
                          <ChartTooltipContent
                            formatter={(value, name) => (
                              <div className="flex min-w-[10rem] items-center justify-between gap-3">
                                <span>{name === "lucro" ? "Lucro bruto" : "Concluidos"}</span>
                                <span className="font-mono font-medium text-foreground">
                                  {name === "lucro" ? formatCurrency(Number(value)) : Number(value)}
                                </span>
                              </div>
                            )}
                          />
                        }
                      />
                      <Bar yAxisId="left" dataKey="lucro" fill="var(--color-lucro)" radius={[6, 6, 0, 0]} />
                      <Bar yAxisId="right" dataKey="concluidos" fill="var(--color-concluidos)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {(dashboardQuery.data?.stats ?? []).map((stat) => (
                    <div key={stat.barberName} className="rounded-xl border border-border bg-card p-5">
                      <div className="mb-4 flex items-center justify-between"><h3 className="font-display text-2xl font-bold">{stat.barberName}</h3><Wallet className="h-5 w-5 text-primary" /></div>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <p>Rendimento: {formatCurrency(stat.totalRevenue)}</p>
                        <p>Lucro bruto: {formatCurrency(stat.totalRevenue)}</p>
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

        {view === "site" ? (
          <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="font-display text-3xl font-bold">Conteudo do site</h2>
                <p className="text-muted-foreground">Edite os textos principais da home sem mexer no codigo.</p>
              </div>
              <button
                onClick={() => void handleSaveSiteContent()}
                disabled={updateSiteContentMutation.isPending || siteContentQuery.isLoading}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-border px-4 py-3 text-sm text-foreground hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <UserCog className="h-4 w-4" /> Salvar alteracoes
              </button>
            </div>

            {siteContentQuery.isLoading || !siteDraft ? (
              <div className="flex items-center gap-2 text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin" /> Carregando conteudo...</div>
            ) : (
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-xl border border-border bg-card p-5">
                  <h3 className="mb-4 font-display text-2xl font-bold">Hero</h3>
                  <div className="grid gap-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-foreground">Titulo principal</label>
                      <input value={siteDraft.heroTitle} onChange={(event) => updateSiteDraft((draft) => ({ ...draft, heroTitle: event.target.value }))} className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none" />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-foreground">Subtitulo principal</label>
                      <textarea value={siteDraft.heroSubtitle} onChange={(event) => updateSiteDraft((draft) => ({ ...draft, heroSubtitle: event.target.value }))} rows={3} className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none" />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-foreground">Texto do botao principal</label>
                      <input value={siteDraft.heroPrimaryCta} onChange={(event) => updateSiteDraft((draft) => ({ ...draft, heroPrimaryCta: event.target.value }))} className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none" />
                    </div>
                    <div className="rounded-lg border border-border bg-background/60 p-4">
                      <label className="mb-3 block text-sm font-medium text-foreground">Imagem principal da home</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(event) => void handleHeroImageUpload(event.target.files?.[0] ?? null)}
                        className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border-0 file:bg-foreground file:px-4 file:py-2 file:text-sm file:font-semibold file:text-background hover:file:bg-foreground/80"
                      />
                      <input value={siteDraft.heroImageUrl} onChange={(event) => updateSiteDraft((draft) => ({ ...draft, heroImageUrl: event.target.value }))} placeholder="Ou cole uma URL publica da imagem" className="mt-4 w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none" />
                      {siteDraft.heroImageUrl ? (
                        <img src={siteDraft.heroImageUrl} alt="Preview da capa" className="mt-4 h-40 w-full rounded-lg object-cover" />
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-5">
                  <h3 className="mb-4 font-display text-2xl font-bold">Servicos</h3>
                  <div className="grid gap-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-foreground">Linha de apoio</label>
                      <input value={siteDraft.servicesEyebrow} onChange={(event) => updateSiteDraft((draft) => ({ ...draft, servicesEyebrow: event.target.value }))} className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none" />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-foreground">Titulo da secao</label>
                      <input value={siteDraft.servicesTitle} onChange={(event) => updateSiteDraft((draft) => ({ ...draft, servicesTitle: event.target.value }))} className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none" />
                    </div>
                    <div className="grid gap-3">
                      {siteDraft.services.map((service, index) => (
                        <div key={`site-service-${index}`} className="rounded-lg border border-border bg-background/60 p-4">
                          <div className="grid gap-3 md:grid-cols-2">
                            <div>
                              <label className="mb-2 block text-sm font-medium text-foreground">Nome do servico</label>
                              <input value={service.name} onChange={(event) => updateServiceDraft(index, { name: event.target.value })} className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none" />
                            </div>
                            <div>
                              <label className="mb-2 block text-sm font-medium text-foreground">ID interno</label>
                              <input value={service.id} onChange={(event) => updateServiceDraft(index, { id: event.target.value })} className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none" />
                            </div>
                            <div>
                              <label className="mb-2 block text-sm font-medium text-foreground">Preco</label>
                              <input type="number" min="0" step="0.01" value={service.price} onChange={(event) => updateServiceDraft(index, { price: Number(event.target.value) })} className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none" />
                            </div>
                            <div>
                              <label className="mb-2 block text-sm font-medium text-foreground">Duracao em minutos</label>
                              <input type="number" min="5" step="5" value={service.durationMinutes} onChange={(event) => updateServiceDraft(index, { durationMinutes: Number(event.target.value) })} className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none" />
                            </div>
                          </div>
                          <button onClick={() => updateSiteDraft((draft) => ({ ...draft, services: draft.services.filter((_, itemIndex) => itemIndex !== index) }))} className="mt-3 text-sm text-destructive transition-colors hover:text-destructive/80">Remover servico</button>
                        </div>
                      ))}
                      <button onClick={() => updateSiteDraft((draft) => ({ ...draft, services: [...draft.services, { id: `servico-${draft.services.length + 1}`, name: "", price: 0, durationMinutes: 30 }] }))} className="inline-flex items-center justify-center rounded-md border border-border px-4 py-3 text-sm text-foreground hover:border-primary/40">Adicionar servico</button>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-5">
                  <h3 className="mb-4 font-display text-2xl font-bold">Contato</h3>
                  <div className="grid gap-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-foreground">Linha de apoio</label>
                      <input value={siteDraft.contactEyebrow} onChange={(event) => updateSiteDraft((draft) => ({ ...draft, contactEyebrow: event.target.value }))} className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none" />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-foreground">Titulo da secao</label>
                      <input value={siteDraft.contactTitle} onChange={(event) => updateSiteDraft((draft) => ({ ...draft, contactTitle: event.target.value }))} className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none" />
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-foreground">Rotulo do endereco</label>
                        <input value={siteDraft.addressLabel} onChange={(event) => updateSiteDraft((draft) => ({ ...draft, addressLabel: event.target.value }))} className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none" />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-foreground">Texto do endereco</label>
                        <input value={siteDraft.addressText} onChange={(event) => updateSiteDraft((draft) => ({ ...draft, addressText: event.target.value }))} className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none" />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-foreground">Rotulo do telefone</label>
                        <input value={siteDraft.phoneLabel} onChange={(event) => updateSiteDraft((draft) => ({ ...draft, phoneLabel: event.target.value }))} className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none" />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-foreground">Telefone</label>
                        <input value={siteDraft.phoneText} onChange={(event) => updateSiteDraft((draft) => ({ ...draft, phoneText: event.target.value }))} className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none" />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-foreground">Rotulo do horario</label>
                        <input value={siteDraft.hoursLabel} onChange={(event) => updateSiteDraft((draft) => ({ ...draft, hoursLabel: event.target.value }))} className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none" />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-foreground">Horario de funcionamento</label>
                        <input value={siteDraft.hoursText} onChange={(event) => updateSiteDraft((draft) => ({ ...draft, hoursText: event.target.value }))} className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none" />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-foreground">Instagram</label>
                        <input value={siteDraft.socialLinks.instagram} onChange={(event) => updateSiteDraft((draft) => ({ ...draft, socialLinks: { ...draft.socialLinks, instagram: event.target.value } }))} className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none" />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-foreground">Facebook</label>
                        <input value={siteDraft.socialLinks.facebook} onChange={(event) => updateSiteDraft((draft) => ({ ...draft, socialLinks: { ...draft.socialLinks, facebook: event.target.value } }))} className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="mb-2 block text-sm font-medium text-foreground">WhatsApp</label>
                        <input value={siteDraft.socialLinks.whatsapp} onChange={(event) => updateSiteDraft((draft) => ({ ...draft, socialLinks: { ...draft.socialLinks, whatsapp: event.target.value } }))} className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-5">
                  <h3 className="mb-4 font-display text-2xl font-bold">Barbeiros e rodape</h3>
                  <div className="grid gap-4">
                    <div className="grid gap-3">
                      {siteDraft.barbers.map((barber, index) => (
                        <div key={`site-barber-${index}`} className="flex flex-col gap-3 rounded-lg border border-border bg-background/60 p-4 sm:flex-row sm:items-end">
                          <div className="flex-1">
                            <label className="mb-2 block text-sm font-medium text-foreground">Nome do barbeiro</label>
                            <input value={barber} onChange={(event) => {
                              const nextName = event.target.value;
                              setBarberScheduleDrafts((current) => {
                                const currentDraft = current[barber] ?? (siteDraft?.barberSchedules?.[barber] ?? []).join(", ");
                                const nextDrafts = { ...current };

                                if (barber !== nextName) {
                                  delete nextDrafts[barber];
                                }

                                if (nextName) {
                                  nextDrafts[nextName] = currentDraft;
                                }

                                return nextDrafts;
                              });

                              updateSiteDraft((draft) => {
                                const nextBarbers = draft.barbers.map((item, itemIndex) => itemIndex === index ? nextName : item);
                                const currentSchedule = draft.barberSchedules[barber] ?? [];
                                const nextSchedules = { ...draft.barberSchedules };

                                if (barber !== nextName) {
                                  delete nextSchedules[barber];
                                }

                                if (nextName) {
                                  nextSchedules[nextName] = currentSchedule;
                                }

                                return {
                                  ...draft,
                                  barbers: nextBarbers,
                                  barberSchedules: nextSchedules,
                                };
                              });
                            }} className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none" />
                          </div>
                          <button onClick={() => {
                            setBarberScheduleDrafts((current) => {
                              const nextDrafts = { ...current };
                              delete nextDrafts[barber];
                              return nextDrafts;
                            });

                            updateSiteDraft((draft) => {
                              const nextBarbers = draft.barbers.filter((_, itemIndex) => itemIndex !== index);
                              const nextSchedules = { ...draft.barberSchedules };
                              delete nextSchedules[barber];
                              return { ...draft, barbers: nextBarbers, barberSchedules: nextSchedules };
                            });
                          }} className="text-sm text-destructive transition-colors hover:text-destructive/80">Remover</button>
                        </div>
                      ))}
                      <button onClick={() => {
                        const newBarberName = `Novo barbeiro ${(siteDraft?.barbers.length ?? 0) + 1}`;
                        const defaultSchedule = "09:00, 09:30, 10:00, 10:30, 11:00, 11:30";

                        setBarberScheduleDrafts((current) => ({
                          ...current,
                          [newBarberName]: defaultSchedule,
                        }));

                        updateSiteDraft((draft) => ({
                          ...draft,
                          barbers: [...draft.barbers, newBarberName],
                          barberSchedules: {
                            ...draft.barberSchedules,
                            [newBarberName]: ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30"],
                          },
                        }));
                      }} className="inline-flex items-center justify-center rounded-md border border-border px-4 py-3 text-sm text-foreground hover:border-primary/40">Adicionar barbeiro</button>
                    </div>
                    <div className="grid gap-3">
                      <label className="text-sm font-medium text-foreground">Horarios por colaborador</label>
                      {siteDraft.barbers.map((barber, index) => (
                        <div key={`site-barber-schedule-${index}`} className="rounded-lg border border-border bg-background/60 p-4">
                          <label className="mb-2 block text-sm font-medium text-foreground">{barber || `Barbeiro ${index + 1}`}</label>
                          <textarea
                            value={getBarberScheduleDraft(barber)}
                            onChange={(event) => updateBarberScheduleDraft(barber, event.target.value)}
                            rows={3}
                            className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none"
                          />
                          <p className="mt-2 text-xs text-muted-foreground">
                            Digite os horarios separados por virgula. Exemplo: 09:00, 09:30, 10:00
                          </p>
                        </div>
                      ))}
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-foreground">Texto do rodape</label>
                      <textarea value={siteDraft.footerText} onChange={(event) => updateSiteDraft((draft) => ({ ...draft, footerText: event.target.value }))} rows={4} className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default AdminAgendamentos;
