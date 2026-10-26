import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={[
        "flex flex-col items-center gap-[var(--space-lg)] py-[var(--space-3xl)] text-center px-[var(--space-lg)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {Icon && (
        <div className="flex size-12 items-center justify-center rounded-full bg-bg-raised">
          <Icon size={22} className="text-text-muted" aria-hidden />
        </div>
      )}
      <div className="flex flex-col gap-[var(--space-xs)]">
        <p className="text-body-strong text-text-primary">{title}</p>
        {description && (
          <p className="text-caption-regular text-text-muted">{description}</p>
        )}
      </div>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="h-[44px] px-[var(--space-lg)] rounded-[var(--radius-md)] bg-accent-default text-body-strong text-text-on-accent"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
