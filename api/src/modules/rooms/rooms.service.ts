import type { Room, RoomMember } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import type { CreateRoomInput, UpdateRoomInput, UpdateRoomRulesInput, Summary } from "@fut/shared";
import { WEIGHT_VALUE } from "@fut/shared";
import { getIo } from "../../socket.js";
import type { MatchForMember } from "../matches/matches.service.js";

// ── types ──────────────────────────────────────────────────────────────────────

type MemberWithUser = RoomMember & {
  user: {
    id: string;
    name: string;
    nickname: string | null;
    avatarUrl: string | null;
    preferredPosition: string | null;
    phone: string | null;
  };
};

export type RoomWithCounts = Room & {
  confirmedLine: number;
  confirmedGoalkeepers: number;
  pendingCount: number;
  myRole: string | null;
  myStatus: string | null;
};

export type RoomDetail = Room & {
  confirmedLine: number;
  confirmedGoalkeepers: number;
  myMember: MemberWithUser | null;
  members: MemberWithUser[];
};

// ── helpers ────────────────────────────────────────────────────────────────────

function makeError(message: string, status: number, code: string): Error & { status: number; code: string } {
  const error = new Error(message) as Error & { status: number; code: string };
  error.status = status;
  error.code = code;
  return error;
}

function assertFutureDate(startsAt: string): void {
  if (new Date(startsAt) <= new Date()) {
    throw makeError("A data da partida deve ser no futuro.", 400, "INVALID_DATE");
  }
}

// ── service functions ──────────────────────────────────────────────────────────

export async function createRoom(userId: string, data: CreateRoomInput): Promise<Room> {
  assertFutureDate(data.startsAt);
  if (data.lineSlots < 2) throw makeError("Vagas de linha deve ser no mínimo 2.", 400, "INVALID_LINE_SLOTS");
  if (data.teamSize < 1) throw makeError("Jogadores por time deve ser no mínimo 1.", 400, "INVALID_TEAM_SIZE");
  if (data.goalkeeperSlots < 0) throw makeError("Vagas de goleiro não pode ser negativo.", 400, "INVALID_GOALKEEPER_SLOTS");

  return prisma.room.create({
    data: {
      title: data.title,
      location: data.location,
      startsAt: new Date(data.startsAt),
      lineSlots: data.lineSlots,
      teamSize: data.teamSize,
      goalkeeperSlots: data.goalkeeperSlots,
      requireApproval: data.requireApproval,
      ownerId: userId,
      members: {
        create: {
          userId,
          role: "ORGANIZER",
          status: "CONFIRMED",
          playRole: data.playRole,
        },
      },
    },
  });
}

export async function listRooms(userId: string): Promise<RoomWithCounts[]> {
  const rooms = await prisma.room.findMany({
    where: {
      OR: [
        { ownerId: userId },
        {
          members: {
            some: {
              userId,
              status: { notIn: ["REJECTED", "LEFT"] },
            },
          },
        },
      ],
    },
    include: {
      members: {
        where: { status: { in: ["CONFIRMED", "PENDING"] } },
        select: { playRole: true, userId: true, role: true, status: true },
      },
    },
    orderBy: { startsAt: "asc" },
  });

  return rooms.map((room) => {
    const confirmedMembers = room.members.filter((m) => m.status === "CONFIRMED");
    const confirmedLine = confirmedMembers.filter((m) => m.playRole === "LINE").length;
    const confirmedGoalkeepers = confirmedMembers.filter((m) => m.playRole === "GOALKEEPER").length;
    const pendingCount = room.members.filter((m) => m.status === "PENDING").length;
    const myMember = room.members.find((m) => m.userId === userId);

    const { members: _, ...roomFields } = room;
    return {
      ...roomFields,
      confirmedLine,
      confirmedGoalkeepers,
      pendingCount,
      myRole: myMember?.role ?? null,
      myStatus: myMember?.status ?? null,
    };
  });
}

