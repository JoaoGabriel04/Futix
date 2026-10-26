import jwt from "jsonwebtoken";
import { env } from "../env.js";

export function signAccess(userId: string, sessionVersion: number): string {
  return jwt.sign({ userId, sessionVersion }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  } as jwt.SignOptions);
}

export function signRefresh(userId: string): string {
  return jwt.sign({ userId }, env.JWT_SECRET, {
    expiresIn: env.REFRESH_EXPIRES_IN,
  } as jwt.SignOptions);
}

// Short-lived (60s) token used to hand off auth from the API OAuth callback
// to the web domain's Route Handler, which sets the actual cookies.
export function signLink(userId: string, isNew: boolean): string {
  return jwt.sign({ userId, isNew, type: "oauth-link" }, env.JWT_SECRET, {
    expiresIn: "60s",
  } as jwt.SignOptions);
}

export function verifyLink(token: string): { userId: string; isNew: boolean } {
  let decoded: unknown;
  try {
    decoded = jwt.verify(token, env.JWT_SECRET);
  } catch (err) {
    const message = err instanceof jwt.TokenExpiredError ? "Link expirado." : "Link inválido.";
    const error = new Error(message) as Error & { status: number; code: string };
    error.status = 401;
    error.code = "UNAUTHORIZED";
    throw error;
  }

  if (
    typeof decoded !== "object" ||
    decoded === null ||
    !("userId" in decoded) ||
    typeof (decoded as { userId?: unknown }).userId !== "string" ||
    !("isNew" in decoded) ||
    typeof (decoded as { isNew?: unknown }).isNew !== "boolean" ||
    (decoded as { type?: unknown }).type !== "oauth-link"
  ) {
    const error = new Error("Link inválido.") as Error & { status: number; code: string };
    error.status = 401;
    error.code = "UNAUTHORIZED";
    throw error;
  }

  return {
    userId: (decoded as { userId: string; isNew: boolean }).userId,
    isNew: (decoded as { userId: string; isNew: boolean }).isNew,
  };
}

// Short-lived (5 min) state token used to carry userId + link flag through the
// OAuth round-trip so the callback knows this is a "link" request, not a login.
export function signOAuthState(userId: string, provider: string): string {
  return jwt.sign(
    { userId, link: true, provider, type: "oauth-state" },
    env.JWT_SECRET,
    { expiresIn: "5m" } as jwt.SignOptions,
  );
}

export function verifyOAuthState(token: string): { userId: string; provider: string } {
  let decoded: unknown;
  try {
    decoded = jwt.verify(token, env.JWT_SECRET);
  } catch (err) {
    const message = err instanceof jwt.TokenExpiredError ? "State expirado." : "State inválido.";
    const error = new Error(message) as Error & { status: number; code: string };
    error.status = 401;
    error.code = "UNAUTHORIZED";
    throw error;
  }

  if (
    typeof decoded !== "object" ||
    decoded === null ||
    !("userId" in decoded) ||
    typeof (decoded as { userId?: unknown }).userId !== "string" ||
    !("provider" in decoded) ||
    typeof (decoded as { provider?: unknown }).provider !== "string" ||
    (decoded as { link?: unknown }).link !== true ||
    (decoded as { type?: unknown }).type !== "oauth-state"
  ) {
    const error = new Error("State inválido.") as Error & { status: number; code: string };
    error.status = 401;
    error.code = "UNAUTHORIZED";
    throw error;
  }

  return {
    userId: (decoded as { userId: string; provider: string }).userId,
    provider: (decoded as { userId: string; provider: string }).provider,
  };
}

// Token de curta duração (5 min) emitido pela Render ao receber o access_token
// via proxy Next.js. Permite que a rota OAuth link seja iniciada sem expor o
// access_token na URL e sem depender de cookies cross-domain.
export function signLinkInit(userId: string): string {
  return jwt.sign({ userId, type: "link-init" }, env.JWT_SECRET, {
    expiresIn: "5m",
  } as jwt.SignOptions);
}

export function verifyLinkInit(token: string): { userId: string } {
  let decoded: unknown;
  try {
    decoded = jwt.verify(token, env.JWT_SECRET);
  } catch (err) {
    const message = err instanceof jwt.TokenExpiredError ? "Link expirado." : "Link inválido.";
    const error = new Error(message) as Error & { status: number; code: string };
    error.status = 401;
    error.code = "UNAUTHORIZED";
    throw error;
  }

  if (
    typeof decoded !== "object" ||
    decoded === null ||
    !("userId" in decoded) ||
    typeof (decoded as { userId?: unknown }).userId !== "string" ||
    (decoded as { type?: unknown }).type !== "link-init"
  ) {
    const error = new Error("Link inválido.") as Error & { status: number; code: string };
    error.status = 401;
    error.code = "UNAUTHORIZED";
    throw error;
  }

  return { userId: (decoded as { userId: string }).userId };
}

export function verifyToken(token: string): { userId: string; sessionVersion: number | undefined } {
  let decoded: unknown;

  try {
    decoded = jwt.verify(token, env.JWT_SECRET);
  } catch (err) {
    const message =
      err instanceof jwt.TokenExpiredError ? "Token expirado." : "Token inválido.";
    const error = new Error(message) as Error & { status: number; code: string };
    error.status = 401;
    error.code = "UNAUTHORIZED";
    throw error;
  }

  if (
    typeof decoded !== "object" ||
    decoded === null ||
    !("userId" in decoded) ||
    typeof (decoded as { userId?: unknown }).userId !== "string"
  ) {
    const error = new Error("Token inválido.") as Error & { status: number; code: string };
    error.status = 401;
    error.code = "UNAUTHORIZED";
    throw error;
  }

  const payload = decoded as { userId: string; sessionVersion?: unknown };
  const sessionVersion =
    typeof payload.sessionVersion === "number" ? payload.sessionVersion : undefined;

  return { userId: payload.userId, sessionVersion };
}
