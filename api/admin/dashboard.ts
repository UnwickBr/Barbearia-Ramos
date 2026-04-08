import { barbers } from "../../server/barbershop.js";
import { ensureSchema, sql } from "../../server/db.js";
import { sendJson } from "../../server/http.js";
import type { ApiRequest, ApiResponse } from "../../server/types.js";
import { getAuthenticatedUser } from "../../server/user.js";

type DashboardRow = {
  barber_name: string;
  total_revenue: string | null;
  confirmed_count: number;
  completed_count: number;
  cancelled_count: number;
};

const startOfWeek = (date: Date) => {
  const result = new Date(date);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  return result;
};

const formatDate = (date: Date) => date.toISOString().slice(0, 10);

export default async function handler(req: ApiRequest, res: ApiResponse) {
  await ensureSchema();

  const user = await getAuthenticatedUser(req);

  if (!user) {
    return sendJson(res, 401, { error: "Faca login para continuar." });
  }

  if (!user.isAdmin) {
    return sendJson(res, 403, { error: "Acesso restrito a administradores." });
  }

  if (req.method !== "GET") {
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  const period = (Array.isArray(req.query?.period) ? req.query?.period[0] : req.query?.period) || "day";
  const dateInput = (Array.isArray(req.query?.date) ? req.query?.date[0] : req.query?.date) || new Date().toISOString().slice(0, 10);
  const baseDate = new Date(`${dateInput}T12:00:00`);

  if (Number.isNaN(baseDate.getTime())) {
    return sendJson(res, 400, { error: "Data invalida." });
  }

  let startDate = new Date(baseDate);
  let endDate = new Date(baseDate);

  if (period === "week") {
    startDate = startOfWeek(baseDate);
    endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
  } else if (period === "month") {
    startDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
    endDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
  }

  const start = formatDate(startDate);
  const end = formatDate(endDate);

  const rows = (await sql`
    SELECT
      barber_name,
      SUM(CASE WHEN status = 'completed' THEN service_price ELSE 0 END) AS total_revenue,
      COUNT(*) FILTER (WHERE status = 'confirmed')::int AS confirmed_count,
      COUNT(*) FILTER (WHERE status = 'completed')::int AS completed_count,
      COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled_count
    FROM reservations
    WHERE reservation_date BETWEEN ${start} AND ${end}
    GROUP BY barber_name
    ORDER BY barber_name ASC
  `) as DashboardRow[];

  const byBarber = Object.fromEntries(rows.map((row) => [row.barber_name, row]));

  const stats = barbers.map((barber) => {
    const row = byBarber[barber];
    return {
      barberName: barber,
      totalRevenue: Number(row?.total_revenue ?? 0),
      pendingCount: row?.confirmed_count ?? 0,
      completedCount: row?.completed_count ?? 0,
      cancelledCount: row?.cancelled_count ?? 0,
    };
  });

  const summary = stats.reduce(
    (accumulator, stat) => ({
      totalProfit: accumulator.totalProfit + stat.totalRevenue,
      pendingCount: accumulator.pendingCount + stat.pendingCount,
      completedCount: accumulator.completedCount + stat.completedCount,
      cancelledCount: accumulator.cancelledCount + stat.cancelledCount,
    }),
    {
      totalProfit: 0,
      pendingCount: 0,
      completedCount: 0,
      cancelledCount: 0,
    },
  );

  return sendJson(res, 200, {
    period,
    startDate: start,
    endDate: end,
    summary,
    stats,
  });
}
