import { prisma } from "../../lib/prisma.js";
import { Prisma } from "@prisma/client";
import { getIo } from "../../socket.js";
import { GOALS_TO_WIN } from "@fut/shared";
import type { CreateGoalInput } from "@fut/shared";
import { computeRotation, applyRotation } from "./rotation.service.js";
import type { DrawTeamSnapshot, WeightMap, RotationResult, PrismaTx } from "./rotation.service.js";

// ── helpers ────────────────────────────────────────────────────────────────────

function makeError(
  message: string,
  status: number,
  code: string,
): Error & { status: number; code: string } {
  const error = new Error(message) as Error & { status: number; code: string };
  error.status = status;
  error.code = code;
  return error;
}

// ── types ──────────────────────────────────────────────────────────────────────

export interface MatchForOrg {
  id: string;
  roomId: string;
  number: number;
  teamAId: string;
  teamBId: string;
  teamAPlayerIds: string[];
  teamBPlayerIds: string[];
  limitSeconds: number;
  status: "LIVE" | "PAUSED" | "FINISHED";
  startedAt: string; // ISO
  elapsedSeconds: number;
  scoreA: number;
  scoreB: number;
  winnerTeamId: string | null;
  endReason: string | null;
  endedAt: string | null;
}

export type MatchForMember = MatchForOrg;

interface MatchStatePayload {
  matchId: string;
  status: "LIVE" | "PAUSED" | "FINISHED";
  elapsedSeconds: number;
  startedAt: string;
  limitSeconds: number;
  serverNow: string;
  scoreA: number;
  scoreB: number;
}

// ── matchState helper ──────────────────────────────────────────────────────────

function matchState(match: MatchForOrg): MatchStatePayload {
  const now = new Date().toISOString();
  return {
    matchId: match.id,
    status: match.status,
    elapsedSeconds: match.elapsedSeconds,
    startedAt: match.startedAt,
    limitSeconds: match.limitSeconds,
    serverNow: now,
    scoreA: match.scoreA,
    scoreB: match.scoreB,
  };
}

// ── DB row → MatchForOrg ───────────────────────────────────────────────────────

type PrismaMatch = {
  id: string;
  roomId: string;
  number: number;
  teamAId: string;
  teamBId: string;
  teamAPlayerIds: string[];
  teamBPlayerIds: string[];
  limitSeconds: number;
  status: "LIVE" | "PAUSED" | "FINISHED";
  startedAt: Date;
  elapsedSeconds: number;
  scoreA: number;
  scoreB: number;
  winnerTeamId: string | null;
  endReason: "GOALS" | "TIME" | "MANUAL" | null;
  endedAt: Date | null;
};

function toMatchForOrg(match: PrismaMatch): MatchForOrg {
  return {
    id: match.id,
    roomId: match.roomId,
    number: match.number,
    teamAId: match.teamAId,
    teamBId: match.teamBId,
    teamAPlayerIds: match.teamAPlayerIds,
    teamBPlayerIds: match.teamBPlayerIds,
    limitSeconds: match.limitSeconds,
    status: match.status,
    startedAt: match.startedAt.toISOString(),
    elapsedSeconds: match.elapsedSeconds,
    scoreA: match.scoreA,
    scoreB: match.scoreB,
    winnerTeamId: match.winnerTeamId,
    endReason: match.endReason,
    endedAt: match.endedAt ? match.endedAt.toISOString() : null,
  };
}

// ── timer registry ─────────────────────────────────────────────────────────────

const timers = new Map<string, ReturnType<typeof setTimeout>>();

export function scheduleMatchTimer(matchId: string, delayMs: number): void {
  clearMatchTimer(matchId);
  const handle = setTimeout(() => {
    void _expireMatch(matchId);
  }, delayMs);
  timers.set(matchId, handle);
}

export function clearMatchTimer(matchId: string): void {
  const handle = timers.get(matchId);
  if (handle !== undefined) {
    clearTimeout(handle);
    timers.delete(matchId);
  }
}

// ── organizer guard ────────────────────────────────────────────────────────────

