import { describe, it, expect, vi, beforeEach } from "vitest";

// ── mock prisma ────────────────────────────────────────────────────────────────
// vi.hoisted() runs before module imports, ensuring the mock objects exist
// by the time vi.mock's factory is executed. This is required for ESM.

const { prismaMock } = vi.hoisted(() => {
  const prismaMock = {
    roomMember: { findFirst: vi.fn(), findMany: vi.fn() },
    room: { findUnique: vi.fn(), update: vi.fn() },
    draw: { findFirst: vi.fn() },
    match: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    matchEvent: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    rotation: { create: vi.fn() },
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

// Import service AFTER vi.mock declarations so the module receives the mocked prisma.
import {
  startMatch,
  pauseMatch,
  resumeMatch,
  addGoal,
  undoLastGoal,
  endMatch,
} from "./matches.service.js";
import { GOALS_TO_WIN } from "@fut/shared";

// ── fixtures ───────────────────────────────────────────────────────────────────

const ROOM_ID = "room-1";
const MATCH_ID = "match-1";
const USER_ORG = "user-org";
const TEAM_A_ID = "team-a";
const TEAM_B_ID = "team-b";
const PLAYER_A1 = "player-a1";
const PLAYER_A2 = "player-a2";
const PLAYER_B1 = "player-b1";
const PLAYER_B2 = "player-b2";

const FAKE_ROOM_DRAWN = {
  id: ROOM_ID,
  status: "DRAWN" as const,
  matchMinutes: 10,
};

const FAKE_ROOM_LIVE = {
  id: ROOM_ID,
  status: "LIVE" as const,
  matchMinutes: 10,
};

const FAKE_DRAW = {
  id: "draw-1",
  roomId: ROOM_ID,
  createdAt: new Date(),
  teams: [
    { id: TEAM_A_ID, queuePosition: null, playerIds: [PLAYER_A1, PLAYER_A2] },
    { id: TEAM_B_ID, queuePosition: null, playerIds: [PLAYER_B1, PLAYER_B2] },
  ],
};

function makeMatch(overrides: Partial<{
  id: string;
  status: "LIVE" | "PAUSED" | "FINISHED";
  scoreA: number;
  scoreB: number;
  elapsedSeconds: number;
  startedAt: Date;
  endReason: "GOALS" | "TIME" | "MANUAL" | null;
  winnerTeamId: string | null;
  endedAt: Date | null;
}> = {}) {
  return {
    id: overrides.id ?? MATCH_ID,
    roomId: ROOM_ID,
    number: 1,
    teamAId: TEAM_A_ID,
    teamBId: TEAM_B_ID,
    teamAPlayerIds: [PLAYER_A1, PLAYER_A2],
    teamBPlayerIds: [PLAYER_B1, PLAYER_B2],
    limitSeconds: 600,
    status: overrides.status ?? "LIVE",
    startedAt: overrides.startedAt ?? new Date(Date.now() - 30_000),
    elapsedSeconds: overrides.elapsedSeconds ?? 0,
    scoreA: overrides.scoreA ?? 0,
    scoreB: overrides.scoreB ?? 0,
    winnerTeamId: overrides.winnerTeamId ?? null,
    endReason: overrides.endReason ?? null,
    endedAt: overrides.endedAt ?? null,
    createdById: USER_ORG,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// Tests
// ══════════════════════════════════════════════════════════════════════════════

describe("startMatch — R22", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test 1: NOT_ORGANIZER
  it("throws NOT_ORGANIZER (403) when caller is not org/co-org", async () => {
    prismaMock.roomMember.findFirst.mockResolvedValue(null);

    await expect(startMatch("non-org", ROOM_ID)).rejects.toMatchObject({
      code: "NOT_ORGANIZER",
      status: 403,
    });
  });

  // Test 2: ROOM_NOT_STARTED when room is OPEN
  it("throws ROOM_NOT_STARTED (400) when room is OPEN", async () => {
    prismaMock.roomMember.findFirst.mockResolvedValue({ id: "m-1" });
    prismaMock.room.findUnique.mockResolvedValue({ ...FAKE_ROOM_DRAWN, status: "OPEN" });

    await expect(startMatch(USER_ORG, ROOM_ID)).rejects.toMatchObject({
      code: "ROOM_NOT_STARTED",
      status: 400,
    });
  });

  // Test 3: MATCH_IN_PROGRESS when a match is already LIVE
  it("throws MATCH_IN_PROGRESS (409) when a match is already LIVE", async () => {
    prismaMock.roomMember.findFirst.mockResolvedValue({ id: "m-1" });
    prismaMock.room.findUnique.mockResolvedValue(FAKE_ROOM_LIVE);
    prismaMock.match.findFirst.mockResolvedValue({ id: "existing-match" });

    await expect(startMatch(USER_ORG, ROOM_ID)).rejects.toMatchObject({
      code: "MATCH_IN_PROGRESS",
      status: 409,
    });
  });

  // Test 4: succeeds for DRAWN room — creates Match, room becomes LIVE
  it("succeeds for room DRAWN — creates Match, room status becomes LIVE in transaction", async () => {
    prismaMock.roomMember.findFirst.mockResolvedValue({ id: "m-1" });
    prismaMock.room.findUnique.mockResolvedValue(FAKE_ROOM_DRAWN);
    prismaMock.match.findFirst.mockResolvedValue(null);
    prismaMock.draw.findFirst.mockResolvedValue(FAKE_DRAW);
    prismaMock.match.count.mockResolvedValue(0);

    const createdMatch = makeMatch({ status: "LIVE" });

    // Simulate $transaction: executes the callback and updates room
    prismaMock.$transaction.mockImplementation(async (cb: (tx: typeof prismaMock) => Promise<unknown>) => {
      const txMock = {
        ...prismaMock,
        match: { ...prismaMock.match, create: vi.fn().mockResolvedValue(createdMatch) },
        room: { ...prismaMock.room, update: vi.fn().mockResolvedValue({ ...FAKE_ROOM_DRAWN, status: "LIVE" }) },
      };
      return cb(txMock);
    });

    const result = await startMatch(USER_ORG, ROOM_ID);

    expect(result).toMatchObject({
      id: MATCH_ID,
      roomId: ROOM_ID,
      status: "LIVE",
      number: 1,
    });
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
  });

  // Test 5: succeeds for LIVE room (re-entry after match finished) — room stays LIVE
  it("succeeds for room LIVE (re-entry after match finished) — room stays LIVE", async () => {
    prismaMock.roomMember.findFirst.mockResolvedValue({ id: "m-1" });
    prismaMock.room.findUnique.mockResolvedValue(FAKE_ROOM_LIVE);
    prismaMock.match.findFirst.mockResolvedValue(null);
    prismaMock.draw.findFirst.mockResolvedValue(FAKE_DRAW);
    prismaMock.match.count.mockResolvedValue(2);

    const createdMatch = makeMatch({ status: "LIVE", id: "match-3" });

    prismaMock.$transaction.mockImplementation(async (cb: (tx: typeof prismaMock) => Promise<unknown>) => {
      const txMock = {
        ...prismaMock,
        match: { ...prismaMock.match, create: vi.fn().mockResolvedValue(createdMatch) },
        room: { ...prismaMock.room, update: vi.fn() },
      };
      const result = await cb(txMock);
      // Verify room.update was NOT called (room already LIVE)
      expect(txMock.room.update).not.toHaveBeenCalled();
      return result;
    });

    const result = await startMatch(USER_ORG, ROOM_ID);

    expect(result).toMatchObject({ status: "LIVE" });
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
  });
});

describe("addGoal — R24/R25", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test 6: MATCH_PAUSED
  it("throws MATCH_PAUSED (409) when match is paused", async () => {
    prismaMock.match.findUnique.mockResolvedValue(makeMatch({ status: "PAUSED" }));

    await expect(addGoal(USER_ORG, MATCH_ID, { teamId: TEAM_A_ID, scorerId: PLAYER_A1 }))
      .rejects.toMatchObject({ code: "MATCH_PAUSED", status: 409 });
  });

  // Test 7: MATCH_FINISHED
  it("throws MATCH_FINISHED (409) when match is already finished", async () => {
    prismaMock.match.findUnique.mockResolvedValue(makeMatch({ status: "FINISHED" }));

    await expect(addGoal(USER_ORG, MATCH_ID, { teamId: TEAM_A_ID, scorerId: PLAYER_A1 }))
      .rejects.toMatchObject({ code: "MATCH_FINISHED", status: 409 });
  });

  // Test 8: INVALID_SCORER
  it("throws INVALID_SCORER (422) when scorerId not in team's player ids", async () => {
    prismaMock.match.findUnique.mockResolvedValue(makeMatch({ status: "LIVE" }));
    prismaMock.roomMember.findFirst.mockResolvedValue({ id: "m-1" });

    await expect(
      addGoal(USER_ORG, MATCH_ID, { teamId: TEAM_A_ID, scorerId: "unknown-player" }),
    ).rejects.toMatchObject({ code: "INVALID_SCORER", status: 422 });
  });

  // Test 9: scores correctly and updates scoreA/scoreB
  it("scores correctly and updates scoreA/scoreB", async () => {
    prismaMock.match.findUnique.mockResolvedValue(makeMatch({ status: "LIVE", scoreA: 0, scoreB: 0 }));
    prismaMock.roomMember.findFirst.mockResolvedValue({ id: "m-1" });

    const updatedMatch = makeMatch({ status: "LIVE", scoreA: 1, scoreB: 0 });

    prismaMock.$transaction.mockImplementation(async (cb: (tx: typeof prismaMock) => Promise<unknown>) => {
      const txMock = {
        ...prismaMock,
        matchEvent: {
          ...prismaMock.matchEvent,
          create: vi.fn().mockResolvedValue({}),
          findMany: vi.fn().mockResolvedValue([
            { type: "GOAL", teamId: TEAM_A_ID },
          ]),
        },
        match: {
          ...prismaMock.match,
          update: vi.fn().mockResolvedValue(updatedMatch),
        },
      };
      return cb(txMock);
    });

    const result = await addGoal(USER_ORG, MATCH_ID, { teamId: TEAM_A_ID, scorerId: PLAYER_A1 });

    expect(result.scoreA).toBe(1);
    expect(result.scoreB).toBe(0);
    expect(result.status).toBe("LIVE");
  });

  // Test 10: when score reaches GOALS_TO_WIN (2), match is finished with endReason=GOALS
  it(`when score reaches GOALS_TO_WIN (${GOALS_TO_WIN}), match is finished with endReason=GOALS`, async () => {
    prismaMock.match.findUnique.mockResolvedValue(makeMatch({ status: "LIVE", scoreA: GOALS_TO_WIN - 1, scoreB: 0 }));
    prismaMock.roomMember.findFirst.mockResolvedValue({ id: "m-1" });
    prismaMock.rotation.create.mockResolvedValue({});

    const finishedMatch = makeMatch({
      status: "FINISHED",
      scoreA: GOALS_TO_WIN,
      scoreB: 0,
      endReason: "GOALS",
      winnerTeamId: TEAM_A_ID,
      endedAt: new Date(),
    });

    prismaMock.$transaction.mockImplementation(async (cb: (tx: typeof prismaMock) => Promise<unknown>) => {
      // Build the events list: GOALS_TO_WIN goals for team A
      const events = Array.from({ length: GOALS_TO_WIN }, () => ({ type: "GOAL", teamId: TEAM_A_ID }));
      const txMock = {
        ...prismaMock,
        matchEvent: {
          ...prismaMock.matchEvent,
          create: vi.fn().mockResolvedValue({}),
          findMany: vi.fn().mockResolvedValue(events),
        },
        match: {
          ...prismaMock.match,
          update: vi.fn().mockResolvedValue(finishedMatch),
        },
      };
      return cb(txMock);
    });

    const result = await addGoal(USER_ORG, MATCH_ID, { teamId: TEAM_A_ID, scorerId: PLAYER_A1 });

    expect(result.status).toBe("FINISHED");
    expect(result.endReason).toBe("GOALS");
    expect(result.winnerTeamId).toBe(TEAM_A_ID);
    expect(result.scoreA).toBe(GOALS_TO_WIN);
  });

  // Test 11: Concurrency test — second addGoal on an already-FINISHED match is rejected
  it("(concurrency) second addGoal after match reaches GOALS_TO_WIN throws MATCH_FINISHED (409)", async () => {
    // First call: match is LIVE with score 1-0, adding a goal finishes it
    prismaMock.match.findUnique.mockResolvedValueOnce(
      makeMatch({ status: "LIVE", scoreA: 1, scoreB: 0 }),
    );
    prismaMock.roomMember.findFirst.mockResolvedValue({ id: "m-1" });
    prismaMock.$transaction.mockResolvedValueOnce(
      makeMatch({ status: "FINISHED", scoreA: 2, scoreB: 0, endReason: "GOALS", winnerTeamId: TEAM_A_ID, endedAt: new Date() }),
    );
    prismaMock.rotation.create.mockResolvedValue({});
    await addGoal(USER_ORG, MATCH_ID, { teamId: TEAM_A_ID, scorerId: PLAYER_A1 });

    // Second call: match is now FINISHED — should throw
    prismaMock.match.findUnique.mockResolvedValueOnce(
      makeMatch({ status: "FINISHED", scoreA: 2, scoreB: 0, endReason: "GOALS", winnerTeamId: TEAM_A_ID, endedAt: new Date() }),
    );
    await expect(
      addGoal(USER_ORG, MATCH_ID, { teamId: TEAM_A_ID, scorerId: PLAYER_A1 }),
    ).rejects.toMatchObject({ code: "MATCH_FINISHED", status: 409 });
  });
});

describe("undoLastGoal — R31", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test 12: marks most recent event as undone and decrements score
  it("marks most recent event as undone and decrements score", async () => {
    prismaMock.match.findUnique.mockResolvedValue(makeMatch({ status: "LIVE", scoreA: 1, scoreB: 0 }));
    prismaMock.roomMember.findFirst.mockResolvedValue({ id: "m-1" });

    const updatedMatch = makeMatch({ status: "LIVE", scoreA: 0, scoreB: 0 });

    prismaMock.$transaction.mockImplementation(async (cb: (tx: typeof prismaMock) => Promise<unknown>) => {
      const txMock = {
        ...prismaMock,
        matchEvent: {
          ...prismaMock.matchEvent,
          findFirst: vi.fn().mockResolvedValue({ id: "event-1" }),
          update: vi.fn().mockResolvedValue({}),
          findMany: vi.fn().mockResolvedValue([]), // after undo, no active events
        },
        match: {
          ...prismaMock.match,
          update: vi.fn().mockResolvedValue(updatedMatch),
        },
      };
      return cb(txMock);
    });

    const result = await undoLastGoal(USER_ORG, MATCH_ID);

    expect(result.scoreA).toBe(0);
    expect(result.scoreB).toBe(0);
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
  });

  // Test 13: throws MATCH_FINISHED (409) on a finished match
  it("throws MATCH_FINISHED (409) on a finished match", async () => {
    prismaMock.match.findUnique.mockResolvedValue(makeMatch({ status: "FINISHED" }));

    await expect(undoLastGoal(USER_ORG, MATCH_ID)).rejects.toMatchObject({
      code: "MATCH_FINISHED",
      status: 409,
    });
  });
});

describe("pauseMatch — R30", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test 14: transitions LIVE → PAUSED and accumulates elapsedSeconds
  it("transitions LIVE → PAUSED and accumulates elapsedSeconds", async () => {
    const startedAt = new Date(Date.now() - 60_000); // 60 seconds ago
    prismaMock.match.findUnique.mockResolvedValue(
      makeMatch({ status: "LIVE", startedAt, elapsedSeconds: 30 }),
    );
    prismaMock.roomMember.findFirst.mockResolvedValue({ id: "m-1" });

    const updatedMatch = makeMatch({ status: "PAUSED", elapsedSeconds: 90 }); // 30 + 60

    let capturedData: { status: string; elapsedSeconds: number } | undefined;
    prismaMock.$transaction.mockImplementation(async (cb: (tx: typeof prismaMock) => Promise<unknown>) => {
      const txMock = {
        ...prismaMock,
        match: {
          ...prismaMock.match,
          update: vi.fn().mockImplementation(({ data }: { data: { status: string; elapsedSeconds: number } }) => {
            capturedData = data;
            return Promise.resolve(updatedMatch);
          }),
        },
      };
      return cb(txMock);
    });

    const result = await pauseMatch(USER_ORG, MATCH_ID);

    expect(result.status).toBe("PAUSED");
    expect(result.elapsedSeconds).toBeGreaterThanOrEqual(80); // at least 30 + ~60s
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(capturedData?.status).toBe("PAUSED");
    expect(capturedData?.elapsedSeconds).toBeGreaterThanOrEqual(80);
  });
});

describe("resumeMatch — R30", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test 15: transitions PAUSED → LIVE and resets startedAt
  it("transitions PAUSED → LIVE and resets startedAt", async () => {
    const oldStartedAt = new Date(Date.now() - 120_000);
    prismaMock.match.findUnique.mockResolvedValue(
      makeMatch({ status: "PAUSED", startedAt: oldStartedAt, elapsedSeconds: 120 }),
    );
    prismaMock.roomMember.findFirst.mockResolvedValue({ id: "m-1" });

    const updatedMatch = makeMatch({ status: "LIVE", startedAt: new Date(), elapsedSeconds: 120 });

    let capturedData: { status: string; startedAt: Date } | undefined;
    prismaMock.$transaction.mockImplementation(async (cb: (tx: typeof prismaMock) => Promise<unknown>) => {
      const txMock = {
        ...prismaMock,
        match: {
          ...prismaMock.match,
          update: vi.fn().mockImplementation(({ data }: { data: { status: string; startedAt: Date } }) => {
            capturedData = data;
            return Promise.resolve(updatedMatch);
          }),
        },
      };
      return cb(txMock);
    });

    const result = await resumeMatch(USER_ORG, MATCH_ID);

    expect(result.status).toBe("LIVE");
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(capturedData?.status).toBe("LIVE");
    // New startedAt should be recent (within 1 second of now)
    expect(Math.abs((capturedData?.startedAt?.getTime() ?? 0) - Date.now())).toBeLessThan(1000);
  });
});

