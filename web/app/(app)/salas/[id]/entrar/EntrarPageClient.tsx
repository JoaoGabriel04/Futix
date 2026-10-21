"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Hand, Users } from "lucide-react";
import { toast } from "sonner";
import { RoleCard } from "../../../../../components/domain/RoleCard";
import { Button } from "../../../../../components/ui/Button";
import { apiFetch } from "../../../../../lib/api";

interface EntrarPageClientProps {
  id: string;
}

export function EntrarPageClient({ id }: EntrarPageClientProps) {
  const router = useRouter();
  const [playRole, setPlayRole] = useState<"LINE" | "GOALKEEPER" | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleConfirmar() {
    if (!playRole) {
      setRoleError("Selecione sua função antes de confirmar.");
      return;
    }
    setRoleError(null);
    setIsSubmitting(true);
    try {
      await apiFetch(`/rooms/${id}/join`, {
        method: "POST",
        body: JSON.stringify({ playRole }),
      });
      router.push(`/salas/${id}/pedido`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao entrar na sala.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

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
        <h1 className="text-heading-h2 text-text-primary">Entrar na Sala</h1>
      </div>

      {/* Role selection */}
      <div className="flex flex-col gap-[var(--space-md)]">
        <p className="text-body-regular text-text-secondary">Escolha sua função:</p>

        <div className="grid grid-cols-2 gap-[var(--space-md)]">
          <RoleCard
            icon={Users}
            label="Linha"
            selected={playRole === "LINE"}
            onClick={() => {
              setPlayRole("LINE");
              setRoleError(null);
            }}
          />
          <RoleCard
            icon={Hand}
            label="Goleiro"
            selected={playRole === "GOALKEEPER"}
            onClick={() => {
              setPlayRole("GOALKEEPER");
              setRoleError(null);
            }}
          />
        </div>

        {playRole === "LINE" && (
          <p className="text-caption-regular text-text-muted">Jogador de linha</p>
        )}
        {playRole === "GOALKEEPER" && (
          <p className="text-caption-regular text-text-muted">Goleiro</p>
        )}

        {roleError && (
          <p className="text-caption-regular text-status-danger">{roleError}</p>
        )}
      </div>

      {/* Confirm button */}
      <Button
        variant="Primary"
        size="Large"
        onClick={handleConfirmar}
        disabled={isSubmitting}
        className="w-full"
      >
        {isSubmitting ? "Confirmando..." : "Confirmar"}
      </Button>
    </div>
  );
}