async function requireOrganizer(userId: string, roomId: string): Promise<void> {
  const member = await prisma.roomMember.findFirst({
    where: { roomId, userId, role: { in: ["ORGANIZER", "CO_ORGANIZER"] }, status: "CONFIRMED" },
    select: { id: true },
  });
  if (!member) throw makeError("Apenas organizadores podem realizar esta ação.", 403, "NOT_ORGANIZER");
}

// ── score calculation ──────────────────────────────────────────────────────────

async function recalcScore(
  matchId: string,
  teamAId: string,
  teamBId: string,
): Promise<{ scoreA: number; scoreB: number }> {
  const events = await prisma.matchEvent.findMany({
    where: { matchId, undoneAt: null },
    select: { type: true, teamId: true },
  });

  return calcScoreFromEvents(events, teamAId, teamBId);
}

// teamId always = the team that benefits (gets the point), for both GOAL and OWN_GOAL
function calcScoreFromEvents(
  events: Array<{ type: string; teamId: string }>,
  teamAId: string,
  teamBId: string,
): { scoreA: number; scoreB: number } {
  let scoreA = 0;
  let scoreB = 0;

  for (const ev of events) {
    if (ev.teamId === teamAId) {
      scoreA++;
    } else if (ev.teamId === teamBId) {
      scoreB++;
    }
  }

  return { scoreA, scoreB };
}

// ── save rotation helper ───────────────────────────────────────────────────────

async function saveRotation(
  matchId: string,
  roomId: string,
  winnerTeamId: string | null,
  tx?: Omit<typeof prisma, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">,
): Promise<RotationResult | null> {
  const client = tx ?? prisma;

  // Load room settings
  const room = await client.room.findUnique({
    where: { id: roomId },
    select: { winnerRule: true, maxStarsPerTeam: true, ownerId: true },
  });
  if (!room) return null;

  // Load latest draw's teams
  const draw = await client.draw.findFirst({
    where: { roomId },
    orderBy: { createdAt: "desc" },
    select: {
      teams: {
        select: {
          id: true,
          playerIds: true,
          queuePosition: true,
          consecutiveWins: true,
        },
      },
    },
  });
  if (!draw || draw.teams.length === 0) return null;

  const teams: DrawTeamSnapshot[] = draw.teams.map((t) => ({
    id: t.id,
    playerIds: t.playerIds,
    queuePosition: t.queuePosition,
    consecutiveWins: t.consecutiveWins,
  }));

  // Load weights (room owner's assessments)
  const allPlayerIds = teams.flatMap((t) => t.playerIds);
  const storedWeights = await client.playerWeight.findMany({
    where: { ownerId: room.ownerId, playerId: { in: allPlayerIds } },
    select: { playerId: true, level: true },
  });
  const weights: WeightMap = Object.fromEntries(
    storedWeights.map((w) => [w.playerId, w.level as "REGULAR" | "GOOD" | "STAR"]),
  );

  const result = computeRotation({
    winnerTeamId,
    winnerRule: room.winnerRule as "ALWAYS" | "MAX_2_WINS",
    maxStarsPerTeam: room.maxStarsPerTeam,
    teams,
    weights,
  });

  await client.rotation.create({
    data: {
      matchId,
      kind: result.kind,
      swaps: result.swaps as unknown as import("@prisma/client").Prisma.InputJsonValue,
      courtAfter: result.courtAfter,
      queueAfter: result.queueAfter,
    },
  });

  // Apply rotation to DrawTeam rows
  await applyRotation(teams, result, client as unknown as PrismaTx);

  return result;
}

// ── service functions ──────────────────────────────────────────────────────────

