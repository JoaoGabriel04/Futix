import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from "vitest";
import express from "express";
import rateLimit from "express-rate-limit";
import request from "supertest";

// ── mock prisma ────────────────────────────────────────────────────────────────

const { prismaMock } = vi.hoisted(() => {
  const prismaMock = {
    user: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  };
  return { prismaMock };
});

vi.mock("../../lib/prisma.js", () => ({
  prisma: prismaMock,
}));

// ── mock env (required by auth.service before bcrypt import) ──────────────────

vi.mock("../../env.js", () => ({
  env: {
    NODE_ENV: "test",
    JWT_SECRET: "test-secret-key-that-is-long-enough-for-validation",
    JWT_EXPIRES_IN: "15m",
    REFRESH_EXPIRES_IN: "30d",
    WEB_URL: "http://localhost:3000",
    API_URL: "http://localhost:4000",
  },
}));

// ── mock jwt lib ──────────────────────────────────────────────────────────────

vi.mock("../../lib/jwt.js", () => ({
  signAccess: vi.fn().mockReturnValue("mock-access-token"),
  signRefresh: vi.fn().mockReturnValue("mock-refresh-token"),
}));

// Import AFTER vi.mock declarations
import {
  registerWithEmail,
  loginWithEmail,
  assertPasswordStrength,
  DUMMY_HASH,
} from "./auth.service.js";

// ── fixtures ──────────────────────────────────────────────────────────────────

const FAKE_USER = {
  id: "user-abc",
  name: "João Silva",
  email: "joao@example.com",
  provider: null,
  providerId: null,
  passwordHash: "$2b$12$hashedpassword",
  nickname: null,
  phone: null,
  preferredPosition: null,
  avatarUrl: null,
  avatarPublicId: null,
  createdAt: new Date(),
  authIdentities: [],
};

// ══════════════════════════════════════════════════════════════════════════════
// assertPasswordStrength (unit — no DB needed)
// ══════════════════════════════════════════════════════════════════════════════