export async function getRoom(roomId: string, userId: string): Promise<RoomDetail> {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              nickname: true,
              avatarUrl: true,
              preferredPosition: true,
              phone: true,
            },
          },
        },
      },
    },
  });

  if (!room) {
    throw makeError("Sala não encontrada.", 404, "ROOM_NOT_FOUND");
  }

  const confirmedLine = room.members.filter(
    (m) => m.status === "CONFIRMED" && m.playRole === "LINE",
  ).length;
  const confirmedGoalkeepers = room.members.filter(
    (m) => m.status === "CONFIRMED" && m.playRole === "GOALKEEPER",
  ).length;

  const myMember = room.members.find((m) => m.userId === userId) ?? null;

  return {
    ...room,
    confirmedLine,
    confirmedGoalkeepers,
    myMember,
    members: room.members,
  };
}

export async function updateRoom(
  userId: string,
  roomId: string,
  data: UpdateRoomInput,
  rulesData?: UpdateRoomRulesInput,
): Promise<Room> {
  const hasFormatFields =
    data.title !== undefined ||
    data.location !== undefined ||
    data.startsAt !== undefined ||
    data.lineSlots !== undefined ||
    data.teamSize !== undefined ||
    data.goalkeeperSlots !== undefined ||
    data.requireApproval !== undefined;

  const hasRulesFields =
    rulesData !== undefined &&
    (rulesData.matchMinutes !== undefined ||
      rulesData.winnerRule !== undefined ||
      rulesData.maxStarsPerTeam !== undefined);

  if (!hasFormatFields && !hasRulesFields) {
    throw makeError("Nenhum campo para atualizar.", 400, "NO_FIELDS");
  }

  // ORGANIZER check applies to both operations
  const member = await prisma.roomMember.findFirst({
    where: { roomId, userId, role: "ORGANIZER", status: "CONFIRMED" },
    select: { id: true },
  });
  if (!member) throw makeError("Apenas o organizador pode alterar a sala.", 403, "NOT_ORGANIZER");

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      members: {
        where: { status: "CONFIRMED" },
        select: { playRole: true },
      },
    },
  });
  if (!room) throw makeError("Sala não encontrada.", 404, "ROOM_NOT_FOUND");

  // Format fields: OPEN only
  if (hasFormatFields) {
    if (room.status !== "OPEN") {
      throw makeError("Só é possível alterar o formato de uma sala aberta.", 400, "ROOM_NOT_OPEN");
    }

    if (data.startsAt !== undefined) assertFutureDate(data.startsAt);

    const confirmedLine = room.members.filter((m) => m.playRole === "LINE").length;
    const confirmedGoalkeepers = room.members.filter((m) => m.playRole === "GOALKEEPER").length;

    if (data.lineSlots !== undefined && data.lineSlots < confirmedLine) {
      throw makeError(
        `Não é possível reduzir as vagas abaixo dos ${confirmedLine} jogadores confirmados.`,
        400,
        "SLOTS_BELOW_CONFIRMED",
      );
    }
    if (data.goalkeeperSlots !== undefined && data.goalkeeperSlots < confirmedGoalkeepers) {
      throw makeError(
        `Não é possível reduzir as vagas abaixo dos ${confirmedGoalkeepers} goleiros confirmados.`,
        400,
        "SLOTS_BELOW_CONFIRMED",
      );
    }
  }

  // Rules fields: OPEN, LOCKED, or DRAWN only
  if (hasRulesFields) {
    const allowed = ["OPEN", "LOCKED", "DRAWN"] as const;
    if (!(allowed as readonly string[]).includes(room.status)) {
      throw makeError("Não é possível alterar as regras após o início das partidas.", 400, "ROOM_STARTED");
    }
  }

  return prisma.room.update({
    where: { id: roomId },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.location !== undefined && { location: data.location }),
      ...(data.startsAt !== undefined && { startsAt: new Date(data.startsAt) }),
      ...(data.lineSlots !== undefined && { lineSlots: data.lineSlots }),
      ...(data.teamSize !== undefined && { teamSize: data.teamSize }),
      ...(data.goalkeeperSlots !== undefined && { goalkeeperSlots: data.goalkeeperSlots }),
      ...(data.requireApproval !== undefined && { requireApproval: data.requireApproval }),
      ...(rulesData?.matchMinutes !== undefined && { matchMinutes: rulesData.matchMinutes }),
      ...(rulesData?.winnerRule !== undefined && { winnerRule: rulesData.winnerRule }),
      ...(rulesData?.maxStarsPerTeam !== undefined && { maxStarsPerTeam: rulesData.maxStarsPerTeam }),
    },
  });
}

