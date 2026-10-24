import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "../lib/jwt.js";
import { prisma } from "../lib/prisma.js";

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token: unknown = req.cookies["access_token"];

  if (typeof token !== "string" || token.length === 0) {
    const error = new Error("Não autenticado.") as Error & { status: number; code: string };
    error.status = 401;
    error.code = "UNAUTHORIZED";
    next(error);
    return;
  }

  let userId: string;
  let sessionVersion: number | undefined;
  try {
    ({ userId, sessionVersion } = verifyToken(token));
  } catch (err) {
    next(err);
    return;
  }

  prisma.user
    .findUnique({
      where: { id: userId },
      select: { id: true, sessionVersion: true },
    })
    .then((user) => {
      if (user === null) {
        const error = new Error("Sessão inválida") as Error & { status: number; code: string };
        error.status = 401;
        error.code = "UNAUTHORIZED";
        next(error);
        return;
      }

      // If sessionVersion is present in the token, validate it
      if (sessionVersion !== undefined && user.sessionVersion !== sessionVersion) {
        const error = new Error("Sessão inválida") as Error & { status: number; code: string };
        error.status = 401;
        error.code = "UNAUTHORIZED";
        next(error);
        return;
      }

      req.userId = userId;
      next();
    })
    .catch(next);
}