export async function startMatch(userId: string, roomId: string): Promise<MatchForOrg> {
  await requireOrganizer(userId, roomId);

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: { status: true, matchMinutes: true },
  });
  if (!room) throw makeError("Sala não encontrada.", 404, "ROOM_NOT_FOUND");

  if (room.status === "OPEN" || room.status === "LOCKED") {
    throw makeError("A sala ainda não foi iniciada.", 400, "ROOM_NOT_STARTED");
  }
  if (room.status !== "DRAWN" && room.status !== "LIVE") {
    throw makeError("A sala não está em um estado válido para iniciar partida.", 400, "ROOM_NOT_STARTED");
  }

  // Check for active match
  const activeMatch = await prisma.match.findFirst({
    where: { roomId, status: { in: ["LIVE", "PAUSED"] } },
    select: { id: true },
  });
  if (activeMatch) {
    throw makeError("Já existe uma partida em andamento.", 409, "MATCH_IN_PROGRESS");
  }

  // Get latest draw
  const draw = await prisma.draw.findFirst({
    where: { roomId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      teams: {
        where: { queuePosition: null },
        select: { id: true, playerIds: true },
      },
    },
  });
  if (!draw || draw.teams.length < 2) {
    throw makeError("Não há dois times em quadra para iniciar a partida.", 400, "NO_TEAMS_ON_COURT");
  }

  const teamA = draw.teams[0]!;
  const teamB = draw.teams[1]!;

  // Count existing matches for numbering
  const matchCount = await prisma.match.count({ where: { roomId } });

  const now = new Date();
  const limitSeconds = room.matchMinutes * 60;

  // Transaction: create match + optionally update room status
  const match = await prisma.$transaction(async (tx) => {
    const created = await tx.match.create({
      data: {
        roomId,
        number: matchCount + 1,
        teamAId: teamA.id,
        teamBId: teamB.id,
        teamAPlayerIds: teamA.playerIds,
        teamBPlayerIds: teamB.playerIds,
        limitSeconds,
        status: "LIVE",
        startedAt: now,
        elapsedSeconds: 0,
        scoreA: 0,
        scoreB: 0,
        createdById: userId,
      },
    });

    if (room.status === "DRAWN") {
      await tx.room.update({
        where: { id: roomId },
        data: { status: "LIVE" },
      });
    }

    return created;
  });

  // Schedule timer
  scheduleMatchTimer(match.id, limitSeconds * 1000);

  const result = toMatchForOrg(match as PrismaMatch);

  // Emit socket event
  try {
    getIo().to(`room:${roomId}`).emit("match:started", matchState(result));
  } catch { /* socket not initialized in tests */ }

  return result;
}

export async function pauseMatch(userId: string, matchId: string): Promise<MatchForOrg> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      id: true, roomId: true, number: true, teamAId: true, teamBId: true,
      teamAPlayerIds: true, teamBPlayerIds: true, limitSeconds: true,
      status: true, startedAt: true, elapsedSeconds: true,
      scoreA: true, scoreB: true, winnerTeamId: true, endReason: true, endedAt: true,
    },
  });
  if (!match) throw makeError("Partida não encontrada.", 404, "NOT_FOUND");

  if (match.status === "FINISHED") throw makeError("A partida já foi encerrada.", 409, "MATCH_FINISHED");
  if (match.status === "PAUSED") throw makeError("A partida já está pausada.", 409, "MATCH_PAUSED");

  await requireOrganizer(userId, match.roomId);

  const now = new Date();
  const additionalSeconds = Math.floor((now.getTime() - match.startedAt.getTime()) / 1000);
  const newElapsed = match.elapsedSeconds + additionalSeconds;

  const updated = await prisma.$transaction(async (tx) => {
    return tx.match.update({
      where: { id: matchId },
      data: {
        status: "PAUSED",
        elapsedSeconds: newElapsed,
        startedAt: now,
      },
    });
  });

  clearMatchTimer(matchId);

  const result = toMatchForOrg(updated as PrismaMatch);

  try {
    getIo().to(`room:${match.roomId}`).emit("match:paused", matchState(result));
  } catch { /* socket not initialized in tests */ }

  return result;
}

export async function resumeMatch(userId: string, matchId: string): Promise<MatchForOrg> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      id: true, roomId: true, number: true, teamAId: true, teamBId: true,
      teamAPlayerIds: true, teamBPlayerIds: true, limitSeconds: true,
      status: true, startedAt: true, elapsedSeconds: true,
      scoreA: true, scoreB: true, winnerTeamId: true, endReason: true, endedAt: true,
    },
  });
  if (!match) throw makeError("Partida não encontrada.", 404, "NOT_FOUND");

  if (match.status === "FINISHED") throw makeError("A partida já foi encerrada.", 409, "MATCH_FINISHED");
  if (match.status === "LIVE") throw makeError("A partida já está em andamento.", 409, "MATCH_IN_PROGRESS");

  await requireOrganizer(userId, match.roomId);

  const now = new Date();
  const updated = await prisma.$transaction(async (tx) => {
    return tx.match.update({
      where: { id: matchId },
      data: {
        status: "LIVE",
        startedAt: now,
      },
    });
  });

  const remainingSeconds = match.limitSeconds - match.elapsedSeconds;
  scheduleMatchTimer(matchId, Math.max(0, remainingSeconds) * 1000);

  const result = toMatchForOrg(updated as PrismaMatch);

  try {
    getIo().to(`room:${match.roomId}`).emit("match:resumed", matchState(result));
  } catch { /* socket not initialized in tests */ }

  return result;
}

