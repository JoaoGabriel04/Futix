import { prisma } from "../../lib/prisma.js";
import { getIo } from "../../socket.js";

// ── types ──────────────────────────────────────────────────────────────────────

type DrawPlayer = { userId: string; name: string; playRole: "LINE" | "GOALKEEPER" };
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

function fisherYatesShuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
}

// ── service functions ──────────────────────────────────────────────────────────

export async function drawTeams(userId: string, roomId: string): Promise<DrawResult> {
  // Check that userId has role ORGANIZER (not CO_ORGANIZER)
  const organizer = await prisma.roomMember.findFirst({
    where: { roomId, userId, role: "ORGANIZER" },
  });
  if (!organizer) {
    throw makeError("Apenas o organizador pode realizar o sorteio.", 403, "NOT_ORGANIZER");
  }

  // Get the room and check status
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) {
    throw makeError("Sala não encontrada.", 404, "ROOM_NOT_FOUND");
  }
  if (room.status === "DRAWN" || room.status === "CANCELED" || room.status === "FINISHED") {
    throw makeError(
      "Não é possível realizar o sorteio nesta sala.",
      400,
      "INVALID_STATUS",
    );
  }

  // Fetch CONFIRMED members with user info
  const confirmedMembers = await prisma.roomMember.findMany({
    where: { roomId, status: "CONFIRMED" },
    include: { user: { select: { id: true, name: true } } },
  });

  // Separate LINE and GOALKEEPER players
  const confirmedLine: DrawPlayer[] = confirmedMembers
    .filter((m) => m.playRole === "LINE")
    .map((m) => ({ userId: m.user.id, name: m.user.name, playRole: "LINE" as const }));

  const confirmedGoalkeepers: DrawPlayer[] = confirmedMembers
    .filter((m) => m.playRole === "GOALKEEPER")
    .map((m) => ({ userId: m.user.id, name: m.user.name, playRole: "GOALKEEPER" as const }));

  if (confirmedLine.length < 2) {
    throw makeError(
      "São necessários pelo menos 2 jogadores de linha para realizar o sorteio.",
      400,
      "INSUFFICIENT_PLAYERS",
    );
  }

  const teamSize = room.teamSize;
  const numTeams = Math.max(2, Math.floor(confirmedLine.length / teamSize));

  // Build team buckets
  const teamsMap: DrawPlayer[][] = Array.from({ length: numTeams }, () => []);

  // Shuffle and distribute LINE players round-robin
  const linePlayers = [...confirmedLine];
  fisherYatesShuffle(linePlayers);
  linePlayers.forEach((p, i) => {
    teamsMap[i % numTeams]!.push(p);
  });

  // Shuffle and distribute GOALKEEPER players round-robin
  const goalkeeperPlayers = [...confirmedGoalkeepers];
  fisherYatesShuffle(goalkeeperPlayers);
  goalkeeperPlayers.forEach((p, i) => {
    teamsMap[i % numTeams]!.push(p);
  });

  // Build teamsData for prisma create
  const teamsData = teamsMap.map((players, i) => ({
    name: `Time ${String.fromCharCode(65 + i)}`,
    playerIds: players.map((p) => p.userId),
  }));

  // Transaction: create Draw + update room status
  const txResults = await prisma.$transaction([
    prisma.draw.create({
      data: {
        roomId,
        createdById: userId,
        teams: { create: teamsData },
      },
      include: { teams: true },
    }),
    prisma.room.update({ where: { id: roomId }, data: { status: "DRAWN" } }),
  ]);
  // txResults[0] is the draw (Draw & { teams: DrawTeam[] })
  const draw = txResults[0]!;

  // Emit socket event (may not be initialized)
  try {
    getIo().to(`room:${roomId}`).emit("room:updated", { roomId, status: "DRAWN" });
  } catch {}

  // Build DrawResult with player names
  const playerMap = new Map<string, DrawPlayer>();
  for (const member of confirmedMembers) {
    playerMap.set(member.user.id, {
      userId: member.user.id,
      name: member.user.name,
      playRole: member.playRole as "LINE" | "GOALKEEPER",
    });
  }

  const teams: DrawTeamResult[] = draw.teams.map((team) => ({
    id: team.id,
    name: team.name,
    players: team.playerIds.map((pid) => {
      const player = playerMap.get(pid);
      if (!player) {
        return { userId: pid, name: "Desconhecido", playRole: "LINE" as const };
      }
      return player;
    }),
  }));

  return {
    id: draw.id,
    roomId: draw.roomId,
    createdAt: draw.createdAt,
    teams,
  };
}

export async function getLatestDraw(
  roomId: string,
  userId: string,
): Promise<DrawResult | null> {
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

  const teams: DrawTeamResult[] = draw.teams.map((team) => ({
    id: team.id,
    name: team.name,
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
    teams,
  };
}
