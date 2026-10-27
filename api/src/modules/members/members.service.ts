import type { RoomMember } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import type { JoinRoomInput } from "@fut/shared";

function tryEmit(roomId: string, event: string, payload: unknown): void {
  import("../../socket.js")
    .then(({ getIo }) => {
      try {
        getIo().to(`room:${roomId}`).emit(event, payload);
      } catch {}
    })
    .catch(() => {});
}

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
    // Acquire a row-level lock to prevent concurrent approval races.
    // $executeRaw is used for the lock only; data is fetched via Prisma
    // so enum values are deserialized correctly (raw SQL can return
    // enum columns with unexpected types via the pg driver).
    await tx.$executeRaw`SELECT 1 FROM "RoomMember" WHERE id = ${memberId} FOR UPDATE`;

    const locked = await tx.roomMember.findFirst({
      where: { id: memberId, roomId },
      select: { id: true, status: true, playRole: true },
    });

    if (!locked) {
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
 * Regra 10 — Nomear um membro como CO_ORGANIZER.
 * Apenas o ORGANIZER pode nomear; limite de 2 co-organizadores por sala.
 */
export async function addCoOrganizer(
  requesterId: string,
  roomId: string,
  targetUserId: string,
): Promise<RoomMember> {
  const requester = await prisma.roomMember.findFirst({ where: { roomId, userId: requesterId } });
  if (!requester || requester.role !== "ORGANIZER")
    throw makeError("Apenas o organizador pode nomear co-organizadores.", 403, "NOT_ORGANIZER");

  const target = await prisma.roomMember.findFirst({ where: { roomId, userId: targetUserId } });
  if (!target) throw makeError("Usuário não é membro desta sala.", 404, "NOT_MEMBER");
  if (target.status !== "CONFIRMED")
    throw makeError("Apenas membros confirmados podem ser co-organizadores.", 400, "NOT_CONFIRMED");
  if (target.role === "ORGANIZER")
    throw makeError("O organizador não pode ser nomeado co-organizador.", 400, "IS_ORGANIZER");
  if (target.role === "CO_ORGANIZER")
    throw makeError("Usuário já é co-organizador.", 409, "ALREADY_CO_ORGANIZER");

  const coOrgCount = await prisma.roomMember.count({ where: { roomId, role: "CO_ORGANIZER" } });
  if (coOrgCount >= 2)
    throw makeError("A sala já possui o máximo de 2 co-organizadores.", 409, "CO_ORGANIZER_LIMIT");

  return prisma.roomMember.update({
    where: { id: target.id },
    data: { role: "CO_ORGANIZER" },
  });
}

/**
 * Regra 10 — Remover a função de CO_ORGANIZER de um membro (volta a PLAYER).
 * Apenas o ORGANIZER pode remover.
 */
export async function removeCoOrganizer(
  requesterId: string,
  roomId: string,
  targetUserId: string,
): Promise<RoomMember> {
  const requester = await prisma.roomMember.findFirst({ where: { roomId, userId: requesterId } });
  if (!requester || requester.role !== "ORGANIZER")
    throw makeError("Apenas o organizador pode remover co-organizadores.", 403, "NOT_ORGANIZER");

  const target = await prisma.roomMember.findFirst({ where: { roomId, userId: targetUserId } });
  if (!target) throw makeError("Usuário não é membro desta sala.", 404, "NOT_MEMBER");
  if (target.role !== "CO_ORGANIZER")
    throw makeError("Usuário não é co-organizador.", 400, "INVALID_STATUS");

  return prisma.roomMember.update({
    where: { id: target.id },
    data: { role: "PLAYER" },
  });
}

/**
 * Remove a member from a room (organizer-initiated).
 * ORGANIZER cannot be removed. PENDING/WAITLIST → deleted; otherwise → REMOVED.
 */
export async function removeMember(
  _removerId: string,
  roomId: string,
  memberId: string,
): Promise<void> {
  const member = await prisma.roomMember.findFirst({
    where: { id: memberId, roomId },
    include: { room: { select: { status: true } } },
  });

  if (!member) {
    throw makeError("Membro não encontrado.", 404, "NOT_FOUND");
  }

  if (member.role === "ORGANIZER") {
    throw makeError("Não é possível remover o organizador.", 403, "CANNOT_REMOVE_ORGANIZER");
  }

  if (member.status === "PENDING" || member.status === "WAITLIST") {
    await prisma.roomMember.delete({ where: { id: memberId } });
  } else if (
    member.room.status === "DRAWN" ||
    member.room.status === "LIVE"
  ) {
    // In DRAWN/LIVE: mark as REMOVED so the slot can be tracked as open in the team
    await prisma.roomMember.update({
      where: { id: memberId },
      data: { status: "REMOVED" },
    });
    tryEmit(roomId, "member:updated", { memberId, status: "REMOVED" });
  } else {
    await prisma.roomMember.update({
      where: { id: memberId },
      data: { status: "LEFT" },
    });
  }
}

/**
 * R55 — Mark a confirmed member as absent (NO_SHOW) during DRAWN or LIVE.
 * Organizer-initiated; never triggers auto-promotion (R58).
 */
export async function markAbsent(
  _actorId: string,
  roomId: string,
  memberId: string,
): Promise<RoomMember> {
  const member = await prisma.roomMember.findFirst({
    where: { id: memberId, roomId },
    include: { room: { select: { status: true } } },
  });

  if (!member) {
    throw makeError("Membro não encontrado.", 404, "NOT_FOUND");
  }

  if (member.role === "ORGANIZER") {
    throw makeError("Não é possível marcar o organizador como ausente.", 403, "CANNOT_MARK_ORGANIZER");
  }

  if (member.status !== "CONFIRMED") {
    throw makeError("Apenas membros confirmados podem ser marcados como ausentes.", 400, "INVALID_STATUS");
  }

  const allowedRoomStatuses = ["OPEN", "LOCKED", "DRAWN", "LIVE"] as const;
  if (!(allowedRoomStatuses as readonly string[]).includes(member.room.status)) {
    throw makeError("Não é possível marcar ausência neste estado da sala.", 400, "INVALID_ROOM_STATUS");
  }

  const updated = await prisma.roomMember.update({
    where: { id: memberId },
    data: { status: "NO_SHOW" },
  });

  tryEmit(roomId, "member:updated", { memberId, status: "NO_SHOW" });

  return updated;
}

/**
 * R55/R56 — Substitute an absent/removed player with a WAITLIST member.
 * Works in DRAWN (before first match) and LIVE (1-for-1, same function, same team).
 * Updates DrawTeam.playerIds and promotes the substitute to CONFIRMED.
 */
export async function substitutePlayer(
  _actorId: string,
  roomId: string,
  absentMemberId: string,
  substituteRoomMemberId: string,
): Promise<{ substituteMember: RoomMember; teamId: string }> {
  return prisma.$transaction(async (tx) => {
    const absent = await tx.roomMember.findFirst({
      where: { id: absentMemberId, roomId },
      select: { id: true, userId: true, playRole: true, status: true },
    });

    if (!absent) throw makeError("Membro ausente não encontrado.", 404, "NOT_FOUND");
    if (absent.status !== "NO_SHOW" && absent.status !== "REMOVED") {
      throw makeError("O membro deve estar NO_SHOW ou REMOVED para ser substituído.", 400, "INVALID_STATUS");
    }

    const substitute = await tx.roomMember.findFirst({
      where: { id: substituteRoomMemberId, roomId },
      select: { id: true, userId: true, playRole: true, status: true, waitlistPosition: true },
    });

    if (!substitute) throw makeError("Substituto não encontrado.", 404, "SUBSTITUTE_NOT_FOUND");
    if (substitute.status !== "WAITLIST") {
      throw makeError("O substituto deve estar na lista de espera.", 400, "SUBSTITUTE_NOT_WAITLIST");
    }
    if (substitute.playRole !== absent.playRole) {
      throw makeError("O substituto deve ter a mesma função do jogador ausente.", 400, "ROLE_MISMATCH");
    }

    const room = await tx.room.findUnique({
      where: { id: roomId },
      select: { status: true },
    });
    if (!room) throw makeError("Sala não encontrada.", 404, "ROOM_NOT_FOUND");
    if (room.status !== "DRAWN" && room.status !== "LIVE") {
      throw makeError("Substituição só é permitida em DRAWN ou LIVE.", 400, "INVALID_ROOM_STATUS");
    }

    // Find the draw team that contains the absent player's userId
    const latestDraw = await tx.draw.findFirst({
      where: { roomId },
      orderBy: { createdAt: "desc" },
      select: { teams: { select: { id: true, playerIds: true } } },
    });

    const team = latestDraw?.teams.find((t) => t.playerIds.includes(absent.userId));
    if (!team) throw makeError("Nenhum time encontrado para este jogador.", 404, "TEAM_NOT_FOUND");

    // Replace absent userId with substitute userId in the team
    const newPlayerIds = team.playerIds.map((pid) =>
      pid === absent.userId ? substitute.userId : pid,
    );

    await tx.drawTeam.update({
      where: { id: team.id },
      data: { playerIds: newPlayerIds },
    });

    // Promote substitute to CONFIRMED
    const promoted = await tx.roomMember.update({
      where: { id: substitute.id },
      data: { status: "CONFIRMED", waitlistPosition: null },
    });

    tryEmit(roomId, "member:substituted", {
      absentMemberId,
      substituteUserId: substitute.userId,
      teamId: team.id,
    });

    return { substituteMember: promoted, teamId: team.id };
  });
}
