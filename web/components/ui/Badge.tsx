type Status = "Confirmado" | "Pendente" | "Espera" | "Recusado" | "Organizador";

interface BadgeProps {
  status: Status;
  className?: string;
}

const labelMap: Record<Status, string> = {
  Confirmado: "Confirmado",
  Pendente: "Pendente",
  Espera: "Lista de espera",
  Recusado: "Recusado",
  Organizador: "Organizador",
};

const colorClass: Record<Status, string> = {
  Confirmado: "bg-status-success-subtle text-status-success",
  Pendente: "bg-status-warning-subtle text-status-warning",
  Espera: "bg-status-info-subtle text-status-info",
  Recusado: "bg-status-danger-subtle text-status-danger",
  Organizador: "bg-accent-subtle text-accent-default",
};

export function Badge({ status, className }: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center px-[var(--space-md)] py-[var(--space-xs)] rounded-full",
        "text-caption-strong whitespace-nowrap",
        colorClass[status],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {labelMap[status]}
    </span>
  );
}
