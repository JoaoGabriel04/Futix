import { prisma } from "../../lib/prisma.js";
import type { PutWeightsInput } from "@fut/shared";

function makeError(message: string, status: number, code: string) {
  const e = new Error(message) as Error & { status: number; code: string };
  e.status = status;
  e.code = code;
  return e;
}

async function requireOrgOrCoOrg(roomId: string, userId: string) {
  const member = await prisma.roomMember.findFirst({
    where: { roomId, userId, role: { in: ["ORGANIZER", "CO_ORGANIZER"] }, status: "CONFIRMED" },
    select: { role: true },
  });
  if (!member) throw makeError("Apenas organizadores podem acessar os pesos.", 403, "NOT_ORGANIZER");
  return member.role;
}

export type WeightEntry = {
  playerId: string;
  playerName: string;
  level: "REGULAR" | "GOOD" | "STAR";
};

export async function getWeights(roomId: string, userId: string): Promise<WeightEntry[]> {
  await requireOrgOrCoOrg(roomId, userId);

  const room = await prisma.room.findUnique({ where: { id: roomId }, select: { ownerId: true } });
  if (!room) throw makeError("Sala não encontrada.", 404, "ROOM_NOT_FOUND");

  // Get all CONFIRMED LINE members of the room
  const lineMembers = await prisma.roomMember.findMany({
    where: { roomId, status: "CONFIRMED", playRole: "LINE" },
    select: { userId: true, user: { select: { name: true } } },
  });

  if (lineMembers.length === 0) return [];

  const playerIds = lineMembers.map((m) => m.userId);

  // Get stored weights for the room owner
  const weights = await prisma.playerWeight.findMany({
    where: { ownerId: room.ownerId, playerId: { in: playerIds } },
    select: { playerId: true, level: true },
  });

  const weightMap = new Map(weights.map((w) => [w.playerId, w.level as "REGULAR" | "GOOD" | "STAR"]));

  return lineMembers.map((m) => ({
    playerId: m.userId,
    playerName: m.user.name,
    level: weightMap.get(m.userId) ?? "GOOD",
  }));
}

export async function putWeights(
  roomId: string,
  userId: string,
  data: PutWeightsInput,
): Promise<WeightEntry[]> {
  await requireOrgOrCoOrg(roomId, userId);

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: { ownerId: true, status: true },
  });
  if (!room) throw makeError("Sala não encontrada.", 404, "ROOM_NOT_FOUND");

  const liveStatuses = ["LIVE", "FINISHED"] as const;
  if ((liveStatuses as readonly string[]).includes(room.status)) {
    throw makeError("Não é possível editar pesos após o início das partidas.", 423, "WEIGHTS_LOCKED");
  }

  // Validate all playerIds are CONFIRMED LINE members of this room
  const playerIds = data.items.map((i) => i.playerId);
  const members = await prisma.roomMember.findMany({
    where: { roomId, userId: { in: playerIds }, status: "CONFIRMED", playRole: "LINE" },
    select: { userId: true, user: { select: { name: true } } },
  });

  const validIds = new Set(members.map((m) => m.userId));
  const invalidIds = playerIds.filter((id) => !validIds.has(id));
  if (invalidIds.length > 0) {
    throw makeError(
      "Um ou mais jogadores não são membros confirmados de linha desta sala.",
      400,
      "INVALID_PLAYER",
    );
  }

  // Upsert weights keyed by (ownerId, playerId)
  await prisma.$transaction(
    data.items.map((item) =>
      prisma.playerWeight.upsert({
        where: { ownerId_playerId: { ownerId: room.ownerId, playerId: item.playerId } },
        create: { ownerId: room.ownerId, playerId: item.playerId, level: item.level },
        update: { level: item.level },
      }),
    ),
  );

  return getWeights(roomId, userId);
}
