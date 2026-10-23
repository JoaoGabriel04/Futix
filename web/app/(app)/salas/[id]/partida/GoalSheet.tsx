"use client";

import { useState, useEffect } from "react";
import type { RoomMemberSummary } from "../../../../../hooks/useRoom";
import { addGoal } from "../../../../../lib/matchApi";
import { BottomSheet } from "../../../../../components/ui/BottomSheet";
import { Button } from "../../../../../components/ui/Button";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatSeconds(seconds: number): string {
  const clamped = Math.max(0, seconds);
  const m = Math.floor(clamped / 60);
  const s = clamped % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface GoalSheetProps {
  matchId: string;
  teamId: string;
  teamName: string;
  playerIds: string[];           // snapshot: teamAPlayerIds or teamBPlayerIds from SessionMatch
  otherTeamPlayerIds: string[];  // snapshot of the OTHER team's players (for own-goal scorer)
  members: RoomMemberSummary[];  // room.members for ID → name resolution
  elapsedSeconds: number;
  onClose: () => void;
  onSuccess: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GoalSheet({
  matchId,
  teamId: _teamId,
  teamName,
  playerIds,
  otherTeamPlayerIds,
  members,
  elapsedSeconds,
  onClose,
  onSuccess,
}: GoalSheetProps) {
  const [scorerId, setScorerId] = useState<string | null>(null);
  const [assistId, setAssistId] = useState<string | null>(null); // null = "Sem assistência"
  const [isOwnGoal, setIsOwnGoal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset scorer when own-goal toggle changes (player pool changes)
  useEffect(() => {
    setScorerId(null);
    setAssistId(null);
  }, [isOwnGoal]);

  // Resolve player ID to display name
  function resolveName(id: string): string {
    const member = members.find((m) => m.user.id === id);
    return member?.user.nickname ?? member?.user.name ?? id;
  }

  // Pool of players for scorer
  const scorerPool = isOwnGoal ? otherTeamPlayerIds : playerIds;

  // Pool of players for assist (same team, excluding scorer)
  const assistPool = playerIds.filter((pid) => pid !== scorerId);

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    try {
      await addGoal(matchId, {
        teamId: _teamId,
        scorerId: scorerId ?? undefined,
        assistId: assistId ?? undefined,
        ownGoal: isOwnGoal || undefined,
      });
      onSuccess();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <BottomSheet open={true} onClose={onClose}>
      {/* Header row */}
      <div className="flex items-center">
        <p className="text-heading-h2 flex-1">Gol do {teamName}</p>
        <p className="text-body-strong text-text-muted">{formatSeconds(elapsedSeconds)}</p>
      </div>

      {/* "QUEM FEZ O GOL?" */}
      <div className="flex flex-col gap-[var(--space-sm)]">
        <p className="text-overline text-text-muted">Quem fez o gol?</p>
        <div className="flex flex-wrap gap-[var(--space-sm)]">
          {scorerPool.map((pid) => (
            <button
              key={pid}
              type="button"
              onClick={() => setScorerId(scorerId === pid ? null : pid)}
              className={[
                "px-[var(--space-md)] py-[8px] rounded-full border text-caption-strong",
                scorerId === pid
                  ? "bg-accent-default border-accent-default text-text-on-accent"
                  : "bg-bg-raised border-border-default text-text-primary",
              ].join(" ")}
            >
              {resolveName(pid)}
            </button>
          ))}
        </div>
      </div>

      {/* "ASSISTÊNCIA (OPCIONAL)" — only for normal goals, not own goals */}
      {!isOwnGoal && (
        <div className="flex flex-col gap-[var(--space-sm)]">
          <p className="text-overline text-text-muted">Assistência (opcional)</p>
          <div className="flex flex-wrap gap-[var(--space-sm)]">
            {/* "Sem assistência" chip */}
            <button
              type="button"
              onClick={() => setAssistId(null)}
              className={[
                "px-[var(--space-md)] py-[8px] rounded-full border text-caption-strong",
                assistId === null
                  ? "bg-accent-default border-accent-default text-text-on-accent"
                  : "bg-bg-raised border-border-default text-text-primary",
              ].join(" ")}
            >
              Sem assistência
            </button>
            {/* Other players (same team, excluding scorer) */}
            {assistPool.map((pid) => (
              <button
                key={pid}
                type="button"
                onClick={() => setAssistId(assistId === pid ? null : pid)}
                className={[
                  "px-[var(--space-md)] py-[8px] rounded-full border text-caption-strong",
                  assistId === pid
                    ? "bg-accent-default border-accent-default text-text-on-accent"
                    : "bg-bg-raised border-border-default text-text-primary",
                ].join(" ")}
              >
                {resolveName(pid)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* "GOL CONTRA" toggle */}
      <div className="bg-bg-raised rounded-[var(--radius-md)] p-[var(--space-md)] flex items-center gap-[var(--space-md)]">
        <div className="flex flex-col flex-1 gap-[var(--space-xs)]">
          <p className="text-body-strong text-text-primary">Gol contra</p>
          <p className="text-caption-regular text-text-secondary">Conta para o outro time</p>
        </div>
        <input
          type="checkbox"
          role="switch"
          checked={isOwnGoal}
          onChange={(e) => setIsOwnGoal(e.target.checked)}
          className="w-[44px] h-[26px] cursor-pointer appearance-none rounded-full bg-border-default checked:bg-accent-default transition-colors relative"
        />
      </div>

      {/* Error message */}
      {error && (
        <p className="text-caption-regular text-red-500">{error}</p>
      )}

      {/* Confirm button */}
      <Button
        variant="Primary"
        size="Large"
        className="w-full"
        onClick={handleConfirm}
        disabled={loading}
      >
        {loading ? "Registrando..." : "Confirmar gol"}
      </Button>
    </BottomSheet>
  );
}
