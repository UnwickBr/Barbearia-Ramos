import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, BellRing } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { reservationsApi } from "@/lib/api";
import { formatReservationDate } from "@/lib/dates";
import type { Reservation } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  eventAt: string;
};

const getStorageKey = (userId: string) => `barbearia_ramos_notifications_seen_${userId}`;

const loadSeenNotifications = (userId: string) => {
  if (typeof window === "undefined") {
    return [] as string[];
  }

  try {
    const raw = window.localStorage.getItem(getStorageKey(userId));
    const parsed = raw ? (JSON.parse(raw) as string[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveSeenNotifications = (userId: string, notificationIds: string[]) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(getStorageKey(userId), JSON.stringify(notificationIds));
};

const buildNotifications = (reservations: Reservation[]) => {
  const notifications: NotificationItem[] = [];

  reservations.forEach((reservation) => {
    if (reservation.cancelledAt) {
      notifications.push({
        id: `${reservation.id}:cancelled:${reservation.cancelledAt}`,
        title: "Agendamento cancelado",
        message: [
          `${reservation.serviceName} com ${reservation.barberName}.`,
          `Data: ${formatReservationDate(reservation.reservationDate)} às ${reservation.reservationTime}.`,
          reservation.cancellationReason ? `Motivo: ${reservation.cancellationReason}` : null,
        ]
          .filter(Boolean)
          .join(" "),
        eventAt: reservation.cancelledAt,
      });
    }

    if (reservation.rescheduledAt) {
      notifications.push({
        id: `${reservation.id}:rescheduled:${reservation.rescheduledAt}`,
        title: "Agendamento remarcado",
        message: [
          `${reservation.serviceName} com ${reservation.barberName}.`,
          `Nova data: ${formatReservationDate(reservation.reservationDate)} às ${reservation.reservationTime}.`,
          reservation.rescheduleReason ? `Motivo: ${reservation.rescheduleReason}` : null,
        ]
          .filter(Boolean)
          .join(" "),
        eventAt: reservation.rescheduledAt,
      });
    }
  });

  return notifications.sort((first, second) => new Date(second.eventAt).getTime() - new Date(first.eventAt).getTime());
};

export const NotificationsBell = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [seenNotificationIds, setSeenNotificationIds] = useState<string[]>([]);

  const reservationsQuery = useQuery({
    queryKey: ["reservation-notifications", user?.id],
    queryFn: async () => (await reservationsApi.list()).reservations,
    enabled: Boolean(user),
    refetchInterval: 60000,
  });

  useEffect(() => {
    if (!user) {
      setSeenNotificationIds([]);
      return;
    }

    setSeenNotificationIds(loadSeenNotifications(user.id));
  }, [user]);

  const notifications = useMemo(
    () => buildNotifications(reservationsQuery.data ?? []),
    [reservationsQuery.data],
  );

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !seenNotificationIds.includes(notification.id)).length,
    [notifications, seenNotificationIds],
  );

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);

    if (nextOpen && user) {
      const nextSeenIds = Array.from(new Set([...seenNotificationIds, ...notifications.map((notification) => notification.id)]));
      setSeenNotificationIds(nextSeenIds);
      saveSeenNotifications(user.id, nextSeenIds);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed right-4 top-24 z-[60]">
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="pointer-events-auto relative h-12 w-12 rounded-full border-border bg-background/95 shadow-lg backdrop-blur-sm"
            aria-label="Abrir notificações"
          >
            {unreadCount > 0 ? <BellRing className="text-primary" /> : <Bell className="text-foreground" />}
            {unreadCount > 0 ? (
              <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            ) : null}
          </Button>
        </PopoverTrigger>

        <PopoverContent align="end" sideOffset={12} className="pointer-events-auto w-[min(24rem,calc(100vw-2rem))] border-border bg-card p-0">
          <div className="border-b border-border px-4 py-3">
            <p className="font-display text-lg font-semibold">Notificações</p>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Cancelamentos e remarcações</p>
          </div>

          <div className="max-h-[26rem] overflow-y-auto">
            {reservationsQuery.isLoading ? (
              <div className="px-4 py-6 text-sm text-muted-foreground">Carregando notificações...</div>
            ) : reservationsQuery.isError ? (
              <div className="px-4 py-6 text-sm text-destructive">
                {reservationsQuery.error instanceof Error ? reservationsQuery.error.message : "Não foi possível carregar as notificações."}
              </div>
            ) : notifications.length > 0 ? (
              <div className="divide-y divide-border">
                {notifications.map((notification) => {
                  const isUnread = !seenNotificationIds.includes(notification.id);

                  return (
                    <div key={notification.id} className={`px-4 py-4 ${isUnread ? "bg-primary/5" : ""}`}>
                      <div className="mb-1 flex items-start justify-between gap-3">
                        <p className="font-medium text-foreground">{notification.title}</p>
                        {isUnread ? <span className="mt-1 h-2.5 w-2.5 rounded-full bg-primary" /> : null}
                      </div>
                      <p className="text-sm leading-6 text-muted-foreground">{notification.message}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="px-4 py-6 text-sm text-muted-foreground">Nenhuma notificação por enquanto.</div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