describe("endMatch — R29", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test 16: finishes match with MANUAL reason and correct winner
  it("finishes match with MANUAL reason and correct winner", async () => {
    prismaMock.match.findUnique.mockResolvedValue(
      makeMatch({ status: "LIVE", scoreA: 1, scoreB: 0 }),
    );
    prismaMock.roomMember.findFirst.mockResolvedValue({ id: "m-1" });

    const finishedMatch = makeMatch({
      status: "FINISHED",
      scoreA: 1,
      scoreB: 0,
      endReason: "MANUAL",
      winnerTeamId: TEAM_A_ID,
      endedAt: new Date(),
    });

    let capturedData: { status: string; endReason: string; winnerTeamId: string | null } | undefined;
    prismaMock.$transaction.mockImplementation(async (cb: (tx: typeof prismaMock) => Promise<unknown>) => {
      const txMock = {
        ...prismaMock,
        match: {
          ...prismaMock.match,
          update: vi.fn().mockImplementation(({ data }: { data: { status: string; endReason: string; winnerTeamId: string | null } }) => {
            capturedData = data;
            return Promise.resolve(finishedMatch);
          }),
        },
        rotation: {
          ...prismaMock.rotation,
          create: vi.fn().mockResolvedValue({}),
        },
      };
      return cb(txMock);
    });

    const result = await endMatch(USER_ORG, MATCH_ID);

    expect(result.status).toBe("FINISHED");
    expect(result.endReason).toBe("MANUAL");
    expect(result.winnerTeamId).toBe(TEAM_A_ID);
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(capturedData?.status).toBe("FINISHED");
    expect(capturedData?.endReason).toBe("MANUAL");
    expect(capturedData?.winnerTeamId).toBe(TEAM_A_ID);
  });

  it("throws MATCH_FINISHED (409) when match is already finished", async () => {
    prismaMock.match.findUnique.mockResolvedValue(makeMatch({ status: "FINISHED" }));

    await expect(endMatch(USER_ORG, MATCH_ID)).rejects.toMatchObject({
      code: "MATCH_FINISHED",
      status: 409,
    });
  });
});
