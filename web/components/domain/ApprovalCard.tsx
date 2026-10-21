import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";
import { RoleChip } from "../ui/RoleChip";

type PlayRole = "Linha" | "Goleiro";

interface ApprovalCardProps {
  nome: string;
  detalhe: string;
  iniciais?: string;
  avatarSrc?: string;
  funcao: PlayRole;
  onAprovar?: () => void;
  onRecusar?: () => void;
  className?: string;
}

export function ApprovalCard({
  nome,
  detalhe,
  iniciais,
  avatarSrc,
  funcao,
  onAprovar,
  onRecusar,
  className,
}: ApprovalCardProps) {
  return (
    <div
      className={[
        "bg-bg-surface border border-border-default rounded-lg",
        "flex flex-col gap-[var(--space-lg)] p-[var(--space-lg)] w-full",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Informações do solicitante */}
      <div className="flex gap-[var(--space-md)] items-center">
        <Avatar iniciais={iniciais ?? nome.slice(0, 2).toUpperCase()} src={avatarSrc} size="MD" />

        <div className="flex flex-col min-w-0 flex-1">
          <p className="text-body-strong text-text-primary truncate">{nome}</p>
          <p className="text-caption-regular text-text-muted">{detalhe}</p>
        </div>

        <RoleChip funcao={funcao} className="shrink-0" />
      </div>

      {/* Ações */}
      <div className="flex gap-[var(--space-md)]">
        <Button
          variant="Primary"
          size="Small"
          className="flex-1"
          onClick={onAprovar}
        >
          Aprovar
        </Button>
        <Button
          variant="Secondary"
          size="Small"
          className="flex-1"
          onClick={onRecusar}
        >
          Recusar
        </Button>
      </div>
    </div>
  );
}
