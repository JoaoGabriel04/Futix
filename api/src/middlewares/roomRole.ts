import type { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma.js";

export async function requireOrganizerRole(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const roomId = req.params["id"];

  if (!roomId) {
    const error = new Error("Room ID ausente.") as Error & { status: number; code: string };
    error.status = 400;
    error.code = "BAD_REQUEST";
    next(error);
    return;
  }

  try {
    const member = await prisma.roomMember.findFirst({
      where: {
        roomId,
        userId: req.userId,
        role: { in: ["ORGANIZER", "CO_ORGANIZER"] },
        status: "CONFIRMED",
      },
    });

    if (!member) {
      const error = new Error("Apenas organizadores podem realizar esta ação.") as Error & {
        status: number;
        code: string;
      };
      error.status = 403;
      error.code = "NOT_ORGANIZER";
      next(error);
      return;
    }

    req.memberRole = member.role;
    next();
  } catch (err) {
    next(err);
  }
}
