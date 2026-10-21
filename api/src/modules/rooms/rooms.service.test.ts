import { describe, it, expect, vi, beforeEach } from "vitest";
import type { RoomMember, Room } from "@prisma/client";

// ── mock prisma ────────────────────────────────────────────────────────────────
// vi.hoisted() runs before module imports, ensuring the mock objects exist
// by the time vi.mock's factory is executed. This is required for ESM.

const { prismaMock, mockTx } = vi.hoisted(() => {
  const mockTx = {
    room: { create: vi.fn() },
    roomMember: { create: vi.fn() },
  };

  const prismaMock = {
    $transaction: vi.fn(),
    room: { findMany: vi.fn(), findUnique: vi.fn() },
    roomMember: { findMany: vi.fn() },
  };

  return { prismaMock, mockTx };
});

vi.mock("../../lib/prisma.js", () => ({
  prisma: prismaMock,
}));

// Import service AFTER vi.mock declaration so the module receives the mocked prisma.
import {
  createRoom,
  countVacancies,
  listRooms,
} from "./rooms.service.js";

// ── shared fixtures ────────────────────────────────────────────────────────────

const FUTURE_ISO = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 h from now
const PAST_ISO = new Date(Date.now() - 60 * 60 * 1000).toISOString();   // 1 h ago

const BASE_INPUT = {
  title: "Rachão do Zé",
  location: "Quadra Central",
  startsAt: FUTURE_ISO,
  lineSlots: 16,
  teamSize: 8,
  goalkeeperSlots: 2,
  requireApproval: true,
  playRole: "LINE" as const,
};

// Use `as unknown as Room` to avoid importing Prisma enums at test time.
// The shape is sufficient for mock purposes.
const FAKE_ROOM = {
  id: "room-1",
  title: BASE_INPUT.title,
  location: BASE_INPUT.location,
  startsAt: new Date(FUTURE_ISO),
  lineSlots: BASE_INPUT.lineSlots,
  teamSize: BASE_INPUT.teamSize,
  goalkeeperSlots: BASE_INPUT.goalkeeperSlots,
  requireApproval: BASE_INPUT.requireApproval,
  ownerId: "user-1",
  status: "OPEN",
  createdAt: new Date(),
} as unknown as Room;

// ── helpers ────────────────────────────────────────────────────────────────────

