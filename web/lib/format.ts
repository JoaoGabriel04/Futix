import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function formatRoomDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  // ptBR returns "sáb., 25 out. · 16:00" → want "Sáb, 25 out · 16:00"
  return format(d, "EEE, d MMM '·' HH:mm", { locale: ptBR })
    .replace(/\./g, "")
    .replace(/^(.)/, (c) => c.toUpperCase());
}
