"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, EyeOff } from "lucide-react";
import { useRoom } from "../../../../../hooks/useRoom";
import { useWeights } from "../../../../../hooks/useWeights";
import { apiFetch } from "../../../../../lib/api";
import { Button } from "../../../../../components/ui/Button";
import { Avatar } from "../../../../../components/ui/Avatar";
import { WeightChip } from "../../../../../components/ui/WeightChip";

interface PesosClientProps {
  id: string;
}

type WeightLevel = "REGULAR" | "GOOD" | "STAR";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0] ?? "";
  if (parts.length === 1) return first.slice(0, 2).toUpperCase();
  const last = parts[parts.length - 1] ?? "";
  return ((first[0] ?? "") + (last[0] ?? "")).toUpperCase();
}

export function PesosClient({ id }: PesosClientProps) {
  const router = useRouter();
  const { room, isLoading: roomLoading } = useRoom(id);
  const { weights, isLoading: weightsLoading, mutate: weightsMutate } = useWeights(id);

  const [localWeights, setLocalWeights] = useState<Record<string, WeightLevel>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Track whether the user has made local changes — prevents re-initialization
  const hasUserEdited = useRef(false);

  // Initialize local weights from API data when available
  useEffect(() => {
    if (hasUserEdited.current) return;
    if (!room || weightsLoading) return;

    const confirmedLinePlayers = room.members.filter(
      (m) => m.status === "CONFIRMED" && m.playRole === "LINE",
    );

    const initial: Record<string, WeightLevel> = {};
    for (const member of confirmedLinePlayers) {
      const found = weights.find((w) => w.playerId === member.userId);
      initial[member.userId] = found?.level ?? "GOOD";
    }
    setLocalWeights(initial);
  }, [room, weights, weightsLoading]);

  if (roomLoading) {
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

  // Permission guard
  if (room.myMember?.role !== "ORGANIZER" && room.myMember?.role !== "CO_ORGANIZER") {
    return (
      <p className="text-body-regular text-text-muted p-[var(--space-lg)]">
        Apenas organizadores podem ver e editar os pesos.
      </p>
    );
  }

  const confirmedLinePlayers = room.members.filter(
    (m) => m.status === "CONFIRMED" && m.playRole === "LINE",
  );

  // Count per level
  const starCount = Object.values(localWeights).filter((l) => l === "STAR").length;
  const goodCount = Object.values(localWeights).filter((l) => l === "GOOD").length;
  const regularCount = Object.values(localWeights).filter((l) => l === "REGULAR").length;

  function handleSetWeight(userId: string, level: WeightLevel) {
    hasUserEdited.current = true;
    setLocalWeights((prev) => ({ ...prev, [userId]: level }));
  }

  async function handleSave() {
    setIsSaving(true);
    setSaveError(null);
    try {
      const items = confirmedLinePlayers.map((m) => ({
        playerId: m.userId,
        level: localWeights[m.userId] ?? "GOOD",
      }));
      await apiFetch(`/rooms/${id}/weights`, {
        method: "PUT",
        body: JSON.stringify({ items }),
      });
      await weightsMutate();
      router.back();
    } catch (e) {
      setSaveError((e as Error).message);
      setIsSaving(false);
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
            <p className="text-heading-h3 text-text-primary">Pesos dos jogadores</p>
            <p className="text-caption-regular text-text-secondary truncate">{room.title}</p>
          </div>
        </div>

        {/* Privacy notice */}
        <div className="bg-bg-surface border border-border-default rounded-md flex gap-[var(--space-md)] items-center p-[var(--space-md)]">
          <EyeOff size={18} className="text-text-secondary shrink-0" />
          <p className="text-caption-regular text-text-secondary flex-1">
            Só você e os co-organizadores veem. Usado para equilibrar sorteio e trocas.
          </p>
        </div>

        {/* Summary row */}
        <div className="flex gap-[var(--space-sm)] items-center">
          <div className="flex gap-[var(--space-xs)] items-center">
            <WeightChip level="STAR" />
            <span className="text-caption-regular text-text-secondary">{starCount}</span>
          </div>
          <div className="flex gap-[var(--space-xs)] items-center">
            <WeightChip level="GOOD" />
            <span className="text-caption-regular text-text-secondary">{goodCount}</span>
          </div>
          <div className="flex gap-[var(--space-xs)] items-center">
            <WeightChip level="REGULAR" />
            <span className="text-caption-regular text-text-secondary">{regularCount}</span>
          </div>
        </div>

        {/* Player list */}
        <div className="flex flex-col gap-[var(--space-sm)]">
          {confirmedLinePlayers.map((member) => (
            <div
              key={member.userId}
              className="bg-bg-surface border border-border-default rounded-lg flex gap-[var(--space-md)] items-center px-[var(--space-md)] py-[var(--space-sm)]"
            >
              <Avatar iniciais={getInitials(member.user.name)} />
              <p className="text-body-strong text-text-primary flex-1 min-w-0 truncate">
                {member.user.name}
              </p>
              {/* Inline weight picker */}
              <div className="bg-bg-raised rounded-sm flex gap-[var(--space-xs)] p-[3px] shrink-0">
                {(["REGULAR", "GOOD", "STAR"] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => handleSetWeight(member.userId, lvl)}
                    className={[
                      "h-[28px] w-[32px] rounded-sm flex items-center justify-center text-caption-strong transition-colors",
                      localWeights[member.userId] === lvl
                        ? "bg-accent-default text-text-on-accent"
                        : "text-text-secondary",
                    ].join(" ")}
                  >
                    {lvl === "REGULAR" ? "R" : lvl === "GOOD" ? "B" : "C"}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Caption */}
        <p className="text-caption-regular text-text-muted">R = Regular · B = Bom · C = Craque</p>

        <div className="flex-1" />
      </div>

      {/* Action bar */}
      <div className="bg-bg-sidebar border-t border-border-default pt-[12px] pb-[24px] px-[var(--space-lg)]">
        <Button
          variant="Primary"
          size="Large"
          className="w-full"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? "Salvando..." : "Salvar pesos"}
        </Button>
      </div>

      {/* Save error */}
      {saveError && (
        <p className="text-caption-regular text-status-danger px-[var(--space-lg)] pb-[var(--space-md)]">
          {saveError}
        </p>
      )}
    </div>
  );
}
