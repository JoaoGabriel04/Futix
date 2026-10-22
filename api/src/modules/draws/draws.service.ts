import crypto from "node:crypto";
import { prisma } from "../../lib/prisma.js";
import { getIo } from "../../socket.js";
import { WEIGHT_VALUE } from "@fut/shared";

// ── types ──────────────────────────────────────────────────────────────────────

type DrawPlayer = { userId: string; name: string; playRole: "LINE" | "GOALKEEPER" };
type DrawPlayerWithLevel = DrawPlayer & { level?: "REGULAR" | "GOOD" | "STAR" };
type DrawTeamResultOrg = { id: string; name: string; queuePosition: number | null; players: DrawPlayerWithLevel[]; weightTotal?: number };
export type DrawResultForOrg = {
  id: string;
  roomId: string;
  createdAt: Date;
  teams: DrawTeamResultOrg[];
  leftoverPlayers: DrawPlayerWithLevel[];
  capRelaxed: boolean;
};

// Keep the old type for backward compat with getLatestDraw signature
type DrawTeamResult = { id: string; name: string; players: DrawPlayer[] };
export type DrawResult = { id: string; roomId: string; createdAt: Date; teams: DrawTeamResult[] };

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

// R18 — balanced draw algorithm (pure function, no DB calls)
type R18Input = { userId: string; name: string; level: "REGULAR" | "GOOD" | "STAR" };
type R18Team = { playerIds: string[]; weightTotal: number; starCount: number };
type R18Result = {
  teams: R18Team[];
  leftoverIds: string[];
  capRelaxed: boolean;
};

export function balancedDraw(players: R18Input[], teamSize: number, maxStarsPerTeam: number): R18Result {
  const n = players.length;
  const numTeams = Math.max(2, Math.floor(n / teamSize));
  const leftoverCount = n - numTeams * teamSize;

  // Step 2: Randomly select leftovers using crypto.randomInt
  const pool = [...players];
  const leftovers: R18Input[] = [];
  for (let i = 0; i < leftoverCount; i++) {
    const idx = crypto.randomInt(pool.length);
    leftovers.push(pool.splice(idx, 1)[0]!);
  }
  const leftoverIds = leftovers.map((p) => p.userId);

  // Initialize team buckets
  const teams: R18Team[] = Array.from({ length: numTeams }, () => ({
    playerIds: [],
    weightTotal: 0,
    starCount: 0,
  }));

  // Check if capRelaxed is needed
  const totalStars = pool.filter((p) => p.level === "STAR").length;
  let effectiveMaxStars = maxStarsPerTeam;
  let capRelaxed = false;
  if (totalStars > maxStarsPerTeam * numTeams) {
    effectiveMaxStars = Math.ceil(totalStars / numTeams);
    capRelaxed = true;
  }

  // Step 3: assign by level STAR -> GOOD -> REGULAR
  for (const level of ["STAR", "GOOD", "REGULAR"] as const) {
    const levelPlayers = pool.filter((p) => p.level === level);
    // Fisher-Yates shuffle the level group
    for (let i = levelPlayers.length - 1; i > 0; i--) {
      const j = crypto.randomInt(i + 1);
      [levelPlayers[i], levelPlayers[j]] = [levelPlayers[j]!, levelPlayers[i]!];
    }

    for (const player of levelPlayers) {
      // Find eligible teams: capacity remaining AND (if STAR) starCount < effectiveMaxStars
      let candidates = teams.filter(
        (t) => t.playerIds.length < teamSize &&
          (level !== "STAR" || t.starCount < effectiveMaxStars),
      );

      if (candidates.length === 0) {
        // capRelaxed already set; fall back to any team with capacity
        candidates = teams.filter((t) => t.playerIds.length < teamSize);
      }

      // Among candidates, find those with fewest players of this level
      const levelCounts = candidates.map((t) => {
        const count = t.playerIds.filter((id) => {
          const p = pool.find((pl) => pl.userId === id);
          return p?.level === level;
        }).length;
        return { team: t, levelCount: count };
      });
      const minLevelCount = Math.min(...levelCounts.map((x) => x.levelCount));
      let narrowed = levelCounts.filter((x) => x.levelCount === minLevelCount).map((x) => x.team);

      // Tiebreak: lowest total weight sum
      const minWeight = Math.min(...narrowed.map((t) => t.weightTotal));
      narrowed = narrowed.filter((t) => t.weightTotal === minWeight);

      // Final tiebreak: random
      const chosen = narrowed[crypto.randomInt(narrowed.length)]!;

      chosen.playerIds.push(player.userId);
      chosen.weightTotal += WEIGHT_VALUE[level];
      if (level === "STAR") chosen.starCount++;
    }
  }

  return { teams, leftoverIds, capRelaxed };
}

