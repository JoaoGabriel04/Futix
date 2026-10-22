import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Room } from "@prisma/client";

// ── mock prisma ────────────────────────────────────────────────────────────────
// vi.hoisted() runs before module imports, ensuring the mock objects exist
// by the time vi.mock's factory is executed. This is required for ESM.

const { prismaMock } = vi.hoisted(() => {
  const prismaMock = {
    room: { create: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    roomMember: { findMany: vi.fn(), findFirst: vi.fn() },
    match: { findFirst: vi.fn(), findMany: vi.fn() },
    draw: { findFirst: vi.fn() },
    playerWeight: { findMany: vi.fn() },
    rotation: { findFirst: vi.fn() },
    user: { findMany: vi.fn() },
  };

  return { prismaMock };
});

vi.mock("../../lib/prisma.js", () => ({
  prisma: prismaMock,
}));

vi.mock("../../socket.js", () => ({
  getIo: () => ({ to: () => ({ emit: vi.fn() }) }),
}));

// Import service AFTER vi.mock declaration so the module receives the mocked prisma.
import {
  createRoom,
  countVacancies,
  listRooms,
  updateRoom,
  lockRoom,
  unlockRoom,
  cancelRoom,
  finishRoom,
  getRoomSummary,
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

    expect(prismaMock.room.create).not.toHaveBeenCalled();
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

    expect(prismaMock.room.create).not.toHaveBeenCalled();
  });

  // Test 3: startsAt in the future → calls room.create and returns room
  it("calls prisma.room.create with nested member and returns the room", async () => {
    prismaMock.room.create.mockResolvedValue(FAKE_ROOM);

    const result = await createRoom("user-1", BASE_INPUT);

    expect(prismaMock.room.create).toHaveBeenCalledTimes(1);
    expect(result).toEqual(FAKE_ROOM);
  });

  // Test 3b: lineSlots < 2 → INVALID_LINE_SLOTS
  it("throws INVALID_LINE_SLOTS (status 400) when lineSlots is less than 2", async () => {
    const input = { ...BASE_INPUT, lineSlots: 1 };
    await expect(createRoom("user-1", input)).rejects.toMatchObject({
      code: "INVALID_LINE_SLOTS",
      status: 400,
    });
    expect(prismaMock.room.create).not.toHaveBeenCalled();
  });

  // Test 3c: teamSize < 1 → INVALID_TEAM_SIZE
  it("throws INVALID_TEAM_SIZE (status 400) when teamSize is less than 1", async () => {
    const input = { ...BASE_INPUT, teamSize: 0 };
    await expect(createRoom("user-1", input)).rejects.toMatchObject({
      code: "INVALID_TEAM_SIZE",
      status: 400,
    });
    expect(prismaMock.room.create).not.toHaveBeenCalled();
  });

  // Test 3d: goalkeeperSlots < 0 → INVALID_GOALKEEPER_SLOTS
  it("throws INVALID_GOALKEEPER_SLOTS (status 400) when goalkeeperSlots is negative", async () => {
    const input = { ...BASE_INPUT, goalkeeperSlots: -1 };
    await expect(createRoom("user-1", input)).rejects.toMatchObject({
      code: "INVALID_GOALKEEPER_SLOTS",
      status: 400,
    });
    expect(prismaMock.room.create).not.toHaveBeenCalled();
  });

  // Test 4: valid input → room.create called with nested ORGANIZER RoomMember
  it("creates Room with nested ORGANIZER RoomMember in the correct shape", async () => {
    prismaMock.room.create.mockResolvedValue(FAKE_ROOM);

    await createRoom("user-1", BASE_INPUT);

    expect(prismaMock.room.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ownerId: "user-1",
          members: {
            create: expect.objectContaining({
              userId: "user-1",
              role: "ORGANIZER",
              status: "CONFIRMED",
              playRole: "LINE",
            }),
          },
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

// ══════════════════════════════════════════════════════════════════════════════
// Regra 11 — updateRoom validations
// ══════════════════════════════════════════════════════════════════════════════

describe("updateRoom — Regra 11 validations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws ROOM_NOT_OPEN when room status is not OPEN", async () => {
    const lockedRoom = {
      ...FAKE_ROOM,
      status: "LOCKED",
      members: [],
    };
    prismaMock.roomMember.findFirst.mockResolvedValue({ id: "member-1" });
    prismaMock.room.findUnique.mockResolvedValue(lockedRoom);

    await expect(updateRoom("user-1", "room-1", { title: "Novo título" })).rejects.toMatchObject({
      code: "ROOM_NOT_OPEN",
      status: 400,
    });

    expect(prismaMock.room.update).not.toHaveBeenCalled();
  });

  it("throws SLOTS_BELOW_CONFIRMED when lineSlots is below confirmed LINE players", async () => {
    const roomWithMembers = {
      ...FAKE_ROOM,
      status: "OPEN",
      members: [
        { playRole: "LINE" },
        { playRole: "LINE" },
        { playRole: "LINE" },
      ],
    };
    prismaMock.roomMember.findFirst.mockResolvedValue({ id: "member-1" });
    prismaMock.room.findUnique.mockResolvedValue(roomWithMembers);

    await expect(updateRoom("user-1", "room-1", { lineSlots: 2 })).rejects.toMatchObject({
      code: "SLOTS_BELOW_CONFIRMED",
      status: 400,
    });

    expect(prismaMock.room.update).not.toHaveBeenCalled();
  });

  it("throws SLOTS_BELOW_CONFIRMED when goalkeeperSlots is below confirmed GOALKEEPER players", async () => {
    const roomWithMembers = {
      ...FAKE_ROOM,
      status: "OPEN",
      members: [
        { playRole: "GOALKEEPER" },
        { playRole: "GOALKEEPER" },
      ],
    };
    prismaMock.roomMember.findFirst.mockResolvedValue({ id: "member-1" });
    prismaMock.room.findUnique.mockResolvedValue(roomWithMembers);

    await expect(updateRoom("user-1", "room-1", { goalkeeperSlots: 1 })).rejects.toMatchObject({
      code: "SLOTS_BELOW_CONFIRMED",
      status: 400,
    });

    expect(prismaMock.room.update).not.toHaveBeenCalled();
  });

  it("calls prisma.room.update when input is valid", async () => {
    const roomWithMembers = {
      ...FAKE_ROOM,
      status: "OPEN",
      members: [{ playRole: "LINE" }],
    };
    prismaMock.roomMember.findFirst.mockResolvedValue({ id: "member-1" });
    prismaMock.room.findUnique.mockResolvedValue(roomWithMembers);
    prismaMock.room.update.mockResolvedValue({ ...FAKE_ROOM, lineSlots: 20 });

    const result = await updateRoom("user-1", "room-1", { lineSlots: 20 });

    expect(prismaMock.room.update).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ lineSlots: 20 });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Regra 12 — lockRoom / unlockRoom
// ══════════════════════════════════════════════════════════════════════════════

describe("lockRoom — Regra 12", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws ROOM_NOT_OPEN when room status is not OPEN", async () => {
    prismaMock.room.findUnique.mockResolvedValue({ ...FAKE_ROOM, status: "LOCKED" });

    await expect(lockRoom("user-1", "room-1")).rejects.toMatchObject({
      code: "ROOM_NOT_OPEN",
      status: 400,
    });

    expect(prismaMock.room.update).not.toHaveBeenCalled();
  });

  it("updates status to LOCKED when room is OPEN", async () => {
    const lockedRoom = { ...FAKE_ROOM, status: "LOCKED" };
    prismaMock.room.findUnique.mockResolvedValue({ ...FAKE_ROOM, status: "OPEN" });
    prismaMock.room.update.mockResolvedValue(lockedRoom);

    const result = await lockRoom("user-1", "room-1");

    expect(prismaMock.room.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "LOCKED" } }),
    );
    expect(result).toMatchObject({ status: "LOCKED" });
  });
});

