import { describe, it, expect, vi, beforeEach } from "vitest";

// ── mock prisma ────────────────────────────────────────────────────────────────

const { prismaMock } = vi.hoisted(() => {
  const prismaMock = {
    user: {
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
    authIdentity: {
      deleteMany: vi.fn(),
    },
  };
  return { prismaMock };
});

vi.mock("../../lib/prisma.js", () => ({
  prisma: prismaMock,
}));

// ── mock env ──────────────────────────────────────────────────────────────────

vi.mock("../../env.js", () => ({
  env: {
    NODE_ENV: "test",
    JWT_SECRET: "test-secret-key-that-is-long-enough-for-validation",
    JWT_EXPIRES_IN: "15m",
    REFRESH_EXPIRES_IN: "30d",
    CLOUDINARY_CLOUD_NAME: "",
    CLOUDINARY_API_KEY: "",
    CLOUDINARY_API_SECRET: "",
  },
}));

// ── mock cloudinary ───────────────────────────────────────────────────────────

const { uploadAvatarMock, deleteAvatarMock } = vi.hoisted(() => {
  return {
    uploadAvatarMock: vi.fn(),
    deleteAvatarMock: vi.fn(),
  };
});

vi.mock("../../lib/cloudinary.js", () => ({
  uploadAvatar: uploadAvatarMock,
  deleteAvatar: deleteAvatarMock,
}));

// Import AFTER vi.mock declarations
import { getMe, deleteConnection, updateAvatar, deleteUserAvatar } from "./users.service.js";

// ── fixtures ──────────────────────────────────────────────────────────────────

const FAKE_GOOGLE_IDENTITY = {
  id: "identity-google-1",
  userId: "user-abc",
  provider: "GOOGLE" as const,
  providerId: "google-123",
  createdAt: new Date(),
};

const FAKE_DISCORD_IDENTITY = {
  id: "identity-discord-1",
  userId: "user-abc",
  provider: "DISCORD" as const,
  providerId: "discord-456",
  createdAt: new Date(),
};

const BASE_USER = {
  id: "user-abc",
  name: "João Silva",
  email: "joao@example.com",
  provider: null,
  providerId: null,
  passwordHash: null,
  nickname: null,
  phone: null,
  preferredPosition: null,
  avatarUrl: null,
  avatarPublicId: null,
  createdAt: new Date(),
};

// ══════════════════════════════════════════════════════════════════════════════
// R41 — GET /me: connections field
// ══════════════════════════════════════════════════════════════════════════════

describe("getMe — R41: connections field", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns connections.google=true when user has a GOOGLE AuthIdentity", async () => {
    prismaMock.user.findUniqueOrThrow.mockResolvedValue({
      ...BASE_USER,
      authIdentities: [FAKE_GOOGLE_IDENTITY],
    });

    const result = await getMe("user-abc");

    expect(result.connections.google).toBe(true);
    expect(result.connections.discord).toBe(false);
    expect(result.connections.password).toBe(false);
  });

  it("returns connections.discord=true when user has a DISCORD AuthIdentity", async () => {
    prismaMock.user.findUniqueOrThrow.mockResolvedValue({
      ...BASE_USER,
      authIdentities: [FAKE_DISCORD_IDENTITY],
    });

    const result = await getMe("user-abc");

    expect(result.connections.google).toBe(false);
    expect(result.connections.discord).toBe(true);
    expect(result.connections.password).toBe(false);
  });

  it("returns connections.password=true when user has a passwordHash", async () => {
    prismaMock.user.findUniqueOrThrow.mockResolvedValue({
      ...BASE_USER,
      passwordHash: "$2b$12$hashedpassword",
      authIdentities: [],
    });

    const result = await getMe("user-abc");

    expect(result.connections.google).toBe(false);
    expect(result.connections.discord).toBe(false);
    expect(result.connections.password).toBe(true);
  });

  it("returns all connections correctly when user has all methods", async () => {
    prismaMock.user.findUniqueOrThrow.mockResolvedValue({
      ...BASE_USER,
      passwordHash: "$2b$12$hashedpassword",
      authIdentities: [FAKE_GOOGLE_IDENTITY, FAKE_DISCORD_IDENTITY],
    });

    const result = await getMe("user-abc");

    expect(result.connections.google).toBe(true);
    expect(result.connections.discord).toBe(true);
    expect(result.connections.password).toBe(true);
  });

  it("returns all connections false when user has no auth methods", async () => {
    prismaMock.user.findUniqueOrThrow.mockResolvedValue({
      ...BASE_USER,
      authIdentities: [],
    });

    const result = await getMe("user-abc");

    expect(result.connections.google).toBe(false);
    expect(result.connections.discord).toBe(false);
    expect(result.connections.password).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// R42 — DELETE /me/connections/:provider
// ══════════════════════════════════════════════════════════════════════════════

describe("deleteConnection — R42: disconnect provider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes identity and returns void when user has 2 methods (google + password)", async () => {
    prismaMock.user.findUniqueOrThrow.mockResolvedValue({
      ...BASE_USER,
      passwordHash: "$2b$12$hashedpassword",
      authIdentities: [FAKE_GOOGLE_IDENTITY],
    });
    prismaMock.authIdentity.deleteMany.mockResolvedValue({ count: 1 });

    await expect(deleteConnection("user-abc", "GOOGLE")).resolves.toBeUndefined();

    expect(prismaMock.authIdentity.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user-abc", provider: "GOOGLE" },
    });
  });

  it("deletes discord identity when user has google + discord + no password", async () => {
    prismaMock.user.findUniqueOrThrow.mockResolvedValue({
      ...BASE_USER,
      authIdentities: [FAKE_GOOGLE_IDENTITY, FAKE_DISCORD_IDENTITY],
    });
    prismaMock.authIdentity.deleteMany.mockResolvedValue({ count: 1 });

    await expect(deleteConnection("user-abc", "DISCORD")).resolves.toBeUndefined();

    expect(prismaMock.authIdentity.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user-abc", provider: "DISCORD" },
    });
  });

  it("throws LAST_LOGIN_METHOD (400) when user has only 1 method (google only, no password)", async () => {
    prismaMock.user.findUniqueOrThrow.mockResolvedValue({
      ...BASE_USER,
      passwordHash: null,
      authIdentities: [FAKE_GOOGLE_IDENTITY],
    });

    await expect(deleteConnection("user-abc", "GOOGLE")).rejects.toMatchObject({
      code: "LAST_LOGIN_METHOD",
      status: 400,
    });

    expect(prismaMock.authIdentity.deleteMany).not.toHaveBeenCalled();
  });

  it("throws LAST_LOGIN_METHOD (400) when user has only 1 method (password only, no identities)", async () => {
    prismaMock.user.findUniqueOrThrow.mockResolvedValue({
      ...BASE_USER,
      passwordHash: "$2b$12$hashedpassword",
      authIdentities: [],
    });

    await expect(deleteConnection("user-abc", "DISCORD")).rejects.toMatchObject({
      code: "LAST_LOGIN_METHOD",
      status: 400,
    });

    expect(prismaMock.authIdentity.deleteMany).not.toHaveBeenCalled();
  });

  it("throws LAST_LOGIN_METHOD with the correct message", async () => {
    prismaMock.user.findUniqueOrThrow.mockResolvedValue({
      ...BASE_USER,
      authIdentities: [FAKE_DISCORD_IDENTITY],
    });

    await expect(deleteConnection("user-abc", "DISCORD")).rejects.toMatchObject({
      message: "Você não pode remover o único método de login",
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// R41 — signOAuthState / verifyOAuthState (unit — JWT state for link flow)
// ══════════════════════════════════════════════════════════════════════════════

describe("signOAuthState / verifyOAuthState — R41: link OAuth state JWT", () => {
  it("generates and verifies a valid state JWT with userId and provider", async () => {
    const jwt = await import("../../lib/jwt.js");
    const state = jwt.signOAuthState("user-xyz", "google");
    expect(typeof state).toBe("string");
    expect(state.length).toBeGreaterThan(0);

    const decoded = jwt.verifyOAuthState(state);
    expect(decoded.userId).toBe("user-xyz");
    expect(decoded.provider).toBe("google");
  });

  it("throws when state JWT has been tampered with", async () => {
    const jwt = await import("../../lib/jwt.js");
    expect(() => jwt.verifyOAuthState("invalid.jwt.token")).toThrow();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// R45 — updateAvatar: saves avatarPublicId, deletes previous from Cloudinary
// ══════════════════════════════════════════════════════════════════════════════

describe("updateAvatar — R45: save publicId + delete previous", () => {
  const FAKE_BUFFER = Buffer.from("fake-image");
  const FAKE_MIMETYPE = "image/jpeg";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uploads and saves url+publicId when user has no previous avatar", async () => {
    prismaMock.user.findUniqueOrThrow.mockResolvedValue({ avatarPublicId: null });
    uploadAvatarMock.mockResolvedValue({ url: "https://cdn/new.jpg", publicId: "fut/avatars/new" });
    prismaMock.user.update.mockResolvedValue({
      ...BASE_USER,
      avatarUrl: "https://cdn/new.jpg",
      avatarPublicId: "fut/avatars/new",
    });

    const result = await updateAvatar("user-abc", FAKE_BUFFER, FAKE_MIMETYPE);

    expect(uploadAvatarMock).toHaveBeenCalledWith(FAKE_BUFFER, FAKE_MIMETYPE);
    expect(deleteAvatarMock).not.toHaveBeenCalled();
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "user-abc" },
      data: { avatarUrl: "https://cdn/new.jpg", avatarPublicId: "fut/avatars/new" },
    });
    expect(result.avatarUrl).toBe("https://cdn/new.jpg");
    expect(result.avatarPublicId).toBe("fut/avatars/new");
  });

  it("deletes previous Cloudinary asset and saves new values when user had a previous avatar", async () => {
    prismaMock.user.findUniqueOrThrow.mockResolvedValue({ avatarPublicId: "fut/avatars/old" });
    uploadAvatarMock.mockResolvedValue({ url: "https://cdn/new.jpg", publicId: "fut/avatars/new" });
    deleteAvatarMock.mockResolvedValue(undefined);
    prismaMock.user.update.mockResolvedValue({
      ...BASE_USER,
      avatarUrl: "https://cdn/new.jpg",
      avatarPublicId: "fut/avatars/new",
    });

    await updateAvatar("user-abc", FAKE_BUFFER, FAKE_MIMETYPE);

    expect(deleteAvatarMock).toHaveBeenCalledWith("fut/avatars/old");
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "user-abc" },
      data: { avatarUrl: "https://cdn/new.jpg", avatarPublicId: "fut/avatars/new" },
    });
  });

  it("proceeds with upload even if deleteAvatar fails silently", async () => {
    prismaMock.user.findUniqueOrThrow.mockResolvedValue({ avatarPublicId: "fut/avatars/old" });
    uploadAvatarMock.mockResolvedValue({ url: "https://cdn/new.jpg", publicId: "fut/avatars/new" });
    deleteAvatarMock.mockRejectedValue(new Error("Cloudinary delete failed"));
    prismaMock.user.update.mockResolvedValue({
      ...BASE_USER,
      avatarUrl: "https://cdn/new.jpg",
      avatarPublicId: "fut/avatars/new",
    });

    const result = await updateAvatar("user-abc", FAKE_BUFFER, FAKE_MIMETYPE);

    expect(deleteAvatarMock).toHaveBeenCalledWith("fut/avatars/old");
    expect(prismaMock.user.update).toHaveBeenCalled();
    expect(result.avatarUrl).toBe("https://cdn/new.jpg");
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// R46 — deleteUserAvatar: deletes from Cloudinary + clears DB fields
// ══════════════════════════════════════════════════════════════════════════════

describe("deleteUserAvatar — R46: clear avatar fields", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls deleteAvatar and clears avatarUrl + avatarPublicId when user has an avatar", async () => {
    prismaMock.user.findUniqueOrThrow.mockResolvedValue({ avatarPublicId: "fut/avatars/existing" });
    deleteAvatarMock.mockResolvedValue(undefined);
    prismaMock.user.update.mockResolvedValue({
      ...BASE_USER,
      avatarUrl: null,
      avatarPublicId: null,
    });

    const result = await deleteUserAvatar("user-abc");

    expect(deleteAvatarMock).toHaveBeenCalledWith("fut/avatars/existing");
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "user-abc" },
      data: { avatarUrl: null, avatarPublicId: null },
    });
    expect(result.avatarUrl).toBeNull();
    expect(result.avatarPublicId).toBeNull();
  });

  it("does NOT call deleteAvatar and still clears fields when user has no avatar", async () => {
    prismaMock.user.findUniqueOrThrow.mockResolvedValue({ avatarPublicId: null });
    prismaMock.user.update.mockResolvedValue({
      ...BASE_USER,
      avatarUrl: null,
      avatarPublicId: null,
    });

    const result = await deleteUserAvatar("user-abc");

    expect(deleteAvatarMock).not.toHaveBeenCalled();
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "user-abc" },
      data: { avatarUrl: null, avatarPublicId: null },
    });
    expect(result.avatarUrl).toBeNull();
  });
});
