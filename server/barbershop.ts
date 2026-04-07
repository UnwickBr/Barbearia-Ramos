export const services = [
  { id: "corte", name: "Corte Clássico", price: 45, duration: 30 },
  { id: "barba", name: "Barba Completa", price: 35, duration: 25 },
  { id: "combo", name: "Corte + Barba", price: 70, duration: 50 },
  { id: "pigmentacao", name: "Pigmentação", price: 60, duration: 40 },
  { id: "sobrancelha", name: "Sobrancelha", price: 20, duration: 15 },
  { id: "hidratacao", name: "Hidratação Capilar", price: 50, duration: 30 },
] as const;

export const barbers = ["Carlos", "Rafael", "André", "Lucas"] as const;

export const timeSlots = [
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
  "18:00",
  "18:30",
  "19:00",
  "19:30",
] as const;

export const servicesById = Object.fromEntries(services.map((service) => [service.id, service])) as Record<string, (typeof services)[number]>;