export async function lockRoom(userId: string, roomId: string): Promise<Room> {
  const room = await prisma.room.findUnique({ where: { id: roomId } });

  if (!room) throw makeError("Sala não encontrada.", 404, "ROOM_NOT_FOUND");
  if (room.status !== "OPEN") throw makeError("Só é possível travar uma sala aberta.", 400, "ROOM_NOT_OPEN");

  return prisma.room.update({ where: { id: roomId }, data: { status: "LOCKED" } });
}

export async function unlockRoom(userId: string, roomId: string): Promise<Room> {
  const room = await prisma.room.findUnique({ where: { id: roomId } });

  if (!room) throw makeError("Sala não encontrada.", 404, "ROOM_NOT_FOUND");
  if (room.status !== "LOCKED") throw makeError("A sala não está travada.", 400, "ROOM_NOT_LOCKED");

  return prisma.room.update({ where: { id: roomId }, data: { status: "OPEN" } });
}

export async function cancelRoom(userId: string, roomId: string): Promise<Room> {
  const member = await prisma.roomMember.findFirst({ where: { roomId, userId, role: "ORGANIZER" } });
  if (!member) throw makeError("Apenas o organizador pode cancelar a sala.", 403, "NOT_ORGANIZER");

  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) throw makeError("Sala não encontrada.", 404, "ROOM_NOT_FOUND");
  if (room.status === "LIVE") {
    throw makeError("Não é possível cancelar uma sala em andamento.", 400, "ROOM_LIVE");
  }
  if (room.status === "CANCELED" || room.status === "FINISHED") {
    throw makeError("Não é possível cancelar uma sala já finalizada ou cancelada.", 400, "INVALID_STATUS");
  }

  const updated = await prisma.room.update({ where: { id: roomId }, data: { status: "CANCELED" } });

  try {
    getIo().to(`room:${roomId}`).emit("room:updated", { roomId, status: "CANCELED" });
  } catch {}

  return updated;
}

export async function deleteRoom(userId: string, roomId: string): Promise<void> {
  const member = await prisma.roomMember.findFirst({ where: { roomId, userId, role: "ORGANIZER" } });
  if (!member) throw makeError("Apenas o organizador pode excluir a sala.", 403, "NOT_ORGANIZER");

  const room = await prisma.room.findUnique({ where: { id: roomId }, select: { status: true } });
  if (!room) throw makeError("Sala não encontrada.", 404, "ROOM_NOT_FOUND");
  if (room.status !== "FINISHED") {
    throw makeError("A sala só pode ser excluída após ser concluída.", 400, "ROOM_NOT_FINISHED");
  }

  await prisma.room.delete({ where: { id: roomId } });
}

export async function countVacancies(
  roomId: string,
): Promise<{ confirmedLine: number; confirmedGoalkeepers: number }> {
  const members = await prisma.roomMember.findMany({
    where: { roomId, status: "CONFIRMED" },
    select: { playRole: true },
  });

  const confirmedLine = members.filter((m) => m.playRole === "LINE").length;
  const confirmedGoalkeepers = members.filter((m) => m.playRole === "GOALKEEPER").length;

  return { confirmedLine, confirmedGoalkeepers };
}

// ── R36: finishRoom ────────────────────────────────────────────────────────────

