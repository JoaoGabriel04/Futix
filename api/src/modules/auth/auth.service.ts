import bcrypt from "bcryptjs";
import type { User } from "@prisma/client";
import type { Response } from "express";
import { env } from "../../env.js";
import { signAccess, signRefresh } from "../../lib/jwt.js";
import { prisma } from "../../lib/prisma.js";
import type { Provider } from "@fut/shared";

const ACCESS_TOKEN_MAX_AGE = 900_000; // 15 minutes in ms
const REFRESH_TOKEN_MAX_AGE = 2_592_000_000; // 30 days in ms

function cookieOptions(maxAge: number): {
  httpOnly: true;
  secure: boolean;
  sameSite: "none" | "lax";
  maxAge: number;
} {
  const isProduction = env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge,
  };
}

export async function upsertUser(
  provider: Provider,
  providerId: string,
  profile: { name: string; email?: string; avatarUrl?: string },
): Promise<{ user: User; isNew: boolean }> {
  const existing = await prisma.user.findUnique({
    where: { provider_providerId: { provider, providerId } },
  });

  if (existing !== null) {
    return { user: existing, isNew: false };
  }

  const created = await prisma.user.create({
    data: {
      provider,
      providerId,
      name: profile.name,
      email: profile.email ?? null,
      avatarUrl: profile.avatarUrl ?? null,
    },
  });

  return { user: created, isNew: true };
}

export function setAuthCookies(res: Response, userId: string): void {
  const accessToken = signAccess(userId);
  const refreshToken = signRefresh(userId);

  res.cookie("access_token", accessToken, cookieOptions(ACCESS_TOKEN_MAX_AGE));
  res.cookie("refresh_token", refreshToken, cookieOptions(REFRESH_TOKEN_MAX_AGE));
}

export function clearAuthCookies(res: Response): void {
  const isProduction = env.NODE_ENV === "production";
  const base = {
    httpOnly: true as const,
    secure: isProduction,
    sameSite: (isProduction ? "none" : "lax") as "none" | "lax",
  };

  res.clearCookie("access_token", base);
  res.clearCookie("refresh_token", base);
}

// Pre-computed hash used only for timing normalization on failed logins.
// Running bcrypt.compare against this when no user is found ensures the
// response time is similar to a real password check, preventing timing attacks.
// The hash is computed once at module initialisation.
export const DUMMY_HASH: Promise<string> = bcrypt.hash(
  "dummy-timing-protection-string",
  12,
);

function makeAppError(
  message: string,
  code: string,
  status: number,
): Error & { code: string; status: number } {
  const err = new Error(message) as Error & { code: string; status: number };
  err.code = code;
  err.status = status;
  return err;
}

const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).+$/;

export function assertPasswordStrength(password: string): void {
  const lengthOk = password.length >= 8 && password.length <= 72;
  const compositionOk = PASSWORD_REGEX.test(password);

  if (!lengthOk || !compositionOk) {
    throw makeAppError(
      "A senha deve ter entre 8 e 72 caracteres e conter pelo menos uma letra e um número",
      "WEAK_PASSWORD",
      400,
    );
  }
}

/**
 * R38 — Register a new user with email + password.
 * Returns the created User (without passwordHash).
 */
export async function registerWithEmail(
  name: string,
  rawEmail: string,
  password: string,
): Promise<Omit<User, "passwordHash">> {
  const email = rawEmail.toLowerCase().trim();

  assertPasswordStrength(password);

  // Check for duplicate email (case-insensitive via lower() index created in T1)
  const existing = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });
  if (existing !== null) {
    throw makeAppError("Este e-mail já está em uso", "EMAIL_TAKEN", 409);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
    },
  });

  // Return user without passwordHash
  const { passwordHash: _omit, ...safeUser } = user;
  return safeUser;
}

/**
 * R39 — Login with email + password.
 * Returns the User (without passwordHash) on success.
 */
export async function loginWithEmail(
  rawEmail: string,
  password: string,
): Promise<Omit<User, "passwordHash">> {
  const email = rawEmail.toLowerCase().trim();

  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });

  const dummyHash = await DUMMY_HASH;

  if (user === null) {
    // Timing-attack mitigation: run bcrypt.compare even when user doesn't exist
    await bcrypt.compare(password, dummyHash);
    throw makeAppError("E-mail ou senha incorretos", "INVALID_CREDENTIALS", 401);
  }

  const hashToCheck = user.passwordHash ?? dummyHash;
  const isValid = await bcrypt.compare(password, hashToCheck);

  if (!isValid || user.passwordHash === null) {
    throw makeAppError("E-mail ou senha incorretos", "INVALID_CREDENTIALS", 401);
  }

  const { passwordHash: _omit, ...safeUser } = user;
  return safeUser;
}
