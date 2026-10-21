"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as Tabs from "@radix-ui/react-tabs";
import { ArrowLeft } from "lucide-react";
import { ApprovalCard } from "../../../../../components/domain/ApprovalCard";
import { useRoom } from "../../../../../hooks/useRoom";
import { apiFetch } from "../../../../../lib/api";

interface GestaoClientProps {
  id: string;
}

export function GestaoClient({ id }: GestaoClientProps) {
  const router = useRouter();
  const { room, isLoading, mutate } = useRoom(id);
  const [loadingMemberId, setLoadingMemberId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <p className="text-body-regular text-text-muted p-[var(--space-lg)]">
        Carregando...
      </p>
    );
  }

  if (!room) {
    return (
      <p className="text-body-regular text-text-muted p-[var(--space-lg)]">
        Sala não encontrada.
      </p>
    );
  }

  const pending = room.members.filter((m) => m.status === "PENDING");
  const confirmed = room.members.filter(
    (m) => m.status === "CONFIRMED" && m.role === "PLAYER",
  );
  const waitlist = room.members
    .filter((m) => m.status === "WAITLIST")
    .slice()
    .sort((a, b) => (a.waitlistPosition ?? 0) - (b.waitlistPosition ?? 0));

  async function handleAction(
    memberId: string,
    action: "approve" | "reject" | "promote",
  ) {
    setLoadingMemberId(memberId);
    try {
      await apiFetch(`/rooms/${id}/members/${memberId}/${action}`, {
        method: "POST",
      });
      await mutate();
    } finally {
      setLoadingMemberId(null);
    }
  }

  const memberToApprovalCardMember = (m: (typeof room.members)[number]) => ({
    id: m.id,
    userId: m.userId,
    role: m.role as "PLAYER" | "ORGANIZER" | "CO_ORGANIZER",
    status: m.status as "PENDING" | "CONFIRMED" | "WAITLIST" | "REJECTED" | "LEFT",
    playRole: m.playRole as "LINE" | "GOALKEEPER",
    waitlistPosition: m.waitlistPosition,
    user: {
      name: m.user.name,
      nickname: m.user.nickname,
      avatarUrl: m.user.avatarUrl,
      preferredPosition: m.user.preferredPosition,
    },
  });

  return (
    <div className="w-full max-w-2xl mx-auto p-[var(--space-lg)] lg:p-[var(--space-3xl)] flex flex-col gap-[var(--space-lg)]">
      {/* Header */}
      <div className="flex items-center gap-[var(--space-md)]">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-text-secondary hover:text-text-primary transition-colors"
          aria-label="Voltar"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-heading-h2 text-text-primary flex-1 truncate">
          Gestão da Sala
        </h1>
      </div>

      {/* Subtitle */}
      <p className="text-body-regular text-text-secondary truncate">{room.title}</p>

      {/* Tabs */}
      <Tabs.Root defaultValue="pending" className="flex flex-col gap-[var(--space-md)]">
        <Tabs.List
          className="flex gap-0 border-b border-border-default"
          aria-label="Gestão de membros"
        >
          {(
            [
              { value: "pending", label: "Aguardando" },
              { value: "confirmed", label: "Confirmados" },
              { value: "waitlist", label: "Espera" },
            ] as const
          ).map((tab) => (
            <Tabs.Trigger
              key={tab.value}
              value={tab.value}
              className={[
                "flex-1 h-[40px] text-body-regular text-text-secondary",
                "border-b-2 border-transparent -mb-px transition-colors",
                "data-[state=active]:text-accent-default data-[state=active]:border-accent-default",
                "hover:text-text-primary",
              ].join(" ")}
            >
              {tab.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        {/* Pending */}
        <Tabs.Content value="pending" className="flex flex-col gap-[var(--space-md)]">
          {pending.length === 0 ? (
            <p className="text-body-regular text-text-muted">
              Nenhum membro aguardando aprovação.
            </p>
          ) : (
            pending.map((m) => (
              <ApprovalCard
                key={m.id}
                member={memberToApprovalCardMember(m)}
                isLoading={loadingMemberId === m.id}
                onApprove={() => handleAction(m.id, "approve")}
                onReject={() => handleAction(m.id, "reject")}
              />
            ))
          )}
        </Tabs.Content>

        {/* Confirmed */}
        <Tabs.Content value="confirmed" className="flex flex-col gap-[var(--space-md)]">
          {confirmed.length === 0 ? (
            <p className="text-body-regular text-text-muted">
              Nenhum membro confirmado ainda.
            </p>
          ) : (
            confirmed.map((m) => (
              <ApprovalCard key={m.id} member={memberToApprovalCardMember(m)} />
            ))
          )}
        </Tabs.Content>

        {/* Waitlist */}
        <Tabs.Content value="waitlist" className="flex flex-col gap-[var(--space-md)]">
          {waitlist.length === 0 ? (
            <p className="text-body-regular text-text-muted">
              Nenhum membro na lista de espera.
            </p>
          ) : (
            waitlist.map((m) => (
              <ApprovalCard
                key={m.id}
                member={memberToApprovalCardMember(m)}
                isLoading={loadingMemberId === m.id}
                onPromote={() => handleAction(m.id, "promote")}
              />
            ))
          )}
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}
