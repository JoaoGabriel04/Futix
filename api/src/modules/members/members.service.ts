import type { RoomMember } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import type { JoinRoomInput } from "@fut/shared";

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

// ── service functions ──────────────────────────────────────────────────────────

/**
 * Regra 3 — Join a room as a PENDING member.
 */
export async function joinRoom(
  userId: string,
  roomId: string,
  data: JoinRoomInput,
): Promise<RoomMember> {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: { id: true, status: true },
  });

  if (!room || room.status !== "OPEN") {
    throw makeError("A sala não está aberta para novos membros.", 400, "ROOM_NOT_OPEN");
  }

  const existing = await prisma.roomMember.findFirst({
    where: { roomId, userId },
  });

  if (existing) {
    throw makeError("Usuário já é membro desta sala.", 409, "ALREADY_MEMBER");
  }

  return prisma.roomMember.create({
    data: {
      roomId,
      userId,
      role: "PLAYER",
      status: "PENDING",
      playRole: data.playRole,
    },
  });
}

/**
 * Regra 9 — Leave a room.
 */
export async function leaveRoom(userId: string, roomId: string): Promise<void> {
  const member = await prisma.roomMember.findFirst({
    where: { roomId, userId },
    include: { room: { select: { status: true } } },
  });

  if (!member) {
    throw makeError("Você não é membro desta sala.", 404, "NOT_MEMBER");
  }

  if (member.role === "ORGANIZER") {
    throw makeError("O organizador não pode sair da sala.", 403, "ORGANIZER_CANNOT_LEAVE");
  }

  const roomStatus = member.room.status;
  if (roomStatus !== "OPEN" && roomStatus !== "LOCKED") {
    throw makeError(
      "Não é possível sair da sala no status atual.",
      400,
      "ROOM_NOT_LEAVABLE",
    );
  }

  if (member.status === "PENDING" || member.status === "WAITLIST") {
    await prisma.roomMember.delete({ where: { id: member.id } });
  } else if (member.status === "CONFIRMED") {
    await prisma.roomMember.update({
      where: { id: member.id },
      data: { status: "LEFT" },
    });
  } else {
    throw makeError(
      "Não é possível sair da sala no status atual do membro.",
      400,
      "MEMBER_NOT_LEAVABLE",
    );
  }
}

/**
 * Regra 4 — Approve a PENDING member (CONFIRMED or WAITLIST based on vacancy).
 *
 * Uses SELECT FOR UPDATE inside a transaction to prevent race conditions when
 * two approvers submit simultaneously.
 */
export async function approveMember(
  _approverId: string,
  roomId: string,
  memberId: string,
): Promise<RoomMember> {
  return prisma.$transaction(async (tx) => {
    // Lock the member row to prevent concurrent approval races
    const [locked] = await tx.$queryRaw<RoomMember[]>`
      SELECT * FROM "RoomMember" WHERE id = ${memberId} FOR UPDATE
    `;

    if (!locked || locked.roomId !== roomId) {
      throw makeError("Membro não encontrado.", 404, "NOT_FOUND");
    }

    if (locked.status !== "PENDING") {
      throw makeError("O membro não está pendente.", 400, "INVALID_STATUS");
    }

    const room = await tx.room.findUnique({
      where: { id: roomId },
      select: { lineSlots: true, goalkeeperSlots: true },
    });

    if (!room) {
      throw makeError("Sala não encontrada.", 404, "ROOM_NOT_FOUND");
    }

    const slots =
      locked.playRole === "GOALKEEPER" ? room.goalkeeperSlots : room.lineSlots;

    const confirmedCount = await tx.roomMember.count({
      where: {
        roomId,
        playRole: locked.playRole,
        status: "CONFIRMED",
      },
    });

    if (confirmedCount < slots) {
      return tx.roomMember.update({
        where: { id: memberId },
        data: {
          status: "CONFIRMED",
          decidedAt: new Date(),
          decidedById: _approverId,
        },
      });
    }

    // No vacancy — place on waitlist
    const aggregate = await tx.roomMember.aggregate({
      where: { roomId, playRole: locked.playRole, status: "WAITLIST" },
      _max: { waitlistPosition: true },
    });

    const nextPosition = (aggregate._max.waitlistPosition ?? 0) + 1;

    return tx.roomMember.update({
      where: { id: memberId },
      data: {
        status: "WAITLIST",
        waitlistPosition: nextPosition,
        decidedAt: new Date(),
        decidedById: _approverId,
      },
    });
  });
}

/**
 * Regra 5 — Reject a PENDING member.
 */
export async function rejectMember(
  approverId: string,
  roomId: string,
  memberId: string,
): Promise<RoomMember> {
  const member = await prisma.roomMember.findFirst({
    where: { id: memberId, roomId },
  });

  if (!member) {
    throw makeError("Membro não encontrado.", 404, "NOT_FOUND");
  }

  if (member.status !== "PENDING") {
    throw makeError("O membro não está pendente.", 400, "INVALID_STATUS");
  }

  return prisma.roomMember.update({
    where: { id: memberId },
    data: {
      status: "REJECTED",
      decidedById: approverId,
      decidedAt: new Date(),
    },
  });
}

/**
 * Regra 8 — Promote a WAITLIST member to CONFIRMED if a vacancy exists.
 */
export async function promoteMember(
  _approverId: string,
  roomId: string,
  memberId: string,
): Promise<RoomMember> {
  const member = await prisma.roomMember.findFirst({
    where: { id: memberId, roomId },
    include: { room: { select: { lineSlots: true, goalkeeperSlots: true } } },
  });

  if (!member) {
    throw makeError("Membro não encontrado.", 404, "NOT_FOUND");
  }

  if (member.status !== "WAITLIST") {
    throw makeError("O membro não está na lista de espera.", 400, "INVALID_STATUS");
  }

  const slots =
    member.playRole === "GOALKEEPER"
      ? member.room.goalkeeperSlots
      : member.room.lineSlots;

  const confirmedCount = await prisma.roomMember.count({
    where: { roomId, playRole: member.playRole, status: "CONFIRMED" },
  });

  if (confirmedCount >= slots) {
    throw makeError("Não há vagas disponíveis.", 409, "NO_VACANCY");
  }

  return prisma.roomMember.update({
    where: { id: memberId },
    data: {
      status: "CONFIRMED",
      waitlistPosition: null,
      decidedAt: new Date(),
      decidedById: _approverId,
    },
  });
}

/**
 * Remove a member from a room (organizer-initiated).
 * ORGANIZER cannot be removed. PENDING/WAITLIST → deleted; otherwise → LEFT.
 */
export async function removeMember(
  _removerId: string,
  roomId: string,
  memberId: string,
): Promise<void> {
  const member = await prisma.roomMember.findFirst({
    where: { id: memberId, roomId },
  });

  if (!member) {
    throw makeError("Membro não encontrado.", 404, "NOT_FOUND");
  }

  if (member.role === "ORGANIZER") {
    throw makeError("Não é possível remover o organizador.", 403, "CANNOT_REMOVE_ORGANIZER");
  }

  if (member.status === "PENDING" || member.status === "WAITLIST") {
    await prisma.roomMember.delete({ where: { id: memberId } });
  } else {
    await prisma.roomMember.update({
      where: { id: memberId },
      data: { status: "LEFT" },
    });
  }
}