export async function addGoal(
  userId: string,
  matchId: string,
  input: CreateGoalInput,
): Promise<MatchForOrg> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      id: true, roomId: true, number: true, teamAId: true, teamBId: true,
      teamAPlayerIds: true, teamBPlayerIds: true, limitSeconds: true,
      status: true, startedAt: true, elapsedSeconds: true,
      scoreA: true, scoreB: true, winnerTeamId: true, endReason: true, endedAt: true,
    },
  });
  if (!match) throw makeError("Partida não encontrada.", 404, "NOT_FOUND");

  if (match.status === "PAUSED") throw makeError("A partida está pausada.", 409, "MATCH_PAUSED");
  if (match.status === "FINISHED") throw makeError("A partida já foi encerrada.", 409, "MATCH_FINISHED");

  await requireOrganizer(userId, match.roomId);

  // Validate teamId
  if (input.teamId !== match.teamAId && input.teamId !== match.teamBId) {
    throw makeError("Time não encontrado nesta partida.", 404, "NOT_FOUND");
  }

  const scoringTeamPlayerIds = input.teamId === match.teamAId ? match.teamAPlayerIds : match.teamBPlayerIds;
  const otherTeamPlayerIds = input.teamId === match.teamAId ? match.teamBPlayerIds : match.teamAPlayerIds;

  if (input.ownGoal === true) {
    // Own goal: scorerId optional; if provided, must be in OTHER team
    if (input.scorerId && !otherTeamPlayerIds.includes(input.scorerId)) {
      throw makeError("Marcador inválido para gol contra.", 422, "INVALID_SCORER");
    }
    if (input.assistId) {
      throw makeError("Assistência não é permitida em gol contra.", 422, "INVALID_ASSIST");
    }
  } else {
    // Regular goal: scorerId is required and must be in scoring team
    if (!input.scorerId || !scoringTeamPlayerIds.includes(input.scorerId)) {
      throw makeError("Marcador inválido: jogador não pertence ao time.", 422, "INVALID_SCORER");
    }
    if (input.assistId) {
      if (!scoringTeamPlayerIds.includes(input.assistId)) {
        throw makeError("Assistente inválido: jogador não pertence ao time.", 422, "INVALID_ASSIST");
      }
      if (input.assistId === input.scorerId) {
        throw makeError("Assistente não pode ser o mesmo que o marcador.", 422, "INVALID_ASSIST");
      }
    }
  }

  // Compute elapsed at time of goal
  const now = new Date();
  const atSecond = match.elapsedSeconds + Math.floor((now.getTime() - match.startedAt.getTime()) / 1000);

  // Serializable isolation ensures concurrent addGoal calls are ordered by the DB,
  // preventing double-finish or score exceeding GOALS_TO_WIN under race conditions.
  const eventType = input.ownGoal === true ? "OWN_GOAL" : "GOAL";

  let rotationResult: ReturnType<typeof computeRotation> | null = null;

  const updated = await prisma.$transaction(async (tx) => {
    // Create the event
    await tx.matchEvent.create({
      data: {
        matchId,
        type: eventType,
        teamId: input.teamId,
        scorerId: input.scorerId ?? null,
        assistId: input.assistId ?? null,
        atSecond,
        createdById: userId,
      },
    });

    // Recalculate scores from all non-undone events
    const events = await tx.matchEvent.findMany({
      where: { matchId, undoneAt: null },
      select: { type: true, teamId: true },
    });

    const { scoreA, scoreB } = calcScoreFromEvents(events, match.teamAId, match.teamBId);

    // Check if match should end
    const isOver = scoreA >= GOALS_TO_WIN || scoreB >= GOALS_TO_WIN;

    if (isOver) {
      const winnerTeamId = scoreA === scoreB
        ? null
        : scoreA >= GOALS_TO_WIN
          ? match.teamAId
          : match.teamBId;

      const endedAt = new Date();
      const finishedMatch = await tx.match.update({
        where: { id: matchId },
        data: {
          scoreA,
          scoreB,
          status: "FINISHED",
          endReason: "GOALS",
          winnerTeamId,
          endedAt,
        },
      });

      rotationResult = await saveRotation(matchId, match.roomId, winnerTeamId, tx);

      return finishedMatch;
    }

    return tx.match.update({
      where: { id: matchId },
      data: { scoreA, scoreB },
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  const result = toMatchForOrg(updated as PrismaMatch);

  if (result.status === "FINISHED") {
    clearMatchTimer(matchId);

    try {
      getIo().to(`room:${match.roomId}`).emit("match:ended", {
        ...matchState(result),
        rotation: rotationResult,
      });
    } catch { /* socket not initialized in tests */ }
  } else {
    try {
      getIo().to(`room:${match.roomId}`).emit("match:goal", matchState(result));
    } catch { /* socket not initialized in tests */ }
  }

  return result;
}

export async function undoLastGoal(userId: string, matchId: string): Promise<MatchForOrg> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      id: true, roomId: true, number: true, teamAId: true, teamBId: true,
      teamAPlayerIds: true, teamBPlayerIds: true, limitSeconds: true,
      status: true, startedAt: true, elapsedSeconds: true,
      scoreA: true, scoreB: true, winnerTeamId: true, endReason: true, endedAt: true,
    },
  });
  if (!match) throw makeError("Partida não encontrada.", 404, "NOT_FOUND");

  if (match.status === "FINISHED") throw makeError("A partida já foi encerrada.", 409, "MATCH_FINISHED");

  await requireOrganizer(userId, match.roomId);

  const updated = await prisma.$transaction(async (tx) => {
    // Find the most recent undone-at-null event
    const lastEvent = await tx.matchEvent.findFirst({
      where: { matchId, undoneAt: null },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });

    if (!lastEvent) {
      throw makeError("Nenhum gol para desfazer.", 404, "NO_EVENTS");
    }

    await tx.matchEvent.update({
      where: { id: lastEvent.id },
      data: { undoneAt: new Date() },
    });

    // Recalculate scores
    const undoEvents = await tx.matchEvent.findMany({
      where: { matchId, undoneAt: null },
      select: { type: true, teamId: true },
    });

    const { scoreA: newScoreA, scoreB: newScoreB } = calcScoreFromEvents(
      undoEvents,
      match.teamAId,
      match.teamBId,
    );

    return tx.match.update({
      where: { id: matchId },
      data: { scoreA: newScoreA, scoreB: newScoreB },
    });
  });

  const result = toMatchForOrg(updated as PrismaMatch);

  try {
    getIo().to(`room:${match.roomId}`).emit("match:goal-undone", matchState(result));
  } catch { /* socket not initialized in tests */ }

  return result;
}

