"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useInvitePreview } from "../../../../hooks/useInvitePreview";
import { apiFetch } from "../../../../lib/api";
import { Button } from "../../../../components/ui/Button";

interface ConviteClientProps {
  token: string;
}

export function ConviteClient({ token }: ConviteClientProps) {
  const router = useRouter();
  const { preview, isLoading, error } = useInvitePreview(token);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  async function handleUseInvite() {
    setLoadingAction("use");
    try {
      const result = await apiFetch<{ roomId: string }>(`/invites/${token}/use`, { method: "POST" });
      router.push(`/salas/${result.roomId}`);
    } catch (e: unknown) {
      const err = e as { status?: number; message?: string };
      if (err.status === 409 && preview) {
        router.push(`/salas/${preview.roomId}`);
        return;
      }
      toast.error(err.message ?? "Erro inesperado. Tente novamente.");
      setLoadingAction(null);
    }
  }

  if (isLoading) {
    return (
      <div className="w-full max-w-2xl mx-auto p-[var(--space-lg)] lg:p-[var(--space-3xl)] flex flex-col gap-[var(--space-3xl)]">
        <p className="text-body-regular text-text-muted">Carregando convite...</p>
      </div>
    );
  }

  if (error) {
    if (error.status === 410 || error.status === 404) {
      return (
        <div className="w-full max-w-2xl mx-auto p-[var(--space-lg)] lg:p-[var(--space-3xl)] flex flex-col gap-[var(--space-3xl)]">
          <p className="text-body-regular text-text-muted">Este convite não é mais válido.</p>
        </div>
      );
    }

    if (error.status === 409) {
      return (
        <div className="w-full max-w-2xl mx-auto p-[var(--space-lg)] lg:p-[var(--space-3xl)] flex flex-col gap-[var(--space-3xl)]">
          <p className="text-body-regular text-text-muted">Você já é membro desta sala.</p>
        </div>
      );
    }

    return (
      <div className="w-full max-w-2xl mx-auto p-[var(--space-lg)] lg:p-[var(--space-3xl)] flex flex-col gap-[var(--space-3xl)]">
        <p className="text-body-regular text-text-muted">{error.message ?? "Erro ao carregar convite."}</p>
      </div>
    );
  }

  if (!preview) {
    return null;
  }

  const formattedDate = new Date(preview.room.startsAt).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="w-full max-w-2xl mx-auto p-[var(--space-lg)] lg:p-[var(--space-3xl)] flex flex-col gap-[var(--space-3xl)]">
      {/* Room info card */}
      <div className="flex flex-col gap-[var(--space-lg)]">
        <h1 className="text-heading-h2 text-text-primary">Convite para sala</h1>
        <div className="bg-bg-surface border border-border-default rounded-lg p-[var(--space-lg)] flex flex-col gap-[var(--space-md)]">
          <span className="text-heading-h3 text-text-primary">{preview.room.title}</span>
          <span className="text-body-regular text-text-secondary">{preview.room.location}</span>
          <span className="text-body-regular text-text-secondary">{formattedDate}</span>
          <div className="flex gap-[var(--space-lg)]">
            <span className="text-caption-regular text-text-muted">
              {preview.room.lineSlots} vagas de linha
            </span>
            <span className="text-caption-regular text-text-muted">
              {preview.room.goalkeeperSlots} vagas de goleiro
            </span>
          </div>
        </div>
      </div>

      {/* Entrar button */}
      <Button
        variant="Primary"
        size="Large"
        onClick={handleUseInvite}
        disabled={loadingAction === "use"}
      >
        {loadingAction === "use" ? "Entrando..." : "Entrar na sala"}
      </Button>
    </div>
  );
}