// ── service functions ──────────────────────────────────────────────────────────

export async function startRoom(userId: string, roomId: string): Promise<DrawResultForOrg> {
  // Check ORGANIZER or CO_ORGANIZER
  const member = await prisma.roomMember.findFirst({
    where: { roomId, userId, role: { in: ["ORGANIZER", "CO_ORGANIZER"] }, status: "CONFIRMED" },
    select: { id: true },
  });
  if (!member) throw makeError("Apenas organizadores podem iniciar a sala.", 403, "NOT_ORGANIZER");

  // Load room
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: { status: true, teamSize: true, maxStarsPerTeam: true, ownerId: true },
  });
  if (!room) throw makeError("Sala não encontrada.", 404, "ROOM_NOT_FOUND");
  if (room.status !== "OPEN" && room.status !== "LOCKED") {
    throw makeError("A sala já foi iniciada.", 400, "ROOM_NOT_STARTED");
  }

  // Load confirmed LINE members
  const lineMembers = await prisma.roomMember.findMany({
    where: { roomId, status: "CONFIRMED", playRole: "LINE" },
    select: { userId: true, user: { select: { name: true } } },
  });

  const minPlayers = 2 * room.teamSize;
  if (lineMembers.length < minPlayers) {
    throw makeError(
      `São necessários pelo menos ${minPlayers} jogadores de linha confirmados para iniciar.`,
      400,
      "NOT_ENOUGH_PLAYERS",
    );
  }

  // Load weights
  const playerIds = lineMembers.map((m) => m.userId);
  const storedWeights = await prisma.playerWeight.findMany({
    where: { ownerId: room.ownerId, playerId: { in: playerIds } },
    select: { playerId: true, level: true },
  });
  const weightMap = new Map(storedWeights.map((w) => [w.playerId, w.level as "REGULAR" | "GOOD" | "STAR"]));

  const players = lineMembers.map((m) => ({
    userId: m.userId,
    name: m.user.name,
    level: weightMap.get(m.userId) ?? ("GOOD" as const),
  }));

  // Run balanced draw
  const { teams: drawTeamsResult, leftoverIds, capRelaxed } = balancedDraw(players, room.teamSize, room.maxStarsPerTeam);

  // Build player lookup map
  const playerMap = new Map(players.map((p) => [p.userId, p]));

  // Shuffle team order
  for (let i = drawTeamsResult.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [drawTeamsResult[i], drawTeamsResult[j]] = [drawTeamsResult[j]!, drawTeamsResult[i]!];
  }

  // Assign names and queuePositions
  // Teams 0 and 1 → queuePosition = null (on court)
  // Teams 2+ → queuePosition = 1, 2, ... (queue)
  // Leftovers → separate team "Sem time" with queuePosition = -1
  const teamsData = drawTeamsResult.map((team, i) => ({
    name: `Time ${i + 1}`,
    playerIds: team.playerIds,
    queuePosition: i < 2 ? null : i - 1, // Time 1 and 2 on court; Time 3 → queuePosition 1, etc.
    consecutiveWins: 0,
  }));

  if (leftoverIds.length > 0) {
    teamsData.push({
      name: "Sem time",
      playerIds: leftoverIds,
      queuePosition: -1, // sentinel: leftover, not in rotation
      consecutiveWins: 0,
    });
  }

  // Transaction: update room + create draw
  const [draw] = await prisma.$transaction([
    prisma.draw.create({
      data: {
        roomId,
        createdById: userId,
        teams: { create: teamsData },
      },
      include: { teams: true },
    }),
    prisma.room.update({
      where: { id: roomId },
      data: { status: "DRAWN", startedAt: new Date() },
    }),
  ]);

  // Emit socket event
  try {
    getIo().to(`room:${roomId}`).emit("room:started", { roomId, status: "DRAWN" });
  } catch {}

  // Build response
  const leftoverPlayers = leftoverIds.map((id) => {
    const p = playerMap.get(id)!;
    return { userId: id, name: p.name, playRole: "LINE" as const, level: p.level };
  });

  const responseTeams: DrawTeamResultOrg[] = draw!.teams
    .filter((t) => t.queuePosition !== -1) // exclude "Sem time" from regular teams
    .map((team) => ({
      id: team.id,
      name: team.name,
      queuePosition: team.queuePosition,
      players: team.playerIds.map((pid) => {
        const p = playerMap.get(pid)!;
        return { userId: pid, name: p.name, playRole: "LINE" as const, level: p.level };
      }),
      weightTotal: team.playerIds.reduce((sum, pid) => {
        const p = playerMap.get(pid);
        return sum + (p ? WEIGHT_VALUE[p.level] : WEIGHT_VALUE.GOOD);
      }, 0),
    }));

  return {
    id: draw!.id,
    roomId: draw!.roomId,
    createdAt: draw!.createdAt,
    teams: responseTeams,
    leftoverPlayers,
    capRelaxed,
  };
}

