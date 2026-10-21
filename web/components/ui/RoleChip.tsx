import { Hand, Users } from "lucide-react";

type PlayRole = "Linha" | "Goleiro";

interface RoleChipProps {
  funcao: PlayRole;
  className?: string;
}

export function RoleChip({ funcao, className }: RoleChipProps) {
  const isGoleiro = funcao === "Goleiro";

  return (
    <span
      className={[
        "inline-flex items-center gap-[var(--space-xs)] px-[var(--space-md)] py-[var(--space-xs)]",
        "rounded-full border text-caption-strong whitespace-nowrap",
        isGoleiro
          ? "bg-accent-subtle border-accent-default text-accent-default"
          : "bg-bg-raised border-border-default text-text-secondary",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {isGoleiro ? <Hand size={12} aria-hidden /> : <Users size={12} aria-hidden />}
      {funcao}
    </span>
  );
}
