import { Scissors } from "lucide-react";

export const services = [
  { id: "corte", name: "Corte Clássico", price: "R$ 45", duration: "30 min", icon: Scissors },
  { id: "barba", name: "Barba Completa", price: "R$ 35", duration: "25 min", icon: Scissors },
  { id: "combo", name: "Corte + Barba", price: "R$ 70", duration: "50 min", icon: Scissors },
  { id: "pigmentacao", name: "Pigmentação", price: "R$ 60", duration: "40 min", icon: Scissors },
  { id: "sobrancelha", name: "Sobrancelha", price: "R$ 20", duration: "15 min", icon: Scissors },
  { id: "hidratacao", name: "Hidratação Capilar", price: "R$ 50", duration: "30 min", icon: Scissors },
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