describe("unlockRoom — Regra 12", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws ROOM_NOT_LOCKED when room status is not LOCKED", async () => {
    prismaMock.room.findUnique.mockResolvedValue({ ...FAKE_ROOM, status: "OPEN" });

    await expect(unlockRoom("user-1", "room-1")).rejects.toMatchObject({
      code: "ROOM_NOT_LOCKED",
      status: 400,
    });

    expect(prismaMock.room.update).not.toHaveBeenCalled();
  });

  it("updates status to OPEN when room is LOCKED", async () => {
    const openRoom = { ...FAKE_ROOM, status: "OPEN" };
    prismaMock.room.findUnique.mockResolvedValue({ ...FAKE_ROOM, status: "LOCKED" });
    prismaMock.room.update.mockResolvedValue(openRoom);

    const result = await unlockRoom("user-1", "room-1");

    expect(prismaMock.room.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "OPEN" } }),
    );
    expect(result).toMatchObject({ status: "OPEN" });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Regra 15 — cancelRoom
// ══════════════════════════════════════════════════════════════════════════════

describe("cancelRoom — Regra 15", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws NOT_ORGANIZER (403) when user is not ORGANIZER", async () => {
    prismaMock.roomMember.findFirst.mockResolvedValue(null);

    await expect(cancelRoom("user-2", "room-1")).rejects.toMatchObject({
      code: "NOT_ORGANIZER",
      status: 403,
    });

    expect(prismaMock.room.update).not.toHaveBeenCalled();
  });

  it("throws INVALID_STATUS when room is already CANCELED", async () => {
    prismaMock.roomMember.findFirst.mockResolvedValue({ id: "member-1", role: "ORGANIZER" });
    prismaMock.room.findUnique.mockResolvedValue({ ...FAKE_ROOM, status: "CANCELED" });

    await expect(cancelRoom("user-1", "room-1")).rejects.toMatchObject({
      code: "INVALID_STATUS",
      status: 400,
    });

    expect(prismaMock.room.update).not.toHaveBeenCalled();
  });

  it("updates status to CANCELED when user is ORGANIZER and room is OPEN", async () => {
    const canceledRoom = { ...FAKE_ROOM, status: "CANCELED" };
    prismaMock.roomMember.findFirst.mockResolvedValue({ id: "member-1", role: "ORGANIZER" });
    prismaMock.room.findUnique.mockResolvedValue({ ...FAKE_ROOM, status: "OPEN" });
    prismaMock.room.update.mockResolvedValue(canceledRoom);

    const result = await cancelRoom("user-1", "room-1");

    expect(prismaMock.room.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "CANCELED" } }),
    );
    expect(result).toMatchObject({ status: "CANCELED" });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// R36 — finishRoom
