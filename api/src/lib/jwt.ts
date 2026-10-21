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
