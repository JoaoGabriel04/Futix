import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "../lib/jwt.js";

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token: unknown = req.cookies["access_token"];

  if (typeof token !== "string" || token.length === 0) {
    const error = new Error("Não autenticado.") as Error & { status: number; code: string };
    error.status = 401;
    error.code = "UNAUTHORIZED";
    next(error);
    return;
  }

  try {
    const { userId } = verifyToken(token);
    req.userId = userId;
    next();
  } catch (err) {
    next(err);
  }
}
