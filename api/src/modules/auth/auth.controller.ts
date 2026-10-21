import type { Request, Response } from "express";
import { env } from "../../env.js";
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

export function handleLogout(_req: Request, res: Response): void {
  clearAuthCookies(res);
  res.status(204).end();
}
