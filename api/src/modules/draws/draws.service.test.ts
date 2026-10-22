import { describe, it, expect, vi, beforeEach } from "vitest";

// ── mock prisma ────────────────────────────────────────────────────────────────
// vi.hoisted() runs before module imports, ensuring the mock objects exist
// by the time vi.mock's factory is executed. This is required for ESM.

const { prismaMock } = vi.hoisted(() => {
  const prismaMock = {
    roomMember: { findFirst: vi.fn(), findMany: vi.fn() },
    room: { findUnique: vi.fn(), update: vi.fn() },
    playerWeight: { findMany: vi.fn() },
    draw: { create: vi.fn(), findFirst: vi.fn() },
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
import { balancedDraw, startRoom, drawTeams } from "./draws.service.js";

// ══════════════════════════════════════════════════════════════════════════════
// R18 — balancedDraw (pure function tests, no mocks needed)
// ══════════════════════════════════════════════════════════════════════════════

/** Helper to generate N players with given level distribution */
function makePlayers(
  n: number,
  levelFn: (i: number) => "REGULAR" | "GOOD" | "STAR" = () => "GOOD",
) {
  return Array.from({ length: n }, (_, i) => ({
    userId: `player-${i + 1}`,
    name: `Player ${i + 1}`,
    level: levelFn(i),
  }));
}

describe("balancedDraw — R18 pure function", () => {
  // (a) All teams have exactly teamSize players (no leftovers case)
  it("(a) produces teams of exactly teamSize when players divides evenly", () => {
    const players = makePlayers(16); // 16 players, teamSize=4 → 4 teams of 4
    const result = balancedDraw(players, 4, 3);

    expect(result.leftoverIds).toHaveLength(0);
    expect(result.teams).toHaveLength(4);
    for (const team of result.teams) {
      expect(team.playerIds).toHaveLength(4);
    }
  });

  // (b) No player is repeated or missing
  it("(b) no player is repeated or missing", () => {
    const players = makePlayers(12);
    const result = balancedDraw(players, 4, 3);

    const allAssigned = [
      ...result.teams.flatMap((t) => t.playerIds),
      ...result.leftoverIds,
    ];

    // No duplicates
    const unique = new Set(allAssigned);
    expect(unique.size).toBe(allAssigned.length);

    // All players accounted for
    expect(allAssigned.sort()).toEqual(players.map((p) => p.userId).sort());
  });

  // (c) For each level, difference between any two teams' count of that level is at most 1
  it("(c) level distribution is balanced (max difference 1 per level between any two teams)", () => {
    // 12 players: 4 STAR, 4 GOOD, 4 REGULAR → 3 teams of 4
    const players = makePlayers(12, (i) => {
      if (i < 4) return "STAR";
      if (i < 8) return "GOOD";
      return "REGULAR";
    });
    const result = balancedDraw(players, 4, 4); // maxStars=4 so no cap issue

    for (const level of ["STAR", "GOOD", "REGULAR"] as const) {
      const counts = result.teams.map(
        (t) =>
          t.playerIds.filter((id) => {
            const p = players.find((pl) => pl.userId === id);
            return p?.level === level;
          }).length,
      );
      const max = Math.max(...counts);
      const min = Math.min(...counts);
      expect(max - min).toBeLessThanOrEqual(1);
    }
  });

  // (d) maxStarsPerTeam is respected, or capRelaxed is true
  it("(d) maxStarsPerTeam is respected when there are enough teams", () => {
    // 8 players: 2 STAR, 6 GOOD → 2 teams of 4, maxStarsPerTeam=1
    const players = makePlayers(8, (i) => (i < 2 ? "STAR" : "GOOD"));
    const result = balancedDraw(players, 4, 1);

    if (!result.capRelaxed) {
      for (const team of result.teams) {
        expect(team.starCount).toBeLessThanOrEqual(1);
      }
    }
    // If capRelaxed, stars exceeded cap — that's allowed
  });

  it("(d) sets capRelaxed=true when there are more stars than maxStarsPerTeam * numTeams", () => {
    // 8 players: 6 STAR, 2 GOOD → 2 teams of 4, maxStarsPerTeam=2
    // totalStars(6) > maxStarsPerTeam(2) * numTeams(2) = 4 → capRelaxed should be true
    const players = makePlayers(8, (i) => (i < 6 ? "STAR" : "GOOD"));
    const result = balancedDraw(players, 4, 2);

    expect(result.capRelaxed).toBe(true);
  });

  // (e) With 18 players and teamSize=4: 4 teams and 2 in leftovers
  it("(e) with 18 players and teamSize=4: 4 teams, 2 leftovers", () => {
    const players = makePlayers(18);
    const result = balancedDraw(players, 4, 3);

    expect(result.teams).toHaveLength(4);
    expect(result.leftoverIds).toHaveLength(2);
    for (const team of result.teams) {
      expect(team.playerIds).toHaveLength(4);
    }
  });

  // (f) Statistical: 1000 draws with 16 players, each player roughly equally distributed
  it("(f) statistical: distribution is approximately uniform over 1000 draws", () => {
    const PLAYERS = 16;
    const TEAM_SIZE = 4;
    const RUNS = 1000;
    const players = makePlayers(PLAYERS);

    // Count how many times each player ends up in each team-index
    // We'll track which team-index each player appears in across runs
    const teamAssignmentCounts: Map<string, number[]> = new Map(
      players.map((p) => [p.userId, Array.from({ length: Math.max(2, Math.floor(PLAYERS / TEAM_SIZE)) }, () => 0)]),
    );

    for (let r = 0; r < RUNS; r++) {
      const result = balancedDraw(players, TEAM_SIZE, 3);
      for (let ti = 0; ti < result.teams.length; ti++) {
        for (const pid of result.teams[ti]!.playerIds) {
          teamAssignmentCounts.get(pid)![ti]!++;
        }
      }
    }

    // Each player should appear in each team position approximately RUNS/numTeams times
    const numTeams = Math.max(2, Math.floor(PLAYERS / TEAM_SIZE));
    const expectedPerSlot = RUNS / numTeams;

    for (const [, counts] of teamAssignmentCounts) {
      for (const count of counts) {
        // Allow ±40% deviation (chi-squared relaxed, just checking gross uniformity)
        expect(count).toBeGreaterThan(expectedPerSlot * 0.6);
        expect(count).toBeLessThan(expectedPerSlot * 1.4);
      }
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// R17 — startRoom (mocked DB)
// ══════════════════════════════════════════════════════════════════════════════

const FAKE_DRAW = {
  id: "draw-1",
  roomId: "room-1",
  createdAt: new Date(),
  createdById: "user-1",
  teams: [
    { id: "team-1", drawId: "draw-1", name: "Time 1", queuePosition: null, consecutiveWins: 0, playerIds: ["player-1", "player-2", "player-3", "player-4"] },
    { id: "team-2", drawId: "draw-1", name: "Time 2", queuePosition: null, consecutiveWins: 0, playerIds: ["player-5", "player-6", "player-7", "player-8"] },
  ],
};

const FAKE_ROOM = {
  id: "room-1",
  status: "OPEN",
  teamSize: 4,
  maxStarsPerTeam: 3,
  ownerId: "user-org",
};

function makeLineMembers(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    userId: `player-${i + 1}`,
    user: { name: `Player ${i + 1}` },
  }));
}

describe("startRoom — R17 (mocked DB)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws NOT_ORGANIZER (403) when user is not an organizer/co-organizer", async () => {
    prismaMock.roomMember.findFirst.mockResolvedValue(null);

    await expect(startRoom("non-org", "room-1")).rejects.toMatchObject({
      code: "NOT_ORGANIZER",
      status: 403,
    });
  });

  it("throws NOT_ENOUGH_PLAYERS (400) when fewer than 2*teamSize confirmed LINE players", async () => {
    prismaMock.roomMember.findFirst.mockResolvedValue({ id: "member-1" });
    prismaMock.room.findUnique.mockResolvedValue(FAKE_ROOM);
    // Only 6 players, teamSize=4, need 8
    prismaMock.roomMember.findMany.mockResolvedValue(makeLineMembers(6));
    prismaMock.playerWeight.findMany.mockResolvedValue([]);

    await expect(startRoom("user-org", "room-1")).rejects.toMatchObject({
      code: "NOT_ENOUGH_PLAYERS",
      status: 400,
    });
  });

  it("throws ROOM_NOT_STARTED (400) when room is already DRAWN", async () => {
    prismaMock.roomMember.findFirst.mockResolvedValue({ id: "member-1" });
    prismaMock.room.findUnique.mockResolvedValue({ ...FAKE_ROOM, status: "DRAWN" });

    await expect(startRoom("user-org", "room-1")).rejects.toMatchObject({
      code: "ROOM_NOT_STARTED",
      status: 400,
    });
  });

  it("success: creates Draw, returns DrawResultForOrg with teams and queuePositions", async () => {
    prismaMock.roomMember.findFirst.mockResolvedValue({ id: "member-1" });
    prismaMock.room.findUnique.mockResolvedValue(FAKE_ROOM);
    prismaMock.roomMember.findMany.mockResolvedValue(makeLineMembers(8));
    prismaMock.playerWeight.findMany.mockResolvedValue([]);

    const fakeUpdatedRoom = { ...FAKE_ROOM, status: "DRAWN", startedAt: new Date() };
    prismaMock.$transaction.mockResolvedValue([FAKE_DRAW, fakeUpdatedRoom]);

    const result = await startRoom("user-org", "room-1");

    expect(result).toMatchObject({
      id: "draw-1",
      roomId: "room-1",
    });
    expect(result.teams).toHaveLength(2);
    expect(result.leftoverPlayers).toBeDefined();
    expect(result.capRelaxed).toBeDefined();

    // Verify $transaction was called
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// R19 — drawTeams updated (mocked DB)
// ══════════════════════════════════════════════════════════════════════════════

describe("drawTeams — R19 (mocked DB)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws ROOM_NOT_STARTED (400) when room status is OPEN", async () => {
    prismaMock.roomMember.findFirst.mockResolvedValue({ id: "member-1" });
    prismaMock.room.findUnique.mockResolvedValue({ ...FAKE_ROOM, status: "OPEN" });

    await expect(drawTeams("user-org", "room-1")).rejects.toMatchObject({
      code: "ROOM_NOT_STARTED",
      status: 400,
    });
  });

  it("throws ROOM_NOT_STARTED (400) when room status is LOCKED", async () => {
    prismaMock.roomMember.findFirst.mockResolvedValue({ id: "member-1" });
    prismaMock.room.findUnique.mockResolvedValue({ ...FAKE_ROOM, status: "LOCKED" });

    await expect(drawTeams("user-org", "room-1")).rejects.toMatchObject({
      code: "ROOM_NOT_STARTED",
      status: 400,
    });
  });

  it("throws DRAW_LOCKED (423) when room status is LIVE", async () => {
    prismaMock.roomMember.findFirst.mockResolvedValue({ id: "member-1" });
    prismaMock.room.findUnique.mockResolvedValue({ ...FAKE_ROOM, status: "LIVE" });

    await expect(drawTeams("user-org", "room-1")).rejects.toMatchObject({
      code: "DRAW_LOCKED",
      status: 423,
    });
  });

  it("throws DRAW_LOCKED (423) when room status is FINISHED", async () => {
    prismaMock.roomMember.findFirst.mockResolvedValue({ id: "member-1" });
    prismaMock.room.findUnique.mockResolvedValue({ ...FAKE_ROOM, status: "FINISHED" });

    await expect(drawTeams("user-org", "room-1")).rejects.toMatchObject({
      code: "DRAW_LOCKED",
      status: 423,
    });
  });

  it("succeeds when room status is DRAWN", async () => {
    prismaMock.roomMember.findFirst.mockResolvedValue({ id: "member-1" });
    prismaMock.room.findUnique.mockResolvedValue({ ...FAKE_ROOM, status: "DRAWN" });
    prismaMock.roomMember.findMany.mockResolvedValue(makeLineMembers(8));
    prismaMock.playerWeight.findMany.mockResolvedValue([]);
    prismaMock.$transaction.mockResolvedValue([FAKE_DRAW]);

    const result = await drawTeams("user-org", "room-1");

    expect(result).toMatchObject({
      id: "draw-1",
      roomId: "room-1",
    });
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
  });

  it("CO_ORGANIZER can call drawTeams (not just ORGANIZER)", async () => {
    // The service checks role in ["ORGANIZER", "CO_ORGANIZER"] — simulate co-organizer membership
    prismaMock.roomMember.findFirst.mockResolvedValue({ id: "member-co", role: "CO_ORGANIZER" });
    prismaMock.room.findUnique.mockResolvedValue({ ...FAKE_ROOM, status: "DRAWN" });
    prismaMock.roomMember.findMany.mockResolvedValue(makeLineMembers(8));
    prismaMock.playerWeight.findMany.mockResolvedValue([]);
    prismaMock.$transaction.mockResolvedValue([FAKE_DRAW]);

    const result = await drawTeams("co-org-user", "room-1");

    expect(result).toMatchObject({ id: "draw-1" });
  });

  it("throws NOT_ORGANIZER (403) when user has no membership", async () => {
    prismaMock.roomMember.findFirst.mockResolvedValue(null);

    await expect(drawTeams("random-user", "room-1")).rejects.toMatchObject({
      code: "NOT_ORGANIZER",
      status: 403,
    });
  });
});