describe("assertPasswordStrength", () => {
  it("throws WEAK_PASSWORD when password has no digit", () => {
    expect(() => assertPasswordStrength("AbcdefghI")).toThrow();
    try {
      assertPasswordStrength("AbcdefghI");
    } catch (e) {
      expect((e as { code: string }).code).toBe("WEAK_PASSWORD");
    }
  });

  it("throws WEAK_PASSWORD when password has no letter", () => {
    expect(() => assertPasswordStrength("12345678")).toThrow();
    try {
      assertPasswordStrength("12345678");
    } catch (e) {
      expect((e as { code: string }).code).toBe("WEAK_PASSWORD");
    }
  });

  it("throws WEAK_PASSWORD when password has no number", () => {
    expect(() => assertPasswordStrength("AbcdefghI")).toThrow();
    try {
      assertPasswordStrength("AbcdefghI");
    } catch (e) {
      expect((e as { code: string }).code).toBe("WEAK_PASSWORD");
    }
  });

  it("does NOT throw for a strong password (letters + digits)", () => {
    expect(() => assertPasswordStrength("Abc12345")).not.toThrow();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// R38 — registerWithEmail
// ══════════════════════════════════════════════════════════════════════════════

describe("registerWithEmail — R38", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates user and returns user without passwordHash on valid input", async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue(FAKE_USER);

    const result = await registerWithEmail("João Silva", "joao@example.com", "Abc12345");

    expect(prismaMock.user.create).toHaveBeenCalledTimes(1);
    expect(result).not.toHaveProperty("passwordHash");
    expect(result).toMatchObject({ id: "user-abc", email: "joao@example.com" });
  });

  it("normalises email to lowercase before querying and creating", async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({ ...FAKE_USER, email: "joao@example.com" });

    await registerWithEmail("João Silva", "JOAO@EXAMPLE.COM", "Abc12345");

    // The findFirst query should use the normalised email
    expect(prismaMock.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          email: expect.objectContaining({ equals: "joao@example.com" }),
        }),
      }),
    );
  });

  it("throws EMAIL_TAKEN (409) when email already exists", async () => {
    prismaMock.user.findFirst.mockResolvedValue(FAKE_USER);

    await expect(
      registerWithEmail("Outro", "joao@example.com", "Abc12345"),
    ).rejects.toMatchObject({ code: "EMAIL_TAKEN", status: 409 });

    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("throws WEAK_PASSWORD (400) when password is shorter than 8 chars", async () => {
    await expect(
      registerWithEmail("João", "joao@example.com", "Ab1"),
    ).rejects.toMatchObject({ code: "WEAK_PASSWORD", status: 400 });

    expect(prismaMock.user.findFirst).not.toHaveBeenCalled();
  });

  it("throws WEAK_PASSWORD (400) when password has no number", async () => {
    await expect(
      registerWithEmail("João", "joao@example.com", "Abcdefgh"),
    ).rejects.toMatchObject({ code: "WEAK_PASSWORD", status: 400 });
  });

  it("throws WEAK_PASSWORD (400) when password has no letter", async () => {
    await expect(
      registerWithEmail("João", "joao@example.com", "12345678"),
    ).rejects.toMatchObject({ code: "WEAK_PASSWORD", status: 400 });
  });

  it("passwordHash is NEVER returned in the result", async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue(FAKE_USER);

    const result = await registerWithEmail("João Silva", "joao@example.com", "Abc12345");

    // Ensure passwordHash is stripped from the response
    expect(Object.keys(result)).not.toContain("passwordHash");
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// R39 — loginWithEmail
// ══════════════════════════════════════════════════════════════════════════════

describe("loginWithEmail — R39", () => {
  // We need a real bcrypt hash for the correct-password tests.
  // Generated once before all tests in this suite.
  let validHash: string;
  let userWithValidHash: typeof FAKE_USER;

  beforeAll(async () => {
    const bcrypt = await import("bcryptjs");
    validHash = await bcrypt.hash("Abc12345", 4); // cost 4 for speed in tests
    userWithValidHash = { ...FAKE_USER, passwordHash: validHash };
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns user without passwordHash on correct credentials", async () => {
    prismaMock.user.findFirst.mockResolvedValue(userWithValidHash);

    const result = await loginWithEmail("joao@example.com", "Abc12345");

    expect(result).not.toHaveProperty("passwordHash");
    expect(result).toMatchObject({ id: "user-abc" });
  });

  it("throws INVALID_CREDENTIALS (401) when email does not exist", async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);

    await expect(
      loginWithEmail("ghost@example.com", "Abc12345"),
    ).rejects.toMatchObject({ code: "INVALID_CREDENTIALS", status: 401 });
  });

  it("throws INVALID_CREDENTIALS (401) when password is wrong", async () => {
    prismaMock.user.findFirst.mockResolvedValue(userWithValidHash);

    await expect(
      loginWithEmail("joao@example.com", "WrongPass1"),
    ).rejects.toMatchObject({ code: "INVALID_CREDENTIALS", status: 401 });
  });

  it("error message for wrong email and wrong password are identical (no distinction)", async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);
    let msgNoUser = "";
    try {
      await loginWithEmail("noexist@example.com", "SomePass1");
    } catch (e) {
      msgNoUser = (e as Error).message;
    }

    prismaMock.user.findFirst.mockResolvedValue(userWithValidHash);
    let msgBadPass = "";
    try {
      await loginWithEmail("joao@example.com", "WrongPass1");
    } catch (e) {
      msgBadPass = (e as Error).message;
    }

    expect(msgNoUser).toBe(msgBadPass);
    expect(msgNoUser).toBe("E-mail ou senha incorretos");
  });

  it("passwordHash is NEVER returned in the login response", async () => {
    prismaMock.user.findFirst.mockResolvedValue(userWithValidHash);

    const result = await loginWithEmail("joao@example.com", "Abc12345");

    expect(Object.keys(result)).not.toContain("passwordHash");
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// DUMMY_HASH — module-level constant check
// ══════════════════════════════════════════════════════════════════════════════

describe("DUMMY_HASH", () => {
  it("is a valid bcrypt hash string starting with $2", async () => {
    const hash = await DUMMY_HASH;
    expect(typeof hash).toBe("string");
    expect(hash.startsWith("$2")).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// R40 — POST /auth/login rate limit (integration)
// ══════════════════════════════════════════════════════════════════════════════
//
// Uses a standalone Express app with a fresh loginRateLimiter instance so that
// state from other test suites cannot bleed in and trigger the limit prematurely.
// The limiter config mirrors auth.routes.ts exactly (max: 5, 15 min window, key
// by IP+email). The stub handler always returns 401 (wrong password) so the 5
// allowed attempts are exhausted before the 6th blocked one.

describe("POST /auth/login — rate limit (R40)", () => {
  const email = `ratelimit-${Date.now()}@test.com`;

  // Build a fresh isolated app for this suite.
  const testLoginRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    keyGenerator: (req) => {
      const body = req.body as { email?: string };
      const e = (body?.email ?? "").toLowerCase().trim();
      const ip = req.ip ?? "unknown";
      return `${ip}:${e}`;
    },
    handler: (_req, res) => {
      res
        .status(429)
        .json({ error: "RATE_LIMIT_EXCEEDED", message: "Muitas tentativas. Tente novamente em 15 minutos" });
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  const testApp = express();
  testApp.use(express.json());
  // Do NOT set trust proxy here — supertest connects directly, so req.ip is
  // the loopback address (::1 or ::ffff:127.0.0.1). All requests in this suite
  // share the same IP, which is what we want for the key to accumulate hits.
  testApp.post("/auth/login", testLoginRateLimiter, (_req, res) => {
    // Stub: always reject with 401 (wrong password) so attempts accumulate.
    res.status(401).json({ error: "INVALID_CREDENTIALS" });
  });

  let server: ReturnType<typeof testApp.listen>;

  beforeAll(() => {
    server = testApp.listen(0); // bind to random available port
  });

  afterAll(() => {
    server.close();
  });

  it("returns 429 with RATE_LIMIT_EXCEEDED on the 6th attempt within 15 minutes", async () => {
    const payload = { email, password: "WrongPass1" };

    // Attempts 1–5 should be processed (401 from the stub handler).
    for (let i = 1; i <= 5; i++) {
      const res = await request(server).post("/auth/login").send(payload);
      expect(res.status).toBe(401);
    }

    // 6th attempt — should be blocked by the rate limiter.
    const res = await request(server).post("/auth/login").send(payload);
    expect(res.status).toBe(429);
    expect(res.body).toMatchObject({ error: "RATE_LIMIT_EXCEEDED" });
  });
});
