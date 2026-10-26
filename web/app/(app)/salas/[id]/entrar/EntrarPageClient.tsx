"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Hand, Info, Users } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { RoleCard } from "../../../../../components/domain/RoleCard";
import { Button } from "../../../../../components/ui/Button";
import { apiFetch } from "../../../../../lib/api";
import { useRoom } from "../../../../../hooks/useRoom";

interface EntrarPageClientProps {
  id: string;
}

export function EntrarPageClient({ id }: EntrarPageClientProps) {
  const router = useRouter();
  const { room } = useRoom(id);
  const [playRole, setPlayRole] = useState<"LINE" | "GOALKEEPER" | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const lineRestantes = room ? room.lineSlots - room.confirmedLine : 0;
  const gkRestantes = room ? room.goalkeeperSlots - room.confirmedGoalkeepers : 0;
  const lineIsFull = room ? lineRestantes <= 0 : false;
  const gkIsFull = room ? gkRestantes <= 0 : false;

  const selectedRoleIsFull =
    (playRole === "LINE" && lineIsFull) || (playRole === "GOALKEEPER" && gkIsFull);

  const lineDescription = room
    ? lineIsFull
      ? "Entra no sorteio dos times. Vagas esgotadas: você vai para a lista de espera."
      : `Entra no sorteio dos times. ${lineRestantes} vaga${lineRestantes !== 1 ? "s" : ""} restante${lineRestantes !== 1 ? "s" : ""}.`
    : undefined;

  const gkDescription = room
    ? gkIsFull
      ? "Fica fora do sorteio e é definido em quadra. Vagas esgotadas: você vai para a lista de espera."
      : `Fica fora do sorteio e é definido em quadra. ${gkRestantes} vaga${gkRestantes !== 1 ? "s" : ""} restante${gkRestantes !== 1 ? "s" : ""}.`
    : undefined;

  const infoText = selectedRoleIsFull
    ? "Se alguém sair, o organizador pode chamar você da lista de espera. A função vale só para esta sala."
    : "Você escolhe uma função por sala. O organizador vê sua escolha ao avaliar o pedido.";

  const footerLabel = selectedRoleIsFull ? "Entrar na lista de espera" : "Enviar pedido";

  const subtitle =
    room
      ? `${room.title} · ${format(new Date(room.startsAt), "EEE, d MMM '·' HH:mm", { locale: ptBR })}`
      : null;

  async function handleEnviar() {
    if (!playRole) {
      setRoleError("Selecione sua função antes de continuar.");
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
      const message = err instanceof Error ? err.message : "Erro ao enviar pedido.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-[var(--space-lg)] flex flex-col gap-[var(--space-lg)]">

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
          <span className="text-heading-h3 text-text-primary">Pedir para entrar</span>
        </div>

        {/* Heading + subtitle */}
        <div className="flex flex-col gap-[var(--space-xs)]">
          <h1 className="text-heading-h2 text-text-primary">Como você vai jogar?</h1>
          {subtitle && (
            <p className="text-body-regular text-text-secondary">{subtitle}</p>
          )}
        </div>

        {/* Role cards — column */}
        <div className="flex flex-col gap-[var(--space-md)]">
          <RoleCard
            icon={Users}
            label="Jogador de linha"
            {...(lineDescription !== undefined ? { description: lineDescription } : {})}
            selected={playRole === "LINE"}
            onClick={() => {
              setPlayRole("LINE");
              setRoleError(null);
            }}
          />
          <RoleCard
            icon={Hand}
            label="Goleiro"
            {...(gkDescription !== undefined ? { description: gkDescription } : {})}
            selected={playRole === "GOALKEEPER"}
            onClick={() => {
              setPlayRole("GOALKEEPER");
              setRoleError(null);
            }}
          />
        </div>

        {roleError && (
          <p className="text-caption-regular text-status-danger">{roleError}</p>
        )}

        {/* Info box */}
        <div className="flex gap-[var(--space-sm)] p-[var(--space-md)] bg-bg-raised rounded-[var(--radius-md)]">
          <Info size={16} className="text-text-muted shrink-0 mt-[2px]" aria-hidden />
          <p className="text-caption-regular text-text-muted">{infoText}</p>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border-default bg-bg-app px-[var(--space-lg)] py-[var(--space-lg)]">
        <Button
          variant="Primary"
          size="Large"
          className="w-full"
          onClick={handleEnviar}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Enviando..." : footerLabel}
        </Button>
      </div>
    </div>
  );
}
