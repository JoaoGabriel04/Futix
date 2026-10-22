import type { Room, RoomMember } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import type { CreateRoomInput, UpdateRoomInput, UpdateRoomRulesInput } from "@fut/shared";
import { getIo } from "../../socket.js";

// ── types ──────────────────────────────────────────────────────────────────────

type MemberWithUser = RoomMember & {
  user: {
    id: string;
    name: string;
    nickname: string | null;
    avatarUrl: string | null;
    preferredPosition: string | null;
  };
};

export type RoomWithCounts = Room & {
  confirmedLine: number;
  confirmedGoalkeepers: number;
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
        where: { status: "CONFIRMED" },
        select: { playRole: true, userId: true, role: true, status: true },
      },
    },
    orderBy: { startsAt: "asc" },
  });

  return rooms.map((room) => {
    const confirmedLine = room.members.filter((m) => m.playRole === "LINE").length;
    const confirmedGoalkeepers = room.members.filter((m) => m.playRole === "GOALKEEPER").length;
    const myMember = room.members.find((m) => m.userId === userId);

    const { members: _, ...roomFields } = room;
    return {
      ...roomFields,
      confirmedLine,
      confirmedGoalkeepers,
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
  if (room.status === "CANCELED" || room.status === "FINISHED") {
    throw makeError("Não é possível cancelar uma sala já finalizada ou cancelada.", 400, "INVALID_STATUS");
  }

  const updated = await prisma.room.update({ where: { id: roomId }, data: { status: "CANCELED" } });

  try {
    getIo().to(`room:${roomId}`).emit("room:updated", { roomId, status: "CANCELED" });
  } catch {}

  return updated;
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