/** Configures $transaction to invoke the callback with mockTx and return its result. */
function setupTransaction() {
  prismaMock.$transaction.mockImplementation(
    async (cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx),
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Regra 2 — createRoom validations
// ══════════════════════════════════════════════════════════════════════════════

describe("createRoom — Regra 2 validations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test 1: startsAt in the past → INVALID_DATE
  it("throws INVALID_DATE (status 400) when startsAt is in the past", async () => {
    const input = { ...BASE_INPUT, startsAt: PAST_ISO };

    await expect(createRoom("user-1", input)).rejects.toMatchObject({
      code: "INVALID_DATE",
      status: 400,
    });

    // Transaction must NOT have been called
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  // Test 2: startsAt exactly now (same millisecond boundary) → INVALID_DATE
  // The service uses `<= new Date()`, so a timestamp captured at call time
  // may or may not be in the past by a millisecond. We use a timestamp 1 ms in
  // the past to deterministically trigger the boundary condition.
  it("throws INVALID_DATE when startsAt is at or before the current moment", async () => {
    const justPastIso = new Date(Date.now() - 1).toISOString();
    const input = { ...BASE_INPUT, startsAt: justPastIso };

    await expect(createRoom("user-1", input)).rejects.toMatchObject({
      code: "INVALID_DATE",
      status: 400,
    });

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  // Test 3: startsAt in the future → calls $transaction and returns room
  it("calls prisma.$transaction and returns the created room when startsAt is in the future", async () => {
    setupTransaction();
    mockTx.room.create.mockResolvedValue(FAKE_ROOM);
    mockTx.roomMember.create.mockResolvedValue({} as RoomMember);

    const result = await createRoom("user-1", BASE_INPUT);

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(result).toEqual(FAKE_ROOM);
  });

  // Test 3b: lineSlots < 2 → INVALID_LINE_SLOTS
  it("throws INVALID_LINE_SLOTS (status 400) when lineSlots is less than 2", async () => {
    const input = { ...BASE_INPUT, lineSlots: 1 };
    await expect(createRoom("user-1", input)).rejects.toMatchObject({
      code: "INVALID_LINE_SLOTS",
      status: 400,
    });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  // Test 3c: teamSize < 1 → INVALID_TEAM_SIZE
  it("throws INVALID_TEAM_SIZE (status 400) when teamSize is less than 1", async () => {
    const input = { ...BASE_INPUT, teamSize: 0 };
    await expect(createRoom("user-1", input)).rejects.toMatchObject({
      code: "INVALID_TEAM_SIZE",
      status: 400,
    });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  // Test 3d: goalkeeperSlots < 0 → INVALID_GOALKEEPER_SLOTS
  it("throws INVALID_GOALKEEPER_SLOTS (status 400) when goalkeeperSlots is negative", async () => {
    const input = { ...BASE_INPUT, goalkeeperSlots: -1 };
    await expect(createRoom("user-1", input)).rejects.toMatchObject({
      code: "INVALID_GOALKEEPER_SLOTS",
      status: 400,
    });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  // Test 4: valid input → transaction creates both Room and RoomMember
  it("creates both a Room and an ORGANIZER RoomMember inside the transaction", async () => {
    setupTransaction();
    mockTx.room.create.mockResolvedValue(FAKE_ROOM);
    mockTx.roomMember.create.mockResolvedValue({} as RoomMember);

    await createRoom("user-1", BASE_INPUT);

    expect(mockTx.room.create).toHaveBeenCalledTimes(1);
    expect(mockTx.roomMember.create).toHaveBeenCalledTimes(1);

    // Verify RoomMember is created with ORGANIZER role and CONFIRMED status
    expect(mockTx.roomMember.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          roomId: FAKE_ROOM.id,
          userId: "user-1",
          role: "ORGANIZER",
          status: "CONFIRMED",
          playRole: "LINE",
        }),
      }),
    );
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Regra 6 — vacancy counting
// ══════════════════════════════════════════════════════════════════════════════

describe("countVacancies — Regra 6", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test 5: 3 CONFIRMED LINE + 1 CONFIRMED GOALKEEPER
  it("returns confirmedLine=3 and confirmedGoalkeepers=1 for a room with those members", async () => {
    prismaMock.roomMember.findMany.mockResolvedValue([
      { playRole: "LINE" },
      { playRole: "LINE" },
      { playRole: "LINE" },
      { playRole: "GOALKEEPER" },
    ]);

    const result = await countVacancies("room-1");

    expect(result).toEqual({ confirmedLine: 3, confirmedGoalkeepers: 1 });
    // Verify the query only fetches CONFIRMED members
    expect(prismaMock.roomMember.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "CONFIRMED" }),
      }),
    );
  });

  // Test 6: PENDING, WAITLIST, REJECTED, LEFT do NOT count
  it("does NOT count PENDING, WAITLIST, REJECTED, or LEFT members (query filters only CONFIRMED)", async () => {
    // The service queries with WHERE status='CONFIRMED', so non-confirmed members
    // are absent from results. Returning [] simulates a room where everyone is
    // in a non-CONFIRMED status.
    prismaMock.roomMember.findMany.mockResolvedValue([]);

    const result = await countVacancies("room-1");

    expect(result).toEqual({ confirmedLine: 0, confirmedGoalkeepers: 0 });

    // The WHERE clause must include status: "CONFIRMED" — verify the filter is present
    const callArgs = prismaMock.roomMember.findMany.mock.calls[0]?.[0] as {
      where: { status: string };
    };
    expect(callArgs.where.status).toBe("CONFIRMED");
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Regra 6 — listRooms vacancy fields
// ══════════════════════════════════════════════════════════════════════════════

describe("listRooms — Regra 6 confirmedLine / confirmedGoalkeepers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test 7: listRooms counts only CONFIRMED members for vacancy fields
  it("returns correct confirmedLine and confirmedGoalkeepers by counting only CONFIRMED members", async () => {
    // The service filters WHERE status='CONFIRMED' in the Prisma include clause,
    // so the mock returns only confirmed members. The service then counts by playRole.
    const roomWithMembers = {
      ...FAKE_ROOM,
      members: [
        { playRole: "LINE",       userId: "user-1", role: "ORGANIZER",  status: "CONFIRMED" },
        { playRole: "LINE",       userId: "user-2", role: "PLAYER",     status: "CONFIRMED" },
        { playRole: "GOALKEEPER", userId: "user-3", role: "PLAYER",     status: "CONFIRMED" },
      ],
    };

    prismaMock.room.findMany.mockResolvedValue([roomWithMembers]);

    const result = await listRooms("user-1");

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      confirmedLine: 2,
      confirmedGoalkeepers: 1,
    });
  });

  it("returns confirmedLine=0 and confirmedGoalkeepers=0 when no CONFIRMED members exist", async () => {
    // The include query uses WHERE status='CONFIRMED', so non-confirmed members
    // are filtered at the DB level. Returning an empty members array simulates this.
    const roomWithNoConfirmed = {
      ...FAKE_ROOM,
      members: [],
    };

    prismaMock.room.findMany.mockResolvedValue([roomWithNoConfirmed]);

    const result = await listRooms("user-1");

    expect(result[0]).toMatchObject({
      confirmedLine: 0,
      confirmedGoalkeepers: 0,
    });
  });
});
