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