export async function finishRoom(userId: string, roomId: string): Promise<void> {
  // Caller must be ORGANIZER or CO_ORGANIZER
  const member = await prisma.roomMember.findFirst({
    where: { roomId, userId, role: { in: ["ORGANIZER", "CO_ORGANIZER"] }, status: "CONFIRMED" },
    select: { id: true },
  });
  if (!member) throw makeError("Apenas organizadores podem finalizar a sala.", 403, "NOT_ORGANIZER");

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: { status: true },
  });
  if (!room) throw makeError("Sala não encontrada.", 404, "ROOM_NOT_FOUND");

  if (room.status === "OPEN" || room.status === "LOCKED") {
    throw makeError("A sala ainda não foi iniciada.", 400, "ROOM_NOT_STARTED");
  }
  if (room.status === "CANCELED" || room.status === "FINISHED") {
    throw makeError("A sala já foi encerrada.", 409, "ROOM_ALREADY_ENDED");
  }

  // No match must be LIVE or PAUSED
  const activeMatch = await prisma.match.findFirst({
    where: { roomId, status: { in: ["LIVE", "PAUSED"] } },
    select: { id: true },
  });
  if (activeMatch) throw makeError("Há uma partida em andamento.", 409, "MATCH_IN_PROGRESS");

  const now = new Date();

  await prisma.room.update({
    where: { id: roomId },
    data: { status: "FINISHED", finishedAt: now },
  });

  try {
    getIo().to(`room:${roomId}`).emit("room:finished", { roomId, finishedAt: now.toISOString() });
  } catch {}
}

// ── getRoomSession ─────────────────────────────────────────────────────────────

type SessionTeam = {
  id: string;
  name: string;
  queuePosition: number | null;
  playerIds: string[];
  consecutiveWins: number;
  weightTotal?: number;
};

type RoomSessionResult = {
  status: string;
  teams: SessionTeam[];
  currentMatch: MatchForMember | null;
  lastRotation: {
    kind: string;
    swaps: unknown;
    courtAfter: string[];
    queueAfter: string[];
  } | null;
};