export async function endMatch(userId: string, matchId: string): Promise<MatchForOrg> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      id: true, roomId: true, number: true, teamAId: true, teamBId: true,
      teamAPlayerIds: true, teamBPlayerIds: true, limitSeconds: true,
      status: true, startedAt: true, elapsedSeconds: true,
      scoreA: true, scoreB: true, winnerTeamId: true, endReason: true, endedAt: true,
    },
  });
  if (!match) throw makeError("Partida não encontrada.", 404, "NOT_FOUND");

  if (match.status === "FINISHED") throw makeError("A partida já foi encerrada.", 409, "MATCH_FINISHED");

  await requireOrganizer(userId, match.roomId);

  clearMatchTimer(matchId);

  const winnerTeamId = match.scoreA > match.scoreB
    ? match.teamAId
    : match.scoreB > match.scoreA
      ? match.teamBId
      : null;

  const endedAt = new Date();
  let endMatchRotation: RotationResult | null = null;

  const updated = await prisma.$transaction(async (tx) => {
    const finishedMatch = await tx.match.update({
      where: { id: matchId },
      data: {
        status: "FINISHED",
        endReason: "MANUAL",
        winnerTeamId,
        endedAt,
      },
    });

    endMatchRotation = await saveRotation(matchId, match.roomId, winnerTeamId, tx);

    return finishedMatch;
  });

  const result = toMatchForOrg(updated as PrismaMatch);

  try {
    getIo().to(`room:${match.roomId}`).emit("match:ended", {
      ...matchState(result),
      rotation: endMatchRotation,
    });
  } catch { /* socket not initialized in tests */ }

  return result;
}

