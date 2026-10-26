"use client";

import { Hand, Users } from "lucide-react";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";

function RoleChip({ playRole }: { playRole: "LINE" | "GOALKEEPER" }) {
  const isGk = playRole === "GOALKEEPER";
  const Icon = isGk ? Hand : Users;
  const label = isGk ? "Goleiro" : "Linha";
  return (
    <span
      className={[
        "inline-flex items-center gap-[var(--space-xs)] px-[var(--space-sm)] py-[var(--space-xs)] rounded-full text-caption-strong shrink-0",
        isGk
          ? "bg-accent-default text-text-on-accent"
          : "bg-bg-raised text-text-secondary",
      ].join(" ")}
    >
      <Icon size={12} aria-hidden />
      {label}
    </span>
  );
}

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
  subtitle?: string;
  onApprove?: () => void;
  onReject?: () => void;
  onPromote?: () => void;
  isLoading?: boolean;
}

export function ApprovalCard({
  member,
  subtitle,
  onApprove,
  onReject,
  onPromote,
  isLoading = false,
}: ApprovalCardProps) {
  const iniciais = member.user.name
    .split(" ")
    .slice(0, 2)
    .map((word: string) => word[0])
    .join("")
    .toUpperCase();

  return (
    <div className="bg-bg-surface border border-border-default rounded-lg flex flex-col gap-[var(--space-lg)] p-[var(--space-lg)] w-full">
      {/* Top: Avatar + name/subtitle + RoleChip */}
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
          {subtitle ? (
            <p className="text-caption-regular text-text-muted">{subtitle}</p>
          ) : member.user.nickname ? (
            <p className="text-caption-regular text-text-muted">
              @{member.user.nickname}
            </p>
          ) : null}
        </div>
        <RoleChip playRole={member.playRole} />
      </div>

      {/* Actions */}
      {member.status === "PENDING" && (
        <div className="flex gap-[var(--space-md)]">
          <Button
            variant="Primary"
            size="Small"
            className="flex-1"
            onClick={onApprove}
            disabled={isLoading}
          >
            Aprovar
          </Button>
          <Button
            variant="Secondary"
            size="Small"
            className="flex-1"
            onClick={onReject}
            disabled={isLoading}
          >
            Recusar
          </Button>
        </div>
      )}

      {member.status === "WAITLIST" && (
        <div className="flex flex-col gap-[var(--space-sm)]">
          {member.waitlistPosition !== null && (
            <p className="text-caption-regular text-text-secondary">
              Fila de espera: #{member.waitlistPosition}
            </p>
          )}
          {onPromote && (
            <Button
              variant="Secondary"
              size="Small"
              onClick={onPromote}
              disabled={isLoading}
            >
              Promover
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
