import { MapPin, Users } from "lucide-react";
import { Badge } from "../ui/Badge";
import { Progress } from "../ui/Progress";

type BadgeStatus = "Confirmado" | "Pendente" | "Espera" | "Recusado" | "Organizador";

interface MatchCardProps {
  titulo: string;
  quando: string;
  local: string;
  vagas: string;
  status?: BadgeStatus;
  progressValue?: number; // 0–100
  isLive?: boolean;
  className?: string;
}

export function MatchCard({
  titulo,
  quando,
  local,
  vagas,
  status,
  progressValue = 0,
  isLive,
  className,
}: MatchCardProps) {
  return (
    <div
      className={[
        "bg-bg-surface border border-border-default rounded-lg",
        "flex flex-col gap-[var(--space-md)] p-[var(--space-lg)] w-full",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Header: título, quando e badge de status */}
      <div className="flex items-start justify-between gap-[var(--space-md)]">
        <div className="flex flex-col gap-[var(--space-xs)] overflow-hidden">
          <p className="text-heading-h3 text-text-primary truncate">{titulo}</p>
          <p className="text-caption-regular text-text-muted">{quando}</p>
        </div>
        <div className="flex gap-[var(--space-xs)] items-center shrink-0">
          {isLive && <Badge status="Ao vivo" />}
          {status && !isLive && <Badge status={status} />}
        </div>
      </div>

      {/* Detalhes: local e vagas */}
      <div className="flex gap-[var(--space-xl)] items-center">
        <span className="flex gap-[var(--space-xs)] items-center text-caption-regular text-text-secondary">
          <MapPin size={16} className="shrink-0" aria-hidden />
          {local}
        </span>
        <span className="flex gap-[var(--space-xs)] items-center text-caption-regular text-text-secondary">
          <Users size={16} className="shrink-0" aria-hidden />
          {vagas}
        </span>
      </div>

      {/* Barra de ocupação */}
      <Progress value={progressValue} />
    </div>
  );
}