// ══════════════════════════════════════════════════════════════════════════════

describe("finishRoom — R36", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test 1: NOT_ORGANIZER (403) when caller is not org/co-org
  it("throws NOT_ORGANIZER (403) when caller is not an organizer", async () => {
    prismaMock.roomMember.findFirst.mockResolvedValue(null);

    await expect(finishRoom("user-plain", "room-1")).rejects.toMatchObject({
      code: "NOT_ORGANIZER",
      status: 403,
    });

    expect(prismaMock.room.update).not.toHaveBeenCalled();
  });

  // Test 2: ROOM_NOT_STARTED (400) when room is OPEN
  it("throws ROOM_NOT_STARTED (400) when room is OPEN", async () => {
    prismaMock.roomMember.findFirst.mockResolvedValue({ id: "member-1", role: "ORGANIZER" });
    prismaMock.room.findUnique.mockResolvedValue({ ...FAKE_ROOM, status: "OPEN" });

    await expect(finishRoom("user-1", "room-1")).rejects.toMatchObject({
      code: "ROOM_NOT_STARTED",
      status: 400,
    });

    expect(prismaMock.room.update).not.toHaveBeenCalled();
  });

  // Test 3: MATCH_IN_PROGRESS (409) when a match is LIVE
  it("throws MATCH_IN_PROGRESS (409) when a LIVE match exists", async () => {
    prismaMock.roomMember.findFirst.mockResolvedValue({ id: "member-1", role: "ORGANIZER" });
    prismaMock.room.findUnique.mockResolvedValue({ ...FAKE_ROOM, status: "LIVE" });
    prismaMock.match.findFirst.mockResolvedValue({ id: "match-1" });

    await expect(finishRoom("user-1", "room-1")).rejects.toMatchObject({
      code: "MATCH_IN_PROGRESS",
      status: 409,
    });

    expect(prismaMock.room.update).not.toHaveBeenCalled();
  });

  // Test 4: succeeds — room becomes FINISHED, finishedAt set, room:finished emitted
  it("sets room status to FINISHED and finishedAt when valid", async () => {
    const emitMock = vi.fn();
    const ioToMock = vi.fn().mockReturnValue({ emit: emitMock });

    // vi.mock for socket is already applied; we need a spy. We'll check via
    // room.update args since socket mock returns a stable stub.
    prismaMock.roomMember.findFirst.mockResolvedValue({ id: "member-1", role: "ORGANIZER" });
    prismaMock.room.findUnique.mockResolvedValue({ ...FAKE_ROOM, status: "DRAWN" });
    prismaMock.match.findFirst.mockResolvedValue(null); // no active match
    prismaMock.room.update.mockResolvedValue({ ...FAKE_ROOM, status: "FINISHED", finishedAt: new Date() });

    await finishRoom("user-1", "room-1");

    expect(prismaMock.room.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "room-1" },
        data: expect.objectContaining({ status: "FINISHED" }),
      }),
    );

    const callData = prismaMock.room.update.mock.calls[0]?.[0] as { data: { finishedAt?: Date } };
    expect(callData.data.finishedAt).toBeInstanceOf(Date);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// R37 — getRoomSummary
