"use client";

import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";

interface ApprovalCardProps {
  member: {
    id: string;
    userId: string;
    role: "PLAYER" | "ORGANIZER" | "CO_ORGANIZER";
    status: "PENDING" | "CONFIRMED" | "WAITLIST" | "REJECTED" | "LEFT";
    playRole: "LINE" | "GOALKEEPER";
    waitlistPosition: number | null;
    user: {
      name: string;
      nickname: string | null;
      avatarUrl: string | null;
      preferredPosition: string | null;
    };
  };
  onApprove?: () => void;
  onReject?: () => void;
  isLoading?: boolean;
}

// Map playRole enum to display text
const playRoleDisplay = (role: "LINE" | "GOALKEEPER"): string => {
  return role === "GOALKEEPER" ? "Goleiro" : "Linha";
};

// Map status to badge text
const statusDisplay = (
  status: "PENDING" | "CONFIRMED" | "WAITLIST" | "REJECTED" | "LEFT"
): string => {
  const statusMap = {
    PENDING: "Aguardando",
    CONFIRMED: "Confirmado",
    WAITLIST: "Fila de espera",
    REJECTED: "Rejeitado",
    LEFT: "Saiu",
  };
  return statusMap[status];
};

// Map status to badge colors
const statusColor = (
  status: "PENDING" | "CONFIRMED" | "WAITLIST" | "REJECTED" | "LEFT"
): string => {
  const colorMap = {
    PENDING: "bg-status-warning-subtle text-status-warning",
    CONFIRMED: "bg-status-success-subtle text-status-success",
    WAITLIST: "bg-status-info-subtle text-status-info",
    REJECTED: "bg-status-danger-subtle text-status-danger",
    LEFT: "bg-bg-raised text-text-muted",
  };
  return colorMap[status];
};

export function ApprovalCard({
  member,
  onApprove,
  onReject,
  isLoading = false,
}: ApprovalCardProps) {
  const iniciais = member.user.name
    .split(" ")
    .slice(0, 2)
    .map((word: string) => word[0])
    .join("")
    .toUpperCase();

  return (
    <div
      className={[
        "bg-bg-surface border border-border-default rounded-lg",
        "flex flex-col gap-[var(--space-lg)] p-[var(--space-lg)] w-full",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Top section: Avatar, name, nickname, and status badge */}
      <div className="flex gap-[var(--space-md)] items-start">
        <Avatar
          iniciais={iniciais}
          src={member.user.avatarUrl ?? undefined}
          alt={member.user.name}
          size="MD"
        />

        <div className="flex flex-col min-w-0 flex-1">
          <p className="text-body-strong text-text-primary truncate">
            {member.user.name}
          </p>
          {member.user.nickname && (
            <p className="text-caption-regular text-text-muted">
              @{member.user.nickname}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-[var(--space-sm)] mt-[var(--space-xs)]">
            {member.user.preferredPosition && (
              <p className="text-caption-regular text-text-secondary">
                Posição: {member.user.preferredPosition}
              </p>
            )}
            <p className="text-caption-regular text-text-secondary">
              Função: {playRoleDisplay(member.playRole)}
            </p>
          </div>
        </div>

        <span
          className={[
            "inline-flex items-center px-[var(--space-md)] py-[var(--space-xs)] rounded-full",
            "text-caption-strong whitespace-nowrap shrink-0",
            statusColor(member.status),
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {statusDisplay(member.status)}
        </span>
      </div>

      {/* Action buttons or waitlist position */}
      {member.status === "PENDING" && (
        <div className="flex gap-[var(--space-md)]">
          <Button
            variant="Secondary"
            size="Small"
            className="flex-1"
            onClick={onReject}
            disabled={isLoading}
          >
            Rejeitar
          </Button>
          <Button
            variant="Primary"
            size="Small"
            className="flex-1"
            onClick={onApprove}
            disabled={isLoading}
          >
            Aprovar
          </Button>
        </div>
      )}

      {member.status === "WAITLIST" && member.waitlistPosition !== null && (
        <p className="text-caption-regular text-text-secondary">
          Fila de espera: #{member.waitlistPosition}
        </p>
      )}
    </div>
  );
}
