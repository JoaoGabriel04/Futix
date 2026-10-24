import bcrypt from "bcryptjs";
import type { User, AuthProvider } from "@prisma/client";
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

// ── OAuth identity resolution ─────────────────────────────────────────────────

export class EmailInUseOtherMethodError extends Error {
  readonly code = "EMAIL_IN_USE_OTHER_METHOD";
  readonly status = 409;

  constructor() {
    super(
      "Esse e-mail já tem conta. Entre com o método original e conecte este em Perfil",
    );
    this.name = "EmailInUseOtherMethodError";
  }
}

/**
 * R40 — Resolve an OAuth identity against AuthIdentity records.
 *
 * Pure business-logic function (no HTTP concerns) — takes the OAuth profile
 * data and returns the matching User, creating it if needed.
 *
 * Throws `EmailInUseOtherMethodError` when the email belongs to an existing
 * user that does NOT yet have this specific AuthIdentity (prevents account
 * takeover via social login with a known e-mail).
 */
export async function resolveOAuthIdentity(
  provider: AuthProvider,
  providerId: string,
  profile: { name: string; email?: string; avatarUrl?: string },
): Promise<{ user: User; isNew: boolean }> {
  // 1. Check if an AuthIdentity already exists for this provider+providerId
  const identity = await prisma.authIdentity.findUnique({
    where: { provider_providerId: { provider, providerId } },
    include: { user: true },
  });

  if (identity !== null) {
    // Happy path: returning user with this social login
    return { user: identity.user, isNew: false };
  }

  // 2. AuthIdentity not found — check if email is already in use
  if (profile.email !== undefined) {
    const existingUser = await prisma.user.findFirst({
      where: { email: { equals: profile.email, mode: "insensitive" } },
      include: { authIdentities: { where: { provider, providerId } } },
    });

    if (existingUser !== null) {
      if (existingUser.authIdentities.length > 0) {
        // Race condition: identity was created between our two queries — treat as success
        return { user: existingUser, isNew: false };
      }
      // Email belongs to another account without this identity → block
      throw new EmailInUseOtherMethodError();
    }
  }

  // 3. No conflict — create new User + AuthIdentity
  // AuthProvider enum values (GOOGLE/DISCORD) match the legacy Provider enum
  const created = await prisma.user.create({
    data: {
      provider: provider as unknown as Provider,
      providerId,
      name: profile.name,
      email: profile.email ?? null,
      avatarUrl: profile.avatarUrl ?? null,
      authIdentities: {
        create: { provider, providerId },
      },
    },
  });

  return { user: created, isNew: true };
}

/**
 * Wraps `resolveOAuthIdentity` with the legacy `Provider` string type used
 * by the Passport strategy callbacks in auth.routes.ts.
 * Also updates the legacy `provider`/`providerId` columns on the User when the
 * user already existed via AuthIdentity (first-time migration path).
 */
export async function upsertUser(
  provider: Provider,
  providerId: string,
  profile: { name: string; email?: string; avatarUrl?: string },
): Promise<{ user: User; isNew: boolean }> {
  // Provider enum values are identical in both the legacy Provider and
  // AuthProvider enums (GOOGLE / DISCORD), so the cast is safe.
  const authProvider = provider as AuthProvider;
  const result = await resolveOAuthIdentity(authProvider, providerId, profile);

  // Keep legacy columns in sync when the user was pre-existing and they differ
  if (
    !result.isNew &&
    (result.user.provider !== provider || result.user.providerId !== providerId)
  ) {
    await prisma.user.update({
      where: { id: result.user.id },
      data: { provider, providerId },
    });
  }

  return result;
}

/**
 * R41 — Link an OAuth provider to an existing user account.
 *
 * Called from the OAuth callback when the state indicates `link: true`.
 * Creates the AuthIdentity for the given userId if it doesn't already exist.
 *
 * Throws `EmailInUseOtherMethodError` when the providerId already belongs to
 * a DIFFERENT user (account takeover prevention).
 */
export async function linkOAuthIdentity(
  userId: string,
  provider: AuthProvider,
  providerId: string,
  profile: { name: string; email?: string; avatarUrl?: string },
): Promise<void> {
  // Check if this provider+providerId is already linked to another user
  const existingIdentity = await prisma.authIdentity.findUnique({
    where: { provider_providerId: { provider, providerId } },
  });

  if (existingIdentity !== null) {
    if (existingIdentity.userId === userId) {
      // Already linked to the same user — idempotent success
      return;
    }
    // Linked to a different user → block
    throw new EmailInUseOtherMethodError();
  }

  // Create the new AuthIdentity linking this provider to the existing user
  await prisma.authIdentity.create({
    data: { userId, provider, providerId },
  });

  // Update legacy columns on the User if they're not set yet
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user !== null && user.provider === null) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        provider: provider as unknown as typeof user.provider,
        providerId,
        ...(profile.avatarUrl !== undefined && user.avatarUrl === null && { avatarUrl: profile.avatarUrl }),
      },
    });
  }
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