export async function getRoomSession(userId: string, roomId: string): Promise<RoomSessionResult> {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: { status: true, ownerId: true },
  });
  if (!room) throw makeError("Sala não encontrada.", 404, "NOT_FOUND");

  // Caller must be confirmed member or org/co-org
  const member = await prisma.roomMember.findFirst({
    where: { roomId, userId, status: "CONFIRMED" },
    select: { role: true },
  });
  if (!member) throw makeError("Sala não encontrada.", 404, "NOT_FOUND");

  const isOrgRole = member.role === "ORGANIZER" || member.role === "CO_ORGANIZER";

  // Load latest draw's teams
  const draw = await prisma.draw.findFirst({
    where: { roomId },
    orderBy: { createdAt: "desc" },
    select: {
      teams: {
        orderBy: { queuePosition: "asc" },
        select: {
          id: true,
          name: true,
          queuePosition: true,
          playerIds: true,
          consecutiveWins: true,
        },
      },
    },
  });

  let teams: SessionTeam[] = [];

  if (draw) {
    // Filter out the "Sem time" sentinel (queuePosition === -1)
    const drawTeams = draw.teams.filter((t) => t.queuePosition !== -1);

    if (isOrgRole) {
      // Load weights for weight totals
      const allPlayerIds = drawTeams.flatMap((t) => t.playerIds);
      const storedWeights = await prisma.playerWeight.findMany({
        where: { ownerId: room.ownerId, playerId: { in: allPlayerIds } },
        select: { playerId: true, level: true },
      });
      const weightMap = new Map(storedWeights.map((w) => [w.playerId, w.level as "REGULAR" | "GOOD" | "STAR"]));

      teams = drawTeams.map((t) => ({
        id: t.id,
        name: t.name,
        queuePosition: t.queuePosition,
        playerIds: t.playerIds,
        consecutiveWins: t.consecutiveWins,
        weightTotal: t.playerIds.reduce((sum, pid) => {
          const level = weightMap.get(pid) ?? "GOOD";
          return sum + WEIGHT_VALUE[level];
        }, 0),
      }));
    } else {
      teams = drawTeams.map((t) => ({
        id: t.id,
        name: t.name,
        queuePosition: t.queuePosition,
        playerIds: t.playerIds,
        consecutiveWins: t.consecutiveWins,
      }));
    }
  }

  // Load current LIVE/PAUSED match
  const activeMatchRow = await prisma.match.findFirst({
    where: { roomId, status: { in: ["LIVE", "PAUSED"] } },
    select: {
      id: true,
      roomId: true,
      number: true,
      teamAId: true,
      teamBId: true,
      teamAPlayerIds: true,
      teamBPlayerIds: true,
      limitSeconds: true,
      status: true,
      startedAt: true,
      elapsedSeconds: true,
      scoreA: true,
      scoreB: true,
      winnerTeamId: true,
      endReason: true,
      endedAt: true,
    },
  });

  let currentMatch: MatchForMember | null = null;
  if (activeMatchRow) {
    currentMatch = {
      id: activeMatchRow.id,
      roomId: activeMatchRow.roomId,
      number: activeMatchRow.number,
      teamAId: activeMatchRow.teamAId,
      teamBId: activeMatchRow.teamBId,
      teamAPlayerIds: activeMatchRow.teamAPlayerIds,
      teamBPlayerIds: activeMatchRow.teamBPlayerIds,
      limitSeconds: activeMatchRow.limitSeconds,
      status: activeMatchRow.status as "LIVE" | "PAUSED" | "FINISHED",
      startedAt: activeMatchRow.startedAt.toISOString(),
      elapsedSeconds: activeMatchRow.elapsedSeconds,
      scoreA: activeMatchRow.scoreA,
      scoreB: activeMatchRow.scoreB,
      winnerTeamId: activeMatchRow.winnerTeamId,
      endReason: activeMatchRow.endReason,
      endedAt: activeMatchRow.endedAt ? activeMatchRow.endedAt.toISOString() : null,
    };
  }

  // Load the most recent Rotation (from the most recent FINISHED match with a Rotation)
  const lastRotationRow = await prisma.rotation.findFirst({
    where: {
      match: { roomId, status: "FINISHED" },
    },
    orderBy: { match: { number: "desc" } },
    select: {
      kind: true,
      swaps: true,
      courtAfter: true,
      queueAfter: true,
    },
  });

  const lastRotation = lastRotationRow
    ? {
        kind: lastRotationRow.kind,
        swaps: lastRotationRow.swaps,
        courtAfter: lastRotationRow.courtAfter as string[],
        queueAfter: lastRotationRow.queueAfter as string[],
      }
    : null;

  return {
    status: room.status,
    teams,
    currentMatch,
    lastRotation,
  };
}

// ── R37: getRoomSummary ────────────────────────────────────────────────────────

