type Status = "Confirmado" | "Pendente" | "Espera" | "Recusado" | "Organizador" | "Ao vivo";

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
  "Ao vivo": "Ao vivo",
};

const colorClass: Record<Status, string> = {
  Confirmado: "bg-status-success-subtle text-status-success",
  Pendente: "bg-status-warning-subtle text-status-warning",
  Espera: "bg-status-info-subtle text-status-info",
  Recusado: "bg-status-danger-subtle text-status-danger",
  Organizador: "bg-accent-subtle text-accent-default",
  "Ao vivo": "bg-[var(--color-status-danger-subtle)] text-[var(--color-status-danger)]",
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
      {status === "Ao vivo" && (
        <span className="inline-block w-[6px] h-[6px] rounded-full bg-[var(--color-status-danger)] mr-[4px]" />
      )}
      {labelMap[status]}
    </span>
  );
}
