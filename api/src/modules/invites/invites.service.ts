import crypto from "crypto";
import { prisma } from "../../lib/prisma.js";

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

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// ── types ──────────────────────────────────────────────────────────────────────

export interface InvitePreview {
  roomId: string;
  room: {
    title: string;
    location: string;
    startsAt: Date;
    lineSlots: number;
    goalkeeperSlots: number;
    status: string;
  };
  expiresAt: Date;
}

// ── service functions ──────────────────────────────────────────────────────────

export async function createInvite(
  userId: string,
  roomId: string,
): Promise<{ id: string; token: string; expiresAt: Date }> {
  const member = await prisma.roomMember.findFirst({
    where: {
      roomId,
      userId,
      role: { in: ["ORGANIZER", "CO_ORGANIZER"] },
      status: "CONFIRMED",
    },
  });

  if (!member) {
    throw makeError("Apenas organizadores podem criar convites.", 403, "NOT_ORGANIZER");
  }

  const room = await prisma.room.findUnique({ where: { id: roomId } });

  if (!room) {
    throw makeError("Sala não encontrada.", 404, "ROOM_NOT_FOUND");
  }

  if (room.status !== "OPEN" && room.status !== "LOCKED") {
    throw makeError("Não é possível criar convites para esta sala.", 400, "ROOM_INVALID_STATUS");
  }

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const invite = await prisma.invite.create({
    data: {
      roomId,
      tokenHash,
      createdById: userId,
      expiresAt,
    },
  });

  return { id: invite.id, token, expiresAt: invite.expiresAt };
}

export async function getInvitePreview(token: string): Promise<InvitePreview> {
  const tokenHash = hashToken(token);

  const invite = await prisma.invite.findUnique({
    where: { tokenHash },
    include: {
      room: {
        select: {
          title: true,
          location: true,
          startsAt: true,
          lineSlots: true,
          goalkeeperSlots: true,
          status: true,
        },
      },
    },
  });

  if (!invite) {
    throw makeError("Convite não encontrado.", 404, "INVITE_NOT_FOUND");
  }

  if (invite.expiresAt <= new Date()) {
    throw makeError("Este convite expirou.", 410, "INVITE_EXPIRED");
  }

  if (invite.usedAt !== null) {
    throw makeError("Este convite já foi utilizado.", 410, "INVITE_USED");
  }

  return {
    roomId: invite.roomId,
    room: {
      title: invite.room.title,
      location: invite.room.location,
      startsAt: invite.room.startsAt,
      lineSlots: invite.room.lineSlots,
      goalkeeperSlots: invite.room.goalkeeperSlots,
      status: invite.room.status,
    },
    expiresAt: invite.expiresAt,
  };
}

export async function useInvite(
  token: string,
  userId: string,
): Promise<{ roomId: string }> {
  const tokenHash = hashToken(token);

  const invite = await prisma.invite.findUnique({ where: { tokenHash } });

  if (!invite) {
    throw makeError("Convite não encontrado.", 404, "INVITE_NOT_FOUND");
  }

  if (invite.expiresAt <= new Date()) {
    throw makeError("Este convite expirou.", 410, "INVITE_EXPIRED");
  }

  if (invite.usedAt !== null) {
    throw makeError("Este convite já foi utilizado.", 410, "INVITE_USED");
  }

  const existingMember = await prisma.roomMember.findFirst({
    where: { roomId: invite.roomId, userId },
  });

  if (existingMember) {
    throw makeError("Você já é membro desta sala.", 409, "ALREADY_MEMBER");
  }

  const room = await prisma.room.findUnique({
    where: { id: invite.roomId },
    select: { requireApproval: true },
  });

  if (!room) {
    throw makeError("Sala não encontrada.", 404, "ROOM_NOT_FOUND");
  }

  await prisma.$transaction([
    prisma.invite.update({
      where: { id: invite.id },
      data: { usedAt: new Date(), usedById: userId },
    }),
    prisma.roomMember.create({
      data: {
        roomId: invite.roomId,
        userId,
        role: "PLAYER",
        playRole: "LINE",
        status: room.requireApproval ? "PENDING" : "CONFIRMED",
      },
    }),
  ]);

  return { roomId: invite.roomId };
}
