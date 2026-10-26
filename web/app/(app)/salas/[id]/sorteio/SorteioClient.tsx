"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Info, EyeOff, Hand } from "lucide-react";
import { useRoom } from "../../../../../hooks/useRoom";
import { useDraw } from "../../../../../hooks/useDraw";
import { apiFetch } from "../../../../../lib/api";
import { startMatch } from "../../../../../lib/matchApi";
import { Button } from "../../../../../components/ui/Button";
import SorteioLoading from "./loading";
import { ErrorState } from "../../../../../components/ui/ErrorState";
import { WeightChip } from "../../../../../components/ui/WeightChip";

interface SorteioClientProps {
  id: string;
}

export function SorteioClient({ id }: SorteioClientProps) {
  const router = useRouter();
  const { room, isLoading: roomLoading } = useRoom(id);
  const { draw, isLoading: drawLoading, mutate } = useDraw(id);

  const [isRedrawing, setIsRedrawing] = useState(false);
  const [redrawError, setRedrawError] = useState<string | null>(null);

  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  async function handleStartMatch() {
    setIsStarting(true);
    setStartError(null);
    try {
      await startMatch(id);
      router.push(`/salas/${id}/partida`);
    } catch (e) {
      setStartError((e as Error).message);
      setIsStarting(false);
    }
  }

  const isLoading = roomLoading || drawLoading;

  if (isLoading) return <SorteioLoading />;

  if (!room) return <ErrorState message="Sala não encontrada." />;

  if (draw === null) return <ErrorState message="Nenhum sorteio encontrado para esta sala." />;

  const isOrgOrCoOrg =
    room.myMember?.role === "ORGANIZER" || room.myMember?.role === "CO_ORGANIZER";

  const goalkeeperNames = room.members
    .filter((m) => m.status === "CONFIRMED" && m.playRole === "GOALKEEPER")
    .map((m) => m.user.name)
    .join(" e ");

  async function handleRedraw() {
    setIsRedrawing(true);
    setRedrawError(null);
    try {
      await apiFetch(`/rooms/${id}/draw`, { method: "POST" });
      await mutate();
      setIsRedrawing(false);
    } catch (e) {
      setRedrawError((e as Error).message);
      setIsRedrawing(false);
    }
  }

  return (
    <div className="bg-bg-app flex flex-col h-full">
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
            <ArrowLeft size={22} />
          </button>
          <div className="flex flex-col flex-1 min-w-0">
            <p className="text-heading-h3 text-text-primary">Times sorteados</p>
            <p className="text-caption-regular text-text-secondary truncate">
              {room.title} · antes da 1ª partida
            </p>
          </div>
        </div>

        {/* Info banner (org/co-org only, when DRAWN) */}
        {isOrgOrCoOrg && room.status === "DRAWN" && (
          <div className="bg-accent-subtle border border-accent-default rounded-md flex gap-[var(--space-md)] items-center p-[var(--space-md)]">
            <Info size={18} className="text-accent-default shrink-0" />
            <p className="text-caption-regular text-text-primary flex-1">
              Você pode sortear de novo até iniciar a 1ª partida. Depois, o sorteio fica bloqueado.
            </p>
          </div>
        )}

        {/* Teams grid */}
        <div className="grid grid-cols-2 gap-[var(--space-md)]">
          {draw.teams.map((team) => (
            <div
              key={team.id}
              className="bg-bg-surface border border-border-default rounded-lg px-[var(--space-md)] py-[var(--space-lg)] flex flex-col gap-[var(--space-sm)]"
            >
              {/* Team header */}
              <div className="flex items-center gap-[var(--space-sm)]">
                <p className="text-body-strong text-text-primary flex-1">{team.name}</p>
                {isOrgOrCoOrg && team.weightTotal !== undefined && (
                  <p className="text-caption-regular text-text-muted">Peso {team.weightTotal}</p>
                )}
              </div>

              {/* Players */}
              {team.players.map((player) => (
                <div key={player.userId} className="flex gap-[var(--space-sm)] items-center">
                  <p className="text-caption-regular text-text-primary flex-1 truncate">
                    {player.name}
                  </p>
                  {isOrgOrCoOrg && player.level && (
                    <WeightChip level={player.level} />
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Privacy note (org/co-org only) */}
        {isOrgOrCoOrg && (
          <div className="flex gap-[var(--space-sm)] items-center">
            <EyeOff size={14} className="text-text-muted shrink-0" />
            <p className="text-caption-regular text-text-muted">
              Pesos visíveis só para organizadores
            </p>
          </div>
        )}

        {/* Goalkeepers card */}
        {goalkeeperNames && (
          <div className="bg-bg-surface border border-border-default rounded-md flex gap-[var(--space-md)] items-center p-[var(--space-md)]">
            <Hand size={18} className="text-text-secondary shrink-0" />
            <p className="text-caption-regular text-text-secondary flex-1">
              Goleiros: {goalkeeperNames} (definidos em quadra)
            </p>
          </div>
        )}

        {/* Leftover players */}
        {draw.leftoverPlayers.length > 0 && (
          <div className="flex flex-col gap-[var(--space-sm)]">
            <p className="text-caption-strong text-text-muted">
              Sem time ({draw.leftoverPlayers.length})
            </p>
            {draw.leftoverPlayers.map((player) => (
              <p key={player.userId} className="text-caption-regular text-text-secondary">
                {player.name}
              </p>
            ))}
          </div>
        )}

        {/* Error display */}
        {redrawError && (
          <p className="text-caption-regular text-status-danger">{redrawError}</p>
        )}
        {startError && (
          <p className="text-caption-regular text-status-danger">{startError}</p>
        )}

        <div className="flex-1" />
      </div>

      {/* Bottom action bar (org/co-org only, when DRAWN) */}
      {isOrgOrCoOrg && room.status === "DRAWN" && (
        <div className="bg-bg-sidebar border-t border-border-default pt-[12px] pb-[24px] px-[var(--space-lg)]">
          <div className="flex gap-[var(--space-md)]">
            <Button
              variant="Secondary"
              size="Large"
              className="flex-1"
              onClick={handleRedraw}
              disabled={isRedrawing}
            >
              {isRedrawing ? "Sorteando..." : "Sortear de novo"}
            </Button>
            <Button
              variant="Primary"
              size="Large"
              className="flex-1"
              onClick={handleStartMatch}
              disabled={isStarting}
            >
              {isStarting ? "Iniciando..." : "Iniciar partida 1"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
