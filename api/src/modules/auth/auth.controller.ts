import type { Request, Response } from "express";
import { env } from "../../env.js";
import { signAccess, signLink, signRefresh, verifyToken } from "../../lib/jwt.js";

export function handleOAuthCallback(req: Request, res: Response): void {
  const passportUser = req.user;

  if (!passportUser) {
    res.redirect(`${env.WEB_URL}/entrar`);
    return;
  }

  const { user, isNew } = passportUser;
  const linkToken = signLink(user.id, isNew);
  res.redirect(`${env.WEB_URL}/auth/callback?t=${linkToken}`);
}

export function handleRefresh(req: Request, res: Response): void {
  const refreshToken: unknown = req.cookies["refresh_token"];

  if (typeof refreshToken !== "string" || refreshToken.length === 0) {
    res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Sessão expirada." } });
    return;
  }

  try {
    const { userId } = verifyToken(refreshToken);
    const accessToken = signAccess(userId);
    const newRefreshToken = signRefresh(userId);
    res.json({ accessToken, refreshToken: newRefreshToken });
  } catch {
    res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Sessão expirada." } });
  }
}

export function handleLogout(_req: Request, res: Response): void {
  res.status(204).end();
}
