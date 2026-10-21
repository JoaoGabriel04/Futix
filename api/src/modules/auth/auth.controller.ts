import type { Request, Response } from "express";
import { env } from "../../env.js";
import { verifyToken } from "../../lib/jwt.js";
import { clearAuthCookies, setAuthCookies } from "./auth.service.js";

export function handleOAuthCallback(req: Request, res: Response): void {
  const passportUser = req.user;

  if (!passportUser) {
    res.redirect(`${env.WEB_URL}/entrar`);
    return;
  }

  const { user, isNew } = passportUser;

  setAuthCookies(res, user.id);

  const destination = isNew ? `${env.WEB_URL}/cadastro` : `${env.WEB_URL}/inicio`;
  res.redirect(destination);
}

export function handleRefresh(req: Request, res: Response): void {
  const refreshToken: unknown = req.cookies["refresh_token"];

  if (typeof refreshToken !== "string" || refreshToken.length === 0) {
    res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Sessão expirada." } });
    return;
  }

  try {
    const { userId } = verifyToken(refreshToken);
    setAuthCookies(res, userId);
    res.status(200).json({ ok: true });
  } catch {
    clearAuthCookies(res);
    res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Sessão expirada." } });
  }
}

export function handleLogout(_req: Request, res: Response): void {
  clearAuthCookies(res);
  res.status(204).end();
}
