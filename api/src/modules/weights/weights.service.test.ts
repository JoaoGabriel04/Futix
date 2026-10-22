import { describe, it, expect, vi, beforeEach } from "vitest";

// ── mock prisma ────────────────────────────────────────────────────────────────

const { prismaMock } = vi.hoisted(() => {
  const prismaMock = {
    room: { findUnique: vi.fn(), update: vi.fn() },
    roomMember: { findMany: vi.fn(), findFirst: vi.fn() },
    playerWeight: { findMany: vi.fn(), upsert: vi.fn() },
    $transaction: vi.fn(),
  };
  return { prismaMock };
});

vi.mock("../../lib/prisma.js", () => ({
  prisma: prismaMock,
}));

vi.mock("../../socket.js", () => ({
  getIo: () => ({ to: () => ({ emit: vi.fn() }) }),
}));

// Import services AFTER vi.mock calls
import { getWeights, putWeights } from "./weights.service.js";
import { updateRoom } from "../rooms/rooms.service.js";

// ── shared fixtures ────────────────────────────────────────────────────────────

const ROOM_ID = "room-1";
const USER_ID = "user-org-1";
const OWNER_ID = "owner-1";

const PLAYER_1 = { userId: "player-1", user: { name: "Alice" } };
const PLAYER_2 = { userId: "player-2", user: { name: "Bob" } };

function makeOrgMember(role: "ORGANIZER" | "CO_ORGANIZER" = "ORGANIZER") {
  return { role };
}

// ══════════════════════════════════════════════════════════════════════════════
// R20 — getWeights
// ══════════════════════════════════════════════════════════════════════════════