export async function getMatch(userId: string, matchId: string): Promise<MatchForMember> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      id: true, roomId: true, number: true, teamAId: true, teamBId: true,
      teamAPlayerIds: true, teamBPlayerIds: true, limitSeconds: true,
      status: true, startedAt: true, elapsedSeconds: true,
      scoreA: true, scoreB: true, winnerTeamId: true, endReason: true, endedAt: true,
    },
  });
  if (!match) throw makeError("Partida não encontrada.", 404, "NOT_FOUND");

  // Auth: must be confirmed member or org/co-org — don't leak existence, return 404
  const member = await prisma.roomMember.findFirst({
    where: {
      roomId: match.roomId,
      userId,
      status: "CONFIRMED",
    },
    select: { id: true },
  });
  if (!member) throw makeError("Partida não encontrada.", 404, "NOT_FOUND");

  return toMatchForOrg(match as PrismaMatch);
}

export async function getMatchesForRoom(userId: string, roomId: string): Promise<MatchForMember[]> {
  // Auth: must be confirmed member or org/co-org
  const member = await prisma.roomMember.findFirst({
    where: {
      roomId,
      userId,
      status: "CONFIRMED",
    },
    select: { id: true },
  });
  if (!member) throw makeError("Sala não encontrada.", 404, "NOT_FOUND");

  const matches = await prisma.match.findMany({
    where: { roomId },
    orderBy: { number: "asc" },
    select: {
      id: true, roomId: true, number: true, teamAId: true, teamBId: true,
      teamAPlayerIds: true, teamBPlayerIds: true, limitSeconds: true,
      status: true, startedAt: true, elapsedSeconds: true,
      scoreA: true, scoreB: true, winnerTeamId: true, endReason: true, endedAt: true,
    },
  });

  return matches.map((m) => toMatchForOrg(m as PrismaMatch));
}

export async function _expireMatch(matchId: string): Promise<void> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      id: true, roomId: true, number: true, teamAId: true, teamBId: true,
      teamAPlayerIds: true, teamBPlayerIds: true, limitSeconds: true,
      status: true, startedAt: true, elapsedSeconds: true,
      scoreA: true, scoreB: true, winnerTeamId: true, endReason: true, endedAt: true,
    },
  });

  if (!match || match.status === "FINISHED") return;

  const now = new Date();
  const elapsed = match.elapsedSeconds + Math.floor((now.getTime() - match.startedAt.getTime()) / 1000);

  // Race guard: if still time remaining, reschedule
  if (elapsed < match.limitSeconds) {
    const remainingMs = (match.limitSeconds - elapsed) * 1000;
    scheduleMatchTimer(matchId, remainingMs);
    return;
  }

  clearMatchTimer(matchId);

  const { scoreA, scoreB } = await recalcScore(matchId, match.teamAId, match.teamBId);
  const winnerTeamId = scoreA > scoreB ? match.teamAId : scoreB > scoreA ? match.teamBId : null;

  const endedAt = new Date();
  let expireRotation: RotationResult | null = null;

  const updated = await prisma.$transaction(async (tx) => {
    const finishedMatch = await tx.match.update({
      where: { id: matchId },
      data: {
        status: "FINISHED",
        endReason: "TIME",
        winnerTeamId,
        endedAt,
        elapsedSeconds: elapsed,
      },
    });

    expireRotation = await saveRotation(matchId, match.roomId, winnerTeamId, tx);

    return finishedMatch;
  });

  const result = toMatchForOrg(updated as PrismaMatch);

  try {
    getIo().to(`room:${match.roomId}`).emit("match:ended", {
      ...matchState(result),
      rotation: expireRotation,
    });
  } catch { /* socket not initialized */ }
}
