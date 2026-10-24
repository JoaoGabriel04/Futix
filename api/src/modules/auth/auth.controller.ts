import type { Request, Response } from "express";
import { env } from "../../env.js";
import { signAccess, signLink, signRefresh, verifyToken } from "../../lib/jwt.js";
import { registerSchema, loginSchema } from "./auth.schema.js";
import { registerWithEmail, loginWithEmail, setAuthCookies } from "./auth.service.js";

export async function handleRegister(req: Request, res: Response): Promise<void> {
  const body = registerSchema.parse(req.body);
  const user = await registerWithEmail(body.name, body.email, body.password);
  setAuthCookies(res, user.id);
  res.status(201).json({ user });
}

export async function handleLogin(req: Request, res: Response): Promise<void> {
  const body = loginSchema.parse(req.body);
  const user = await loginWithEmail(body.email, body.password);
  setAuthCookies(res, user.id);
  res.json({ user });
}

export function handleOAuthCallback(req: Request, res: Response): void {
  const passportUser = req.user as
    | { user: { id: string }; isNew: boolean }
    | { errorCode: string }
    | undefined;

  if (!passportUser) {
    res.redirect(`${env.WEB_URL}/entrar`);
    return;
  }

  // EMAIL_IN_USE_OTHER_METHOD — email belongs to an existing account
  if ("errorCode" in passportUser) {
    res.redirect(`${env.WEB_URL}/entrar?error=${passportUser.errorCode}`);
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