export async function drawTeams(userId: string, roomId: string): Promise<DrawResultForOrg> {
  // Check ORGANIZER or CO_ORGANIZER
  const member = await prisma.roomMember.findFirst({
    where: { roomId, userId, role: { in: ["ORGANIZER", "CO_ORGANIZER"] }, status: "CONFIRMED" },
    select: { id: true },
  });
  if (!member) throw makeError("Apenas organizadores podem realizar o sorteio.", 403, "NOT_ORGANIZER");

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: { status: true, teamSize: true, maxStarsPerTeam: true, ownerId: true },
  });
  if (!room) throw makeError("Sala não encontrada.", 404, "ROOM_NOT_FOUND");

  if (room.status === "OPEN" || room.status === "LOCKED") {
    throw makeError("A sala precisa ser iniciada antes de sortear novamente.", 400, "ROOM_NOT_STARTED");
  }
  if (room.status === "LIVE" || room.status === "FINISHED") {
    throw makeError("O sorteio está bloqueado após o início das partidas.", 423, "DRAW_LOCKED");
  }
  if (room.status !== "DRAWN") {
    throw makeError("Não é possível sortear neste estado.", 400, "INVALID_STATUS");
  }

  // Same logic as startRoom from here on (load players, weights, balancedDraw)
  const lineMembers = await prisma.roomMember.findMany({
    where: { roomId, status: "CONFIRMED", playRole: "LINE" },
    select: { userId: true, user: { select: { name: true } } },
  });

  if (lineMembers.length < 2 * room.teamSize) {
    throw makeError(
      `São necessários pelo menos ${2 * room.teamSize} jogadores de linha confirmados para sortear.`,
      400,
      "NOT_ENOUGH_PLAYERS",
    );
  }

  const playerIds = lineMembers.map((m) => m.userId);
  const storedWeights = await prisma.playerWeight.findMany({
    where: { ownerId: room.ownerId, playerId: { in: playerIds } },
    select: { playerId: true, level: true },
  });
  const weightMap = new Map(storedWeights.map((w) => [w.playerId, w.level as "REGULAR" | "GOOD" | "STAR"]));

  const players = lineMembers.map((m) => ({
    userId: m.userId,
    name: m.user.name,
    level: weightMap.get(m.userId) ?? ("GOOD" as const),
  }));

  const { teams: drawTeamsResult, leftoverIds, capRelaxed } = balancedDraw(players, room.teamSize, room.maxStarsPerTeam);
  const playerMap = new Map(players.map((p) => [p.userId, p]));

  for (let i = drawTeamsResult.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [drawTeamsResult[i], drawTeamsResult[j]] = [drawTeamsResult[j]!, drawTeamsResult[i]!];
  }

  const teamsData = drawTeamsResult.map((team, i) => ({
    name: `Time ${i + 1}`,
    playerIds: team.playerIds,
    queuePosition: i < 2 ? null : i - 1,
    consecutiveWins: 0,
  }));

  if (leftoverIds.length > 0) {
    teamsData.push({ name: "Sem time", playerIds: leftoverIds, queuePosition: -1, consecutiveWins: 0 });
  }

  const [draw] = await prisma.$transaction([
    prisma.draw.create({
      data: { roomId, createdById: userId, teams: { create: teamsData } },
      include: { teams: true },
    }),
  ]);

  try {
    getIo().to(`room:${roomId}`).emit("room:redrawn", { roomId });
  } catch {}

  const leftoverPlayers = leftoverIds.map((id) => {
    const p = playerMap.get(id)!;
    return { userId: id, name: p.name, playRole: "LINE" as const, level: p.level };
  });

  const responseTeams: DrawTeamResultOrg[] = draw!.teams
    .filter((t) => t.queuePosition !== -1)
    .map((team) => ({
      id: team.id,
      name: team.name,
      queuePosition: team.queuePosition,
      players: team.playerIds.map((pid) => {
        const p = playerMap.get(pid)!;
        return { userId: pid, name: p.name, playRole: "LINE" as const, level: p.level };
      }),
      weightTotal: team.playerIds.reduce((sum, pid) => {
        const p = playerMap.get(pid);
        return sum + (p ? WEIGHT_VALUE[p.level] : WEIGHT_VALUE.GOOD);
      }, 0),
    }));

  return { id: draw!.id, roomId: draw!.roomId, createdAt: draw!.createdAt, teams: responseTeams, leftoverPlayers, capRelaxed };
}