export async function getRoomSummary(userId: string, roomId: string): Promise<Summary> {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: { status: true },
  });

  // Room must be FINISHED — use 404 as spec says ROOM_NOT_FINISHED
  if (!room || room.status !== "FINISHED") {
    throw makeError("Sala não encontrada ou não finalizada.", 404, "ROOM_NOT_FINISHED");
  }

  // Caller must be confirmed member
  const member = await prisma.roomMember.findFirst({
    where: { roomId, userId, status: "CONFIRMED" },
    select: { id: true },
  });
  if (!member) throw makeError("Sala não encontrada.", 404, "NOT_FOUND");

  // Load all matches for the room ordered by number
  const matches = await prisma.match.findMany({
    where: { roomId },
    orderBy: { number: "asc" },
    select: {
      id: true,
      number: true,
      teamAId: true,
      teamBId: true,
      teamAPlayerIds: true,
      teamBPlayerIds: true,
      scoreA: true,
      scoreB: true,
      elapsedSeconds: true,
      status: true,
      endReason: true,
      events: {
        where: { undoneAt: null },
        select: {
          type: true,
          scorerId: true,
          assistId: true,
        },
      },
    },
  });

  // Load latest draw teams for team name lookup
  const draw = await prisma.draw.findFirst({
    where: { roomId },
    orderBy: { createdAt: "desc" },
    select: {
      teams: {
        select: { id: true, name: true },
      },
    },
  });

  const teamNameMap = new Map<string, string>();
  if (draw) {
    for (const t of draw.teams) {
      teamNameMap.set(t.id, t.name);
    }
  }

  // Gather all userId references for name resolution
  const scorerIds = new Set<string>();
  const assistIds = new Set<string>();
  const playerIds = new Set<string>();

  for (const match of matches) {
    for (const pid of match.teamAPlayerIds) playerIds.add(pid);
    for (const pid of match.teamBPlayerIds) playerIds.add(pid);
    for (const ev of match.events) {
      if (ev.type === "GOAL" && ev.scorerId) scorerIds.add(ev.scorerId);
      if (ev.type === "GOAL" && ev.assistId) assistIds.add(ev.assistId);
    }
  }

  // Collect all user ids for name resolution
  const allUserIds = new Set<string>([...scorerIds, ...assistIds, ...playerIds]);

  const users = await prisma.user.findMany({
    where: { id: { in: Array.from(allUserIds) } },
    select: { id: true, name: true },
  });
  const userNameMap = new Map(users.map((u) => [u.id, u.name]));

  // Aggregate stats
  let totalGoals = 0;
  let totalPlaySeconds = 0;

  const scorersMap = new Map<string, number>();
  const assistsMap = new Map<string, number>();
  const matchesPlayedMap = new Map<string, number>();

  const matchList: Summary["matchList"] = [];

  for (const match of matches) {
    // totalGoals: count all non-undone GOAL + OWN_GOAL events
    totalGoals += match.events.length;

    // totalPlaySeconds: sum elapsedSeconds for FINISHED matches only
    if (match.status === "FINISHED") {
      totalPlaySeconds += match.elapsedSeconds;
    }

    // Scorers: GOAL events only (not OWN_GOAL), attributed to scorerId
    for (const ev of match.events) {
      if (ev.type === "GOAL" && ev.scorerId) {
        scorersMap.set(ev.scorerId, (scorersMap.get(ev.scorerId) ?? 0) + 1);
      }
      if (ev.type === "GOAL" && ev.assistId) {
        assistsMap.set(ev.assistId, (assistsMap.get(ev.assistId) ?? 0) + 1);
      }
    }

    // matchesPlayed: each unique player in teamAPlayerIds ∪ teamBPlayerIds counts as 1
    const allMatchPlayers = new Set([...match.teamAPlayerIds, ...match.teamBPlayerIds]);
    for (const pid of allMatchPlayers) {
      matchesPlayedMap.set(pid, (matchesPlayedMap.get(pid) ?? 0) + 1);
    }

    matchList.push({
      number: match.number,
      scoreA: match.scoreA,
      scoreB: match.scoreB,
      teamAName: teamNameMap.get(match.teamAId) ?? match.teamAId,
      teamBName: teamNameMap.get(match.teamBId) ?? match.teamBId,
      endReason: match.endReason ?? "",
    });
  }

  const scorers = Array.from(scorersMap.entries())
    .map(([userId, goals]) => ({ userId, name: userNameMap.get(userId) ?? userId, goals }))
    .sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name));

  const assists = Array.from(assistsMap.entries())
    .map(([userId, assistCount]) => ({ userId, name: userNameMap.get(userId) ?? userId, assists: assistCount }))
    .sort((a, b) => b.assists - a.assists || a.name.localeCompare(b.name));

  const matchesPlayed = Array.from(matchesPlayedMap.entries())
    .map(([userId, count]) => ({ userId, name: userNameMap.get(userId) ?? userId, matches: count }))
    .sort((a, b) => b.matches - a.matches || a.name.localeCompare(b.name));

  return {
    totalMatches: matches.length,
    totalGoals,
    totalPlaySeconds,
    scorers,
    assists,
    matchesPlayed,
    matchList,
  };
}
