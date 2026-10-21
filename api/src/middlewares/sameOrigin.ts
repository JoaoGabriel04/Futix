import type { NextFunction, Request, Response } from "express";
import { env } from "../env.js";

export function requireSameOrigin(req: Request, _res: Response, next: NextFunction): void {
  const origin = req.headers["origin"];
  const referer = req.headers["referer"];

  const isDev = env.NODE_ENV !== "production";

  const originMatch = origin === env.WEB_URL;
  const refererMatch = isDev && typeof referer === "string" && referer.startsWith(env.WEB_URL);

  if (originMatch || refererMatch) {
    next();
    return;
  }

  const error = new Error("Acesso negado.") as Error & { status: number; code: string };
  error.status = 403;
  error.code = "FORBIDDEN";
  next(error);
}