export async function getLatestDraw(
  roomId: string,
  userId: string,
): Promise<DrawResultForOrg | null> {
  // Verify userId is a member of the room (any role/status)
  const membership = await prisma.roomMember.findFirst({
    where: { roomId, userId },
    select: { id: true },
  });
  if (!membership) {
    throw makeError("Você não é membro desta sala.", 403, "NOT_MEMBER");
  }

  // Fetch the most recent draw
  const draw = await prisma.draw.findFirst({
    where: { roomId },
    orderBy: { createdAt: "desc" },
    include: { teams: true },
  });

  if (!draw) {
    return null;
  }

  // Collect all playerIds from all teams
  const allPlayerIds = draw.teams.flatMap((t) => t.playerIds);

  // Resolve names via RoomMember + User join
  const members = await prisma.roomMember.findMany({
    where: { roomId, userId: { in: allPlayerIds } },
    select: {
      playRole: true,
      user: { select: { id: true, name: true } },
    },
  });

  const playerMap = new Map<string, { name: string; playRole: "LINE" | "GOALKEEPER" }>();
  for (const m of members) {
    playerMap.set(m.user.id, {
      name: m.user.name,
      playRole: m.playRole as "LINE" | "GOALKEEPER",
    });
  }

  // Extract leftover players (queuePosition === -1 is sentinel for "Sem time")
  const leftoverTeam = draw.teams.find((t) => t.queuePosition === -1);
  const leftoverPlayers: DrawPlayerWithLevel[] = (leftoverTeam?.playerIds ?? []).map((pid) => {
    const info = playerMap.get(pid);
    return { userId: pid, name: info?.name ?? "Desconhecido", playRole: info?.playRole ?? "LINE" };
  });

  const responseTeams: DrawTeamResultOrg[] = draw.teams
    .filter((t) => t.queuePosition !== -1)
    .map((team) => ({
      id: team.id,
      name: team.name,
      queuePosition: team.queuePosition,
      players: team.playerIds.map((pid) => {
        const info = playerMap.get(pid);
        if (!info) {
          return { userId: pid, name: "Desconhecido", playRole: "LINE" as const };
        }
        return { userId: pid, name: info.name, playRole: info.playRole };
      }),
    }));

  return {
    id: draw.id,
    roomId: draw.roomId,
    createdAt: draw.createdAt,
    teams: responseTeams,
    leftoverPlayers,
    capRelaxed: false,
  };
}