// ══════════════════════════════════════════════════════════════════════════════

describe("getRoomSummary — R37", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test 5: ROOM_NOT_FINISHED (404) when room is not FINISHED
  it("throws ROOM_NOT_FINISHED (404) when room is not FINISHED", async () => {
    prismaMock.room.findUnique.mockResolvedValue({ ...FAKE_ROOM, status: "LIVE" });

    await expect(getRoomSummary("user-1", "room-1")).rejects.toMatchObject({
      code: "ROOM_NOT_FINISHED",
      status: 404,
    });
  });

  // Test 6: NOT_FOUND (404) when caller is not a confirmed member
  it("throws NOT_FOUND (404) when caller is not a confirmed member", async () => {
    prismaMock.room.findUnique.mockResolvedValue({ ...FAKE_ROOM, status: "FINISHED" });
    prismaMock.roomMember.findFirst.mockResolvedValue(null);

    await expect(getRoomSummary("user-stranger", "room-1")).rejects.toMatchObject({
      code: "NOT_FOUND",
      status: 404,
    });
  });

  // Test 7: returns correct summary
  it("returns correct summary: totalMatches, totalGoals, totalPlaySeconds, scorers (goals only, not own-goals), assists, matchesPlayed, matchList", async () => {
    prismaMock.room.findUnique.mockResolvedValue({ ...FAKE_ROOM, status: "FINISHED" });
    prismaMock.roomMember.findFirst.mockResolvedValue({ id: "member-1", role: "PLAYER" });

    const TEAM_A = "team-a";
    const TEAM_B = "team-b";
    const PLAYER_1 = "player-1";
    const PLAYER_2 = "player-2";
    const PLAYER_3 = "player-3";

    // Two finished matches
    prismaMock.match.findMany.mockResolvedValue([
      {
        id: "match-1",
        number: 1,
        teamAId: TEAM_A,
        teamBId: TEAM_B,
        teamAPlayerIds: [PLAYER_1, PLAYER_2],
        teamBPlayerIds: [PLAYER_3],
        scoreA: 2,
        scoreB: 1,
        elapsedSeconds: 300,
        status: "FINISHED",
        endReason: "GOALS",
        events: [
          // Regular goal by PLAYER_1, assisted by PLAYER_2
          { type: "GOAL", scorerId: PLAYER_1, assistId: PLAYER_2 },
          // Regular goal by PLAYER_1, no assist
          { type: "GOAL", scorerId: PLAYER_1, assistId: null },
          // Own goal: counts toward totalGoals but NOT toward scorers
          { type: "OWN_GOAL", scorerId: PLAYER_3, assistId: null },
        ],
      },
      {
        id: "match-2",
        number: 2,
        teamAId: TEAM_A,
        teamBId: TEAM_B,
        teamAPlayerIds: [PLAYER_1],
        teamBPlayerIds: [PLAYER_2, PLAYER_3],
        scoreA: 0,
        scoreB: 2,
        elapsedSeconds: 600,
        status: "FINISHED",
        endReason: "TIME",
        events: [
          // Goal by PLAYER_2
          { type: "GOAL", scorerId: PLAYER_2, assistId: null },
          // Goal by PLAYER_3, assisted by PLAYER_2
          { type: "GOAL", scorerId: PLAYER_3, assistId: PLAYER_2 },
        ],
      },
    ]);

    // Latest draw for team names
    prismaMock.draw.findFirst.mockResolvedValue({
      teams: [
        { id: TEAM_A, name: "Time A" },
        { id: TEAM_B, name: "Time B" },
      ],
    });

    // User names
    prismaMock.user.findMany.mockResolvedValue([
      { id: PLAYER_1, name: "Alice" },
      { id: PLAYER_2, name: "Bob" },
      { id: PLAYER_3, name: "Carlos" },
    ]);

    const result = await getRoomSummary("user-1", "room-1");

    // totalMatches
    expect(result.totalMatches).toBe(2);

    // totalGoals: all non-undone events (GOAL + OWN_GOAL) = 3 + 2 = 5
    expect(result.totalGoals).toBe(5);

    // totalPlaySeconds: sum of elapsedSeconds from FINISHED matches = 300 + 600 = 900
    expect(result.totalPlaySeconds).toBe(900);

    // scorers: GOAL events only (not OWN_GOAL)
    // PLAYER_1: 2 goals (match-1), PLAYER_2: 1 goal (match-2), PLAYER_3: 1 goal (match-2)
    expect(result.scorers).toEqual([
      { userId: PLAYER_1, name: "Alice", goals: 2 },
      { userId: PLAYER_2, name: "Bob", goals: 1 },
      { userId: PLAYER_3, name: "Carlos", goals: 1 },
    ]);

    // OWN_GOAL scorer (PLAYER_3 in match-1) must NOT appear in scorers list from that event
    const scorerIds = result.scorers.map((s) => s.userId);
    // PLAYER_3 appears in scorers because of match-2 GOAL, not match-1 OWN_GOAL
    // The OWN_GOAL in match-1 should not add to PLAYER_3's goal count beyond the GOAL in match-2
    expect(result.scorers.find((s) => s.userId === PLAYER_3)?.goals).toBe(1);

    // assists: PLAYER_2 assisted 2 times (match-1 and match-2)
    expect(result.assists).toEqual([
      { userId: PLAYER_2, name: "Bob", assists: 2 },
    ]);

    // matchesPlayed: based on snapshots
    // PLAYER_1: match-1 (teamA) + match-2 (teamA) = 2
    // PLAYER_2: match-1 (teamA) + match-2 (teamB) = 2
    // PLAYER_3: match-1 (teamB) + match-2 (teamB) = 2
    expect(result.matchesPlayed).toHaveLength(3);
    expect(result.matchesPlayed.every((p) => p.matches === 2)).toBe(true);

    // matchList
    expect(result.matchList).toEqual([
      { number: 1, scoreA: 2, scoreB: 1, teamAName: "Time A", teamBName: "Time B", endReason: "GOALS" },
      { number: 2, scoreA: 0, scoreB: 2, teamAName: "Time A", teamBName: "Time B", endReason: "TIME" },
    ]);
  });
});
