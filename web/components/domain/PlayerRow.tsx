import { Avatar } from "../ui/Avatar";
import { Badge } from "../ui/Badge";

type BadgeStatus = "Confirmado" | "Pendente" | "Espera" | "Recusado" | "Organizador";

interface PlayerRowProps {
  nome: string;
  posicao: string;
  iniciais?: string;
  avatarSrc?: string;
  status: BadgeStatus;
  className?: string;
}

export function PlayerRow({ nome, posicao, iniciais, avatarSrc, status, className }: PlayerRowProps) {
  return (
    <div
      className={[
        "flex gap-[var(--space-md)] items-center py-[var(--space-sm)] w-full",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Avatar iniciais={iniciais ?? nome.slice(0, 2).toUpperCase()} src={avatarSrc} size="MD" />

      <div className="flex flex-col min-w-0 flex-1">
        <p className="text-body-strong text-text-primary truncate">{nome}</p>
        <p className="text-caption-regular text-text-muted">{posicao}</p>
      </div>

      <Badge status={status} className="shrink-0" />
    </div>
  );
}
