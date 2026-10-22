"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Undo2, Pause, Play } from "lucide-react";
import { GOALS_TO_WIN } from "@fut/shared";
import { useRoom } from "../../../../../hooks/useRoom";
import { useRoomSession } from "../../../../../hooks/useRoomSession";
import type { SessionTeam } from "../../../../../hooks/useRoomSession";
import { useMatchTimer } from "../../../../../hooks/useMatchTimer";
import { getSocket } from "../../../../../lib/socket";
import { pauseMatch, resumeMatch, endMatch, undoLastGoal } from "../../../../../lib/matchApi";
import { Badge } from "../../../../../components/ui/Badge";
import { Button } from "../../../../../components/ui/Button";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MatchEventPayload {
  matchId: string;
  status: "LIVE" | "PAUSED" | "FINISHED";
  elapsedSeconds: number;
  startedAt: string;
  limitSeconds: number;
  serverNow: string;
  scoreA: number;
  scoreB: number;
}

interface LocalEvent {
  id: string;
  atSecond: number;
  title: string;
  subtitle: string;
  undone?: boolean;
}

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
// Component
// ---------------------------------------------------------------------------

interface PartidaClientProps {
  id: string;
}

export function PartidaClient({ id }: PartidaClientProps) {
  const router = useRouter();

  // Data
  const { room, isLoading: roomLoading } = useRoom(id);
  const { session, isLoading: sessionLoading, mutate: mutateSession } = useRoomSession(id);

  // Server clock offset (from latest socket event)
  const offsetRef = useRef<number>(0);

  // Local match events (not persisted across reloads)
  const [localEvents, setLocalEvents] = useState<LocalEvent[]>([]);

  // Goal team id placeholder — GoalSheet wired in T3
  const [, setGoalTeamId] = useState<string | null>(null);

  // Per-button loading states
  const [loadingUndo, setLoadingUndo] = useState(false);
  const [loadingPause, setLoadingPause] = useState(false);
  const [loadingEnd, setLoadingEnd] = useState(false);

  // Track previous scores for goal diffing in socket handler
  const prevScoreRef = useRef<{ scoreA: number; scoreB: number }>({ scoreA: 0, scoreB: 0 });

  // Always-current session ref so socket handlers resolve team names even after SWR updates
  const sessionRef = useRef(session);
  useEffect(() => { sessionRef.current = session; }, [session]);

  const match = session?.currentMatch ?? null;

  // Keep prevScoreRef in sync with the latest known score from SWR
  useEffect(() => {
    if (match) {
      prevScoreRef.current = { scoreA: match.scoreA, scoreB: match.scoreB };
    }
  }, [match?.scoreA, match?.scoreB]);

  // ---------------------------------------------------------------------------
  // Socket: subscribe to match events
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const socket = getSocket();
    socket.connect();
    socket.emit("room:join", id);

    function addEvent(event: LocalEvent) {
      setLocalEvents((prev) => [event, ...prev]);
    }

    function handleStarted(data: MatchEventPayload) {
      offsetRef.current = new Date(data.serverNow).getTime() - Date.now();
      mutateSession();
      addEvent({
        id: Date.now().toString(),
        atSecond: data.elapsedSeconds,
        title: "Início",
        subtitle: `Partida ${sessionRef.current?.currentMatch?.number ?? ""} começou`,
      });
    }

    function handleGoal(data: MatchEventPayload) {
      offsetRef.current = new Date(data.serverNow).getTime() - Date.now();

      // Determine which team scored by comparing incoming scores to last known
      const prev = prevScoreRef.current;
      let scoringTeamName = "";

      const currentSession = sessionRef.current;
      if (currentSession) {
        const teamA = currentSession.teams.find((t) => t.id === currentSession.currentMatch?.teamAId);
        const teamB = currentSession.teams.find((t) => t.id === currentSession.currentMatch?.teamBId);
        if (data.scoreA > prev.scoreA && teamA) {
          scoringTeamName = teamA.name;
        } else if (data.scoreB > prev.scoreB && teamB) {
          scoringTeamName = teamB.name;
        }
      }

      // Update prev ref immediately so next event compares from new baseline
      prevScoreRef.current = { scoreA: data.scoreA, scoreB: data.scoreB };

      mutateSession();
      addEvent({
        id: Date.now().toString(),
        atSecond: data.elapsedSeconds,
        title: scoringTeamName ? `Gol · ${scoringTeamName}` : "Gol",
        subtitle: "",
      });
    }

    function handleGoalUndone(data: MatchEventPayload) {
      offsetRef.current = new Date(data.serverNow).getTime() - Date.now();
      prevScoreRef.current = { scoreA: data.scoreA, scoreB: data.scoreB };
      mutateSession();
      addEvent({
        id: Date.now().toString(),
        atSecond: data.elapsedSeconds,
        title: "Gol anulado",
        subtitle: "",
        undone: true,
      });
    }

    function handlePaused(data: MatchEventPayload) {
      offsetRef.current = new Date(data.serverNow).getTime() - Date.now();
      mutateSession();
    }

    function handleResumed(data: MatchEventPayload) {
      offsetRef.current = new Date(data.serverNow).getTime() - Date.now();
      mutateSession();
    }

    socket.on("match:started", handleStarted);
    socket.on("match:goal", handleGoal);
    socket.on("match:goal-undone", handleGoalUndone);
    socket.on("match:paused", handlePaused);
    socket.on("match:resumed", handleResumed);

    return () => {
      socket.off("match:started", handleStarted);
      socket.off("match:goal", handleGoal);
      socket.off("match:goal-undone", handleGoalUndone);
      socket.off("match:paused", handlePaused);
      socket.off("match:resumed", handleResumed);
      socket.emit("room:leave", id);
      socket.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ---------------------------------------------------------------------------
  // Timer
  // ---------------------------------------------------------------------------
  const { elapsedStr, limitStr } = useMatchTimer({
    status: match?.status ?? null,
    startedAt: match?.startedAt ?? null,
    elapsedSeconds: match?.elapsedSeconds ?? 0,
    limitSeconds: match?.limitSeconds ?? 0,
    offset: offsetRef.current,
  });

  // ---------------------------------------------------------------------------
  // Loading / empty states
  // ---------------------------------------------------------------------------
  if (sessionLoading || roomLoading) {
    return (
      <p className="text-body-regular text-text-muted p-[var(--space-lg)]">Carregando...</p>
    );
  }

  if (!session || (!session.currentMatch && !session.lastRotation)) {
    return (
      <div className="p-[var(--space-lg)] flex flex-col gap-[var(--space-md)]">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-text-secondary hover:text-text-primary transition-colors self-start"
          aria-label="Voltar"
        >
          <ArrowLeft size={22} />
        </button>
        <p className="text-body-regular text-text-muted">Nenhuma partida em andamento.</p>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------
  const isOrgOrCoOrg =
    room?.myMember?.role === "ORGANIZER" || room?.myMember?.role === "CO_ORGANIZER";

  const teamA: SessionTeam | undefined = match
    ? session.teams.find((t) => t.id === match.teamAId)
    : undefined;
  const teamB: SessionTeam | undefined = match
    ? session.teams.find((t) => t.id === match.teamBId)
    : undefined;

  const scoreA = match?.scoreA ?? 0;
  const scoreB = match?.scoreB ?? 0;
  const leadingTeamId =
    scoreA > scoreB ? match?.teamAId : scoreB > scoreA ? match?.teamBId : null;

  const queueTeams = session.teams
    .filter((t) => t.queuePosition !== null)
    .slice()
    .sort((a, b) => (a.queuePosition ?? 0) - (b.queuePosition ?? 0));

  // ---------------------------------------------------------------------------
  // Action handlers
  // ---------------------------------------------------------------------------
  async function handleUndo() {
    if (!match) return;
    setLoadingUndo(true);
    try {
      await undoLastGoal(match.id);
      await mutateSession();
    } catch (e) {
      alert((e as Error).message ?? "Erro ao desfazer gol.");
    } finally {
      setLoadingUndo(false);
    }
  }

  async function handlePauseResume() {
    if (!match) return;
    setLoadingPause(true);
    try {
      if (match.status === "LIVE") {
        await pauseMatch(match.id);
      } else {
        await resumeMatch(match.id);
      }
      await mutateSession();
    } catch (e) {
      alert((e as Error).message ?? "Erro ao pausar/retomar partida.");
    } finally {
      setLoadingPause(false);
    }
  }

  async function handleEnd() {
    if (!match) return;
    const confirmed = window.confirm("Encerrar a partida agora?");
    if (!confirmed) return;
    setLoadingEnd(true);
    try {
      await endMatch(match.id);
      await mutateSession();
    } catch (e) {
      alert((e as Error).message ?? "Erro ao encerrar partida.");
    } finally {
      setLoadingEnd(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="bg-bg-app flex flex-col h-full">
      {/* Scrollable content */}
      <div
        className={[
          "flex-1 overflow-y-auto p-[var(--space-lg)] flex flex-col gap-[var(--space-lg)]",
          "lg:grid lg:grid-cols-2 lg:gap-[var(--space-xl)] lg:items-start",
        ].join(" ")}
      >
        {/* LEFT COLUMN */}
        <div className="flex flex-col gap-[var(--space-lg)]">
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
              <p className="text-heading-h3 text-text-primary">
                Partida {match?.number ?? ""}
              </p>
              <p className="text-caption-regular text-text-secondary truncate">
                {room?.title ?? ""}
              </p>
            </div>
            {match?.status === "LIVE" && <Badge status="Ao vivo" />}
          </div>

          {/* Timer card */}
          <div
            className={[
              "bg-bg-surface border border-border-default rounded-lg p-[var(--space-lg)]",
              "flex flex-col items-center gap-[var(--space-xs)]",
            ].join(" ")}
          >
            <p className="text-display-h1 text-text-primary">{elapsedStr}</p>
            <p className="text-caption-regular text-text-secondary">
              de {limitStr} · {GOALS_TO_WIN} gols encerram
            </p>
          </div>

          {/* Team cards */}
          <div className="flex gap-[var(--space-md)]">
            {[
              { team: teamA, score: scoreA, teamId: match?.teamAId },
              { team: teamB, score: scoreB, teamId: match?.teamBId },
            ].map(({ team, score, teamId }) => {
              if (!team || !teamId) return null;
              const isLeading = leadingTeamId === teamId;
              return (
                <div
                  key={teamId}
                  className={[
                    "flex-1 flex flex-col items-center gap-[var(--space-sm)]",
                    "p-[var(--space-lg)] rounded-lg border",
                    isLeading
                      ? "bg-accent-subtle border-accent-default"
                      : "bg-bg-surface border-border-default",
                  ].join(" ")}
                >
                  <p className="text-body-strong text-text-secondary text-center">{team.name}</p>
                  <p className="text-display-h1 text-text-primary">{score}</p>
                  {isOrgOrCoOrg && match?.status === "LIVE" && (
                    <Button
                      variant="Primary"
                      size="Small"
                      className="w-full"
                      onClick={() => setGoalTeamId(teamId)}
                    >
                      + Gol
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="flex flex-col gap-[var(--space-lg)]">
          {/* LANCES section */}
          <div className="flex flex-col gap-[var(--space-sm)]">
            <p className="text-overline text-text-muted">LANCES</p>
            <div
              className={[
                "bg-bg-surface border border-border-default rounded-lg",
                "p-[var(--space-lg)] flex flex-col gap-[var(--space-md)]",
              ].join(" ")}
            >
              {localEvents.length === 0 ? (
                <p className="text-caption-regular text-text-muted">Aguardando lances...</p>
              ) : (
                localEvents.map((event) => (
                  <div key={event.id} className="flex flex-col gap-[var(--space-xs)]">
                    <div className="flex items-baseline gap-[var(--space-sm)]">
                      <span className="text-caption-strong text-text-muted">
                        {formatSeconds(event.atSecond)}
                      </span>
                      <span
                        className={[
                          "text-body-strong",
                          event.undone ? "text-text-muted line-through" : "text-text-primary",
                        ].join(" ")}
                      >
                        {event.title}
                      </span>
                    </div>
                    {event.subtitle ? (
                      <p className="text-caption-regular text-text-secondary">{event.subtitle}</p>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* FILA section */}
          {queueTeams.length > 0 && (
            <div className="flex flex-col gap-[var(--space-sm)]">
              <p className="text-caption-strong text-text-muted">Fila</p>
              <div className="flex flex-wrap gap-[var(--space-sm)]">
                {queueTeams.map((team) => (
                  <span
                    key={team.id}
                    className={[
                      "bg-bg-raised border border-border-default rounded-full",
                      "px-[var(--space-md)] py-[8px]",
                      "text-caption-strong text-text-primary",
                    ].join(" ")}
                  >
                    {team.queuePosition}º {team.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom action bar — org/co-org only, not FINISHED */}
      {isOrgOrCoOrg && match && match.status !== "FINISHED" && (
        <div
          className={[
            "bg-bg-sidebar border-t border-border-default",
            "pt-[12px] pb-[24px] px-[var(--space-lg)]",
            "flex flex-col gap-[var(--space-sm)]",
          ].join(" ")}
        >
          {/* Row 1: Desfazer + Pausar/Retomar */}
          <div className="flex gap-[var(--space-md)]">
            <Button
              variant="Secondary"
              size="Large"
              className="flex-1"
              onClick={handleUndo}
              disabled={loadingUndo || localEvents.length === 0}
            >
              <Undo2 size={18} />
              {loadingUndo ? "Desfazendo..." : "Desfazer"}
            </Button>
            <Button
              variant="Secondary"
              size="Large"
              className="flex-1"
              onClick={handlePauseResume}
              disabled={loadingPause}
            >
              {match.status === "LIVE" ? (
                <>
                  <Pause size={18} />
                  {loadingPause ? "Pausando..." : "Pausar"}
                </>
              ) : (
                <>
                  <Play size={18} />
                  {loadingPause ? "Retomando..." : "Retomar"}
                </>
              )}
            </Button>
          </div>
          {/* Row 2: Encerrar partida */}
          <Button
            variant="Ghost"
            size="Large"
            className="w-full"
            onClick={handleEnd}
            disabled={loadingEnd}
          >
            {loadingEnd ? "Encerrando..." : "Encerrar partida"}
          </Button>
        </div>
      )}
    </div>
  );
}
