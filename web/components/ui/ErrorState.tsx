import { AlertCircle } from "lucide-react";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  message = "Algo deu errado.",
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={[
        "flex flex-col items-center gap-[var(--space-lg)] py-[var(--space-3xl)] text-center px-[var(--space-lg)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-status-danger-subtle">
        <AlertCircle size={22} className="text-status-danger" aria-hidden />
      </div>
      <div className="flex flex-col gap-[var(--space-xs)]">
        <p className="text-body-strong text-text-primary">Erro ao carregar</p>
        <p className="text-caption-regular text-text-muted">{message}</p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="h-[44px] px-[var(--space-lg)] rounded-[var(--radius-md)] border border-border-default bg-bg-raised text-body-strong text-text-primary"
        >
          Tentar novamente
        </button>
      )}
    </div>
  );
}