describe("getWeights — R20", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns GOOD default when no weight stored", async () => {
    prismaMock.roomMember.findFirst.mockResolvedValue(makeOrgMember());
    prismaMock.room.findUnique.mockResolvedValue({ ownerId: OWNER_ID });
    prismaMock.roomMember.findMany.mockResolvedValue([PLAYER_1]);
    prismaMock.playerWeight.findMany.mockResolvedValue([]);

    const result = await getWeights(ROOM_ID, USER_ID);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ playerId: "player-1", playerName: "Alice", level: "GOOD" });
  });

  it("returns stored levels correctly", async () => {
    prismaMock.roomMember.findFirst.mockResolvedValue(makeOrgMember());
    prismaMock.room.findUnique.mockResolvedValue({ ownerId: OWNER_ID });
    prismaMock.roomMember.findMany.mockResolvedValue([PLAYER_1, PLAYER_2]);
    prismaMock.playerWeight.findMany.mockResolvedValue([
      { playerId: "player-1", level: "STAR" },
      { playerId: "player-2", level: "REGULAR" },
    ]);

    const result = await getWeights(ROOM_ID, USER_ID);

    expect(result).toHaveLength(2);
    expect(result.find((e) => e.playerId === "player-1")).toMatchObject({ level: "STAR" });
    expect(result.find((e) => e.playerId === "player-2")).toMatchObject({ level: "REGULAR" });
  });

  it("throws 403 NOT_ORGANIZER for non-org/co-org", async () => {
    prismaMock.roomMember.findFirst.mockResolvedValue(null);

    await expect(getWeights(ROOM_ID, "random-user")).rejects.toMatchObject({
      code: "NOT_ORGANIZER",
      status: 403,
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// R20 — putWeights
// ══════════════════════════════════════════════════════════════════════════════

describe("putWeights — R20", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("upserts correctly and returns updated list", async () => {
    prismaMock.roomMember.findFirst.mockResolvedValue(makeOrgMember());
    prismaMock.room.findUnique
      .mockResolvedValueOnce({ ownerId: OWNER_ID, status: "OPEN" })  // putWeights check
      .mockResolvedValueOnce({ ownerId: OWNER_ID });                  // getWeights call inside putWeights
    prismaMock.roomMember.findMany
      .mockResolvedValueOnce([PLAYER_1])  // validate playerIds in putWeights
      .mockResolvedValueOnce([PLAYER_1]); // getWeights line members
    prismaMock.$transaction.mockResolvedValue([]);
    prismaMock.playerWeight.findMany.mockResolvedValue([
      { playerId: "player-1", level: "STAR" },
    ]);

    const result = await putWeights(ROOM_ID, USER_ID, {
      items: [{ playerId: "player-1", level: "STAR" }],
    });

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ playerId: "player-1", level: "STAR" });
  });

  it("throws WEIGHTS_LOCKED when room is LIVE", async () => {
    prismaMock.roomMember.findFirst.mockResolvedValue(makeOrgMember());
    prismaMock.room.findUnique.mockResolvedValue({ ownerId: OWNER_ID, status: "LIVE" });

    await expect(
      putWeights(ROOM_ID, USER_ID, { items: [{ playerId: "player-1", level: "GOOD" }] }),
    ).rejects.toMatchObject({ code: "WEIGHTS_LOCKED", status: 423 });
  });

  it("throws WEIGHTS_LOCKED when room is FINISHED", async () => {
    prismaMock.roomMember.findFirst.mockResolvedValue(makeOrgMember());
    prismaMock.room.findUnique.mockResolvedValue({ ownerId: OWNER_ID, status: "FINISHED" });

    await expect(
      putWeights(ROOM_ID, USER_ID, { items: [{ playerId: "player-1", level: "GOOD" }] }),
    ).rejects.toMatchObject({ code: "WEIGHTS_LOCKED", status: 423 });
  });

  it("throws INVALID_PLAYER for a playerId not in the room", async () => {
    prismaMock.roomMember.findFirst.mockResolvedValue(makeOrgMember());
    prismaMock.room.findUnique.mockResolvedValue({ ownerId: OWNER_ID, status: "OPEN" });
    // findMany returns empty — no valid members found
    prismaMock.roomMember.findMany.mockResolvedValue([]);

    await expect(
      putWeights(ROOM_ID, USER_ID, { items: [{ playerId: "ghost-player", level: "GOOD" }] }),
    ).rejects.toMatchObject({ code: "INVALID_PLAYER", status: 400 });
  });

  it("allowed in DRAWN status", async () => {
    prismaMock.roomMember.findFirst.mockResolvedValue(makeOrgMember());
    prismaMock.room.findUnique
      .mockResolvedValueOnce({ ownerId: OWNER_ID, status: "DRAWN" })
      .mockResolvedValueOnce({ ownerId: OWNER_ID });
    prismaMock.roomMember.findMany
      .mockResolvedValueOnce([PLAYER_1])
      .mockResolvedValueOnce([PLAYER_1]);
    prismaMock.$transaction.mockResolvedValue([]);
    prismaMock.playerWeight.findMany.mockResolvedValue([]);

    // Should not throw
    await expect(
      putWeights(ROOM_ID, USER_ID, { items: [{ playerId: "player-1", level: "GOOD" }] }),
    ).resolves.toBeDefined();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// R21 — updateRoom rules (imported from rooms.service)
// rooms.service resolves to the same prisma mock since the module registry is shared.
// ══════════════════════════════════════════════════════════════════════════════

describe("updateRoom (rooms.service) — R21 rules fields", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updateRoom with rules fields succeeds when room is DRAWN", async () => {
    prismaMock.roomMember.findFirst.mockResolvedValue({ id: "member-1" });
    prismaMock.room.findUnique.mockResolvedValue({
      id: ROOM_ID,
      status: "DRAWN",
      members: [],
    });
    prismaMock.room.update.mockResolvedValue({ id: ROOM_ID, status: "DRAWN", matchMinutes: 15 });

    const result = await updateRoom("user-1", ROOM_ID, {}, { matchMinutes: 15 });

    expect(prismaMock.room.update).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ matchMinutes: 15 });
  });

  it("updateRoom with format fields fails when room is LOCKED", async () => {
    prismaMock.roomMember.findFirst.mockResolvedValue({ id: "member-1" });
    prismaMock.room.findUnique.mockResolvedValue({
      id: ROOM_ID,
      status: "LOCKED",
      members: [],
    });

    await expect(updateRoom("user-1", ROOM_ID, { title: "New title" })).rejects.toMatchObject({
      code: "ROOM_NOT_OPEN",
      status: 400,
    });

    expect(prismaMock.room.update).not.toHaveBeenCalled();
  });

  it("updateRoom with rules fields fails when room is LIVE (ROOM_STARTED)", async () => {
    prismaMock.roomMember.findFirst.mockResolvedValue({ id: "member-1" });
    prismaMock.room.findUnique.mockResolvedValue({
      id: ROOM_ID,
      status: "LIVE",
      members: [],
    });

    await expect(
      updateRoom("user-1", ROOM_ID, {}, { matchMinutes: 10 }),
    ).rejects.toMatchObject({ code: "ROOM_STARTED", status: 400 });

    expect(prismaMock.room.update).not.toHaveBeenCalled();
  });

  it("updateRoom with both format and rules fields fails when room is LOCKED", async () => {
    prismaMock.roomMember.findFirst.mockResolvedValue({ id: "member-1" });
    prismaMock.room.findUnique.mockResolvedValue({
      id: ROOM_ID,
      status: "LOCKED",
      members: [],
    });

    await expect(
      updateRoom("user-1", ROOM_ID, { title: "New title" }, { matchMinutes: 10 }),
    ).rejects.toMatchObject({ code: "ROOM_NOT_OPEN", status: 400 });

    expect(prismaMock.room.update).not.toHaveBeenCalled();
  });

  it("updateRoom with rules fields fails if caller is CO_ORGANIZER (NOT_ORGANIZER)", async () => {
    // The new updateRoom requires ORGANIZER role (not CO_ORGANIZER) for updates
    prismaMock.roomMember.findFirst.mockResolvedValue(null); // CO_ORGANIZER won't match role: "ORGANIZER"

    await expect(
      updateRoom("co-org-user", ROOM_ID, {}, { matchMinutes: 10 }),
    ).rejects.toMatchObject({ code: "NOT_ORGANIZER", status: 403 });

    expect(prismaMock.room.update).not.toHaveBeenCalled();
  });
});
