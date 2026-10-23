"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Undo2, Pause, Play, ArrowLeftRight } from "lucide-react";
import useSWR from "swr";
import { GOALS_TO_WIN } from "@fut/shared";
import { useRoom } from "../../../../../hooks/useRoom";
import { useRoomSession } from "../../../../../hooks/useRoomSession";
import type { SessionTeam, SessionMatch } from "../../../../../hooks/useRoomSession";
import { useMatchTimer } from "../../../../../hooks/useMatchTimer";
import { useWeights } from "../../../../../hooks/useWeights";
import { getSocket } from "../../../../../lib/socket";
import { pauseMatch, resumeMatch, endMatch, undoLastGoal, startMatch } from "../../../../../lib/matchApi";
import { apiFetch } from "../../../../../lib/api";
import { keys } from "../../../../../lib/keys";
import { Badge } from "../../../../../components/ui/Badge";
import { Button } from "../../../../../components/ui/Button";
import { WeightChip } from "../../../../../components/ui/WeightChip";
import { GoalSheet } from "./GoalSheet";

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

type SwapEntry = {
  teamId: string;
  withTeamId: string;
  outPlayerIds: string[];
  inPlayerIds: string[];
};

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
  const { weights } = useWeights(id);

  // Server clock offset (from latest socket event)
  const offsetRef = useRef<number>(0);

  // Local match events (not persisted across reloads)
  const [localEvents, setLocalEvents] = useState<LocalEvent[]>([]);

  // Goal team id — opens GoalSheet when set
  const [goalTeamId, setGoalTeamId] = useState<string | null>(null);

  // Finished match state (Tela 12)
  const [finishedMatch, setFinishedMatch] = useState<SessionMatch | null>(null);

  // Per-button loading states
  const [loadingUndo, setLoadingUndo] = useState(false);
  const [loadingPause, setLoadingPause] = useState(false);
  const [loadingEnd, setLoadingEnd] = useState(false);
  const [loadingStart, setLoadingStart] = useState(false);

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

  // Page-reload recovery: if no currentMatch but lastRotation exists, fetch the last match
  const needsFinishedMatch = !match && !!session?.lastRotation && !finishedMatch;
  const { data: matchesList } = useSWR<SessionMatch[]>(
    needsFinishedMatch ? keys.matches(id) : null,
    (path: string) => apiFetch<SessionMatch[]>(path),
  );

  useEffect(() => {
    if (matchesList && matchesList.length > 0 && !finishedMatch) {
      const last = matchesList[0];
      setFinishedMatch(last ?? null);
    }
  }, [matchesList, finishedMatch]);

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

    function handleMatchEnded(data: MatchEventPayload) {
      offsetRef.current = new Date(data.serverNow).getTime() - Date.now();
      // Capture match state before mutateSession clears currentMatch
      const currentMatch = sessionRef.current?.currentMatch;
      if (currentMatch) {
        setFinishedMatch({
          ...currentMatch,
          status: "FINISHED",
          scoreA: data.scoreA,
          scoreB: data.scoreB,
        });
      }
      mutateSession();
    }

    socket.on("match:started", handleStarted);
    socket.on("match:goal", handleGoal);
    socket.on("match:goal-undone", handleGoalUndone);
    socket.on("match:paused", handlePaused);
    socket.on("match:resumed", handleResumed);
    socket.on("match:ended", handleMatchEnded);

    return () => {
      socket.off("match:started", handleStarted);
      socket.off("match:goal", handleGoal);
      socket.off("match:goal-undone", handleGoalUndone);
      socket.off("match:paused", handlePaused);
      socket.off("match:resumed", handleResumed);
      socket.off("match:ended", handleMatchEnded);
      socket.emit("room:leave", id);
      socket.disconnect();
    };
  }, [id]);

  // ---------------------------------------------------------------------------
  // Timer
  // ---------------------------------------------------------------------------
  const { elapsedStr, limitStr, elapsedSeconds: timerElapsed } = useMatchTimer({
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

  // FINISHED state
  const isFinishedState = !match && !!session.lastRotation;
  const effectiveFinishedMatch = finishedMatch ?? (matchesList?.[0] ?? null);

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

  async function handleStartNextMatch() {
    setLoadingStart(true);
    try {
      await startMatch(id);
      setFinishedMatch(null);
      await mutateSession();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setLoadingStart(false);
    }
  }

  // ---------------------------------------------------------------------------
  // FINISHED state (Tela 12)
  // ---------------------------------------------------------------------------
  if (isFinishedState && effectiveFinishedMatch) {
    const fm = effectiveFinishedMatch;
    const finTeamA = session.teams.find((t) => t.id === fm.teamAId);
    const finTeamB = session.teams.find((t) => t.id === fm.teamBId);
    const winnerIsA = fm.winnerTeamId === fm.teamAId;
    const winnerIsB = fm.winnerTeamId === fm.teamBId;
    const nextMatchNumber = fm.number + 1;

    // Result subtitle
    let resultSubtitle = "Empate";
    if (fm.winnerTeamId) {
      const winnerTeam = session.teams.find((t) => t.id === fm.winnerTeamId);
      const wins = winnerTeam?.consecutiveWins ?? 1;
      const ordinal = wins === 1 ? "1ª" : `${wins}ª`;
      resultSubtitle = `${winnerTeam?.name ?? "Time"} venceu · ${ordinal} vitória seguida`;
    }

    // Swap section
    const rotation = session.lastRotation!;
    const swaps = rotation.swaps as SwapEntry[];
    const hasSwaps = swaps && swaps.length > 0 && rotation.kind !== "NONE";

    // Helper to resolve member name
    function resolveMemberName(userId: string): string {
      const member = room?.members.find((m) => m.user.id === userId);
      return member?.user.nickname ?? member?.user.name ?? userId;
    }

    // Next match teams
    const courtTeams = rotation.courtAfter
      .map((tid) => session.teams.find((t) => t.id === tid)?.name ?? "?");
    const queueNames = rotation.queueAfter
      .map((tid) => session.teams.find((t) => t.id === tid)?.name ?? "?");

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
              <p className="text-heading-h3 text-text-primary">
                Partida {fm.number} encerrada
              </p>
              <p className="text-caption-regular text-text-secondary truncate">
                {room?.title ?? ""}
              </p>
            </div>
          </div>

          {/* Result card */}
          <div className="bg-bg-surface border border-border-default rounded-lg p-[var(--space-lg)] flex flex-col gap-[var(--space-md)]">
            <div className="flex items-center justify-center gap-[var(--space-lg)]">
              <p className="text-body-strong text-text-primary text-right flex-1">{finTeamA?.name ?? ""}</p>
              <p className={`text-display-h1 ${winnerIsA ? "text-accent-default" : "text-text-primary"}`}>
                {fm.scoreA}
              </p>
              <p className="text-heading-h3 text-text-muted">x</p>
              <p className={`text-display-h1 ${winnerIsB ? "text-accent-default" : "text-text-primary"}`}>
                {fm.scoreB}
              </p>
              <p className="text-body-strong text-text-primary flex-1">{finTeamB?.name ?? ""}</p>
            </div>
            <p className="text-caption-regular text-text-secondary text-center">{resultSubtitle}</p>
          </div>

          {/* TROCAS SORTEADAS section */}
          <div className="bg-bg-surface border border-border-default rounded-lg p-[var(--space-lg)] flex flex-col gap-[var(--space-md)]">
            <p className="text-overline text-text-muted">Trocas sorteadas</p>

            {!hasSwaps ? (
              <p className="text-caption-regular text-text-muted">Sem trocas nesta rodada.</p>
            ) : (
              <>
                {/* Description text */}
                {(() => {
                  const firstSwap = swaps[0];
                  if (!firstSwap) return null;
                  return (
                    <p className="text-caption-regular text-text-secondary">
                      {session.teams.find((t) => t.id === firstSwap.teamId)?.name ?? "Time"} perdeu e troca{" "}
                      {firstSwap.outPlayerIds.length} jogador{firstSwap.outPlayerIds.length !== 1 ? "es" : ""} com{" "}
                      {session.teams.find((t) => t.id === firstSwap.withTeamId)?.name ?? "Time"}, a última barreira,
                      por peso equivalente.
                    </p>
                  );
                })()}

                {/* Swap rows */}
                {swaps.map((swap, swapIdx) => {
                  const loserTeamName = session.teams.find((t) => t.id === swap.teamId)?.name ?? "?";
                  const barrierTeamName = session.teams.find((t) => t.id === swap.withTeamId)?.name ?? "?";
                  return swap.outPlayerIds.map((outId, pairIdx) => {
                    const inId = swap.inPlayerIds[pairIdx];
                    const outPlayerName = resolveMemberName(outId);
                    const inPlayerName = inId ? resolveMemberName(inId) : "?";
                    const outLevel = isOrgOrCoOrg ? weights.find((w) => w.playerId === outId)?.level : undefined;
                    const inLevel = isOrgOrCoOrg && inId ? weights.find((w) => w.playerId === inId)?.level : undefined;

                    return (
                      <div
                        key={`${swapIdx}-${pairIdx}`}
                        className="bg-bg-raised rounded-[var(--radius-md)] p-[var(--space-md)] flex items-center gap-[8px]"
                      >
                        {/* Left side: loser player */}
                        <div className="flex-1 flex flex-col gap-[var(--space-xs)]">
                          <p className="text-caption-regular text-text-muted">Sai do {loserTeamName}</p>
                          <div className="flex items-center gap-[var(--space-sm)]">
                            <p className="text-body-strong text-text-primary">{outPlayerName}</p>
                            {isOrgOrCoOrg && outLevel && <WeightChip level={outLevel} />}
                          </div>
                        </div>
                        <ArrowLeftRight size={18} className="text-text-muted shrink-0" />
                        {/* Right side: barrier player */}
                        <div className="flex-1 flex flex-col gap-[var(--space-xs)]">
                          <p className="text-caption-regular text-text-muted">Sai do {barrierTeamName}</p>
                          <div className="flex items-center gap-[var(--space-sm)]">
                            <p className="text-body-strong text-text-primary">{inPlayerName}</p>
                            {isOrgOrCoOrg && inLevel && <WeightChip level={inLevel} />}
                          </div>
                        </div>
                      </div>
                    );
                  });
                })}
              </>
            )}
          </div>

          {/* PRÓXIMA PARTIDA card */}
          <div className="bg-accent-subtle border border-accent-default rounded-lg p-[var(--space-lg)] flex flex-col gap-[var(--space-sm)]">
            <p className="text-overline text-text-muted">Próxima partida</p>
            <div className="flex items-center gap-[var(--space-md)]">
              <p className="text-caption-strong text-text-secondary flex-1">
                Partida {nextMatchNumber}
              </p>
              <p className="text-heading-h3 text-text-primary">{courtTeams.join(" x ")}</p>
            </div>
            {queueNames.length > 0 && (
              <p className="text-caption-regular text-text-secondary">
                Fila depois: {queueNames.join(", ")}
              </p>
            )}
          </div>
        </div>

        {/* Bottom action bar — org/co-org only */}
        {isOrgOrCoOrg && (
          <div className="bg-bg-sidebar border-t border-border-default pt-[12px] pb-[24px] px-[var(--space-lg)]">
            <Button
              variant="Primary"
              size="Large"
              className="w-full"
              onClick={handleStartNextMatch}
              disabled={loadingStart}
            >
              {loadingStart ? "Iniciando..." : `Iniciar partida ${nextMatchNumber}`}
            </Button>
          </div>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render — LIVE/PAUSED view (Tela 10)
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
              disabled={loadingUndo || (match ? match.scoreA + match.scoreB === 0 : true)}
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

      {/* GoalSheet overlay */}
      {goalTeamId !== null && match && room && (
        <GoalSheet
          matchId={match.id}
          teamId={goalTeamId}
          teamName={session.teams.find((t) => t.id === goalTeamId)?.name ?? ""}
          playerIds={goalTeamId === match.teamAId ? match.teamAPlayerIds : match.teamBPlayerIds}
          otherTeamPlayerIds={goalTeamId === match.teamAId ? match.teamBPlayerIds : match.teamAPlayerIds}
          members={room.members}
          elapsedSeconds={timerElapsed}
          onClose={() => setGoalTeamId(null)}
          onSuccess={() => {
            setGoalTeamId(null);
            void mutateSession();
          }}
        />
      )}
    </div>
  );
}
