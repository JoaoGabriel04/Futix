import jwt from "jsonwebtoken";
import { env } from "../env.js";

export function signAccess(userId: string): string {
  return jwt.sign({ userId }, env.JWT_SECRET, {
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

export function verifyToken(token: string): { userId: string } {
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

  return { userId: (decoded as { userId: string }).userId };
}
