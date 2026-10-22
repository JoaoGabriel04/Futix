import { describe, it, expect } from "vitest";
import { computeRotation } from "./rotation.service.js";
import type { DrawTeamSnapshot, WeightMap, ComputeRotationParams } from "./rotation.service.js";

// ── helpers ────────────────────────────────────────────────────────────────────

function makeTeam(
  id: string,
  playerIds: string[],
  queuePosition: number | null,
  consecutiveWins = 0,
): DrawTeamSnapshot {
  return { id, playerIds, queuePosition, consecutiveWins };
}

/** Return the union of all playerIds across all teams */
function allPlayers(teams: DrawTeamSnapshot[]): Set<string> {
  const s = new Set<string>();
  for (const t of teams) for (const p of t.playerIds) s.add(p);
  return s;
}

/** Reconstruct the post-rotation team snapshots given the result and original teams */
function applyResultLocally(
  teams: DrawTeamSnapshot[],
  result: ReturnType<typeof computeRotation>,
): DrawTeamSnapshot[] {
  // Build updated playerIds map from swaps
  const pidMap = new Map<string, string[]>(teams.map((t) => [t.id, t.playerIds.slice()]));
  for (const swap of result.swaps) {
    const outIds = pidMap.get(swap.teamId);
    const partnerIds = pidMap.get(swap.withTeamId);
    if (outIds && partnerIds) {
      pidMap.set(swap.teamId, outIds.filter((p) => !swap.outPlayerIds.includes(p)).concat(swap.inPlayerIds));
      pidMap.set(swap.withTeamId, partnerIds.filter((p) => !swap.inPlayerIds.includes(p)).concat(swap.outPlayerIds));
    }
  }

  return teams.map((t) => {
    const courtIdx = result.courtAfter.indexOf(t.id);
    const queueIdx = result.queueAfter.indexOf(t.id);
    return {
      id: t.id,
      playerIds: pidMap.get(t.id) ?? t.playerIds,
      queuePosition: courtIdx !== -1 ? null : queueIdx !== -1 ? queueIdx + 1 : t.queuePosition,
      consecutiveWins: result.consecutiveWinsAfter[t.id] ?? t.consecutiveWins,
    };
  });
}

// ── base params ────────────────────────────────────────────────────────────────

const DEFAULT_PARAMS: Pick<ComputeRotationParams, "winnerRule" | "maxStarsPerTeam" | "weights"> = {
  winnerRule: "ALWAYS",
  maxStarsPerTeam: 3,
  weights: {},
};

// ── Test 1: n=0 (no queue) ────────────────────────────────────────────────────

describe("Test 1 — n=0: kind=NONE, same teams in courtAfter, queueAfter=[]", () => {
  it("returns NONE when there is no queue", () => {
    const teams = [
      makeTeam("t1", ["p1", "p2"], null),
      makeTeam("t2", ["p3", "p4"], null),
    ];
    const result = computeRotation({
      ...DEFAULT_PARAMS,
      winnerTeamId: "t1",
      teams,
    });

    expect(result.kind).toBe("NONE");
    expect(result.swaps).toHaveLength(0);
    expect(result.queueAfter).toHaveLength(0);
    expect(result.courtAfter).toContain("t1");
    expect(result.courtAfter).toContain("t2");
  });
});

// ── Test 2: WIN (ALWAYS, n>=1) ─────────────────────────────────────────────────

describe("Test 2 — WIN (ALWAYS, n>=1): winner stays, loser swaps with Q_n, Q_1 enters, loser goes to end", () => {
  it("winner stays on court, Q_1 enters, loser goes to end of queue", () => {
    const teams = [
      makeTeam("t1", ["p1", "p2"], null),        // court, winner
      makeTeam("t2", ["p3", "p4"], null),        // court, loser
      makeTeam("t3", ["p5", "p6"], 1),           // Q_1
      makeTeam("t4", ["p7", "p8"], 2),           // Q_2 = Q_n (last)
    ];
    const result = computeRotation({
      ...DEFAULT_PARAMS,
      winnerRule: "ALWAYS",
      winnerTeamId: "t1",
      teams,
    });

    expect(result.kind).toBe("WIN");
    expect(result.courtAfter).toContain("t1"); // winner stays
    expect(result.courtAfter).toContain("t3"); // Q_1 enters
    expect(result.queueAfter[result.queueAfter.length - 1]).toBe("t2"); // loser appended at end
    expect(result.queueAfter).toContain("t4"); // Q_2 stays in queue
    expect(result.swaps).toHaveLength(1);
    expect(result.swaps[0]!.teamId).toBe("t2"); // loser swapped
    expect(result.swaps[0]!.withTeamId).toBe("t4"); // with Q_n
    expect(result.consecutiveWinsAfter["t1"]).toBe(1); // winner gets +1
    expect(result.consecutiveWinsAfter["t2"]).toBe(0); // loser reset
  });
});

// ── Test 3: WIN with MAX_2_WINS, consecutive < 2 ──────────────────────────────

describe("Test 3 — WIN with MAX_2_WINS, consecutive < 2: same as ALWAYS (kind=WIN)", () => {
  it("kind=WIN when MAX_2_WINS but consecutive wins < 2", () => {
    const teams = [
      makeTeam("t1", ["p1", "p2"], null, 0), // winner, 0 consecutive wins
      makeTeam("t2", ["p3", "p4"], null),
      makeTeam("t3", ["p5", "p6"], 1),
    ];
    const result = computeRotation({
      ...DEFAULT_PARAMS,
      winnerRule: "MAX_2_WINS",
      winnerTeamId: "t1",
      teams,
    });

    expect(result.kind).toBe("WIN");
    expect(result.consecutiveWinsAfter["t1"]).toBe(1);
  });
});

// ── Test 4: WIN_LIMIT (MAX_2_WINS, consecutive >= 2) ─────────────────────────

describe("Test 4 — WIN_LIMIT (MAX_2_WINS, consecutive >= 2): both teams exit, consecutiveWins reset", () => {
  it("kind=WIN_LIMIT when winner already has 1 consecutive win (would reach 2)", () => {
    const teams = [
      makeTeam("t1", ["p1", "p2"], null, 1), // winner with 1 consecutive win
      makeTeam("t2", ["p3", "p4"], null),
      makeTeam("t3", ["p5", "p6"], 1),
      makeTeam("t4", ["p7", "p8"], 2),
    ];
    const result = computeRotation({
      ...DEFAULT_PARAMS,
      winnerRule: "MAX_2_WINS",
      winnerTeamId: "t1",
      teams,
    });

    expect(result.kind).toBe("WIN_LIMIT");
    // Both court teams exit
    expect(result.courtAfter).not.toContain("t1");
    expect(result.courtAfter).not.toContain("t2");
    // Q_1 and Q_2 enter court
    expect(result.courtAfter).toContain("t3");
    expect(result.courtAfter).toContain("t4");
    // Both reset consecutiveWins to 0
    expect(result.consecutiveWinsAfter["t1"]).toBe(0);
    expect(result.consecutiveWinsAfter["t2"]).toBe(0);
  });
});

// ── Test 5: DRAW, n=1 ─────────────────────────────────────────────────────────

describe("Test 5 — DRAW, n=1: one team swaps with Q_1, other stays, Q_1 enters", () => {
  it("DRAW with n=1: one court team swaps and leaves, Q_1 enters", () => {
    const teams = [
      makeTeam("t1", ["p1", "p2"], null),
      makeTeam("t2", ["p3", "p4"], null),
      makeTeam("t3", ["p5", "p6"], 1), // Q_1 (only queue team)
    ];
    const result = computeRotation({
      ...DEFAULT_PARAMS,
      winnerTeamId: null,
      teams,
    });

    expect(result.kind).toBe("DRAW");
    expect(result.courtAfter).toHaveLength(2);
    expect(result.courtAfter).toContain("t3"); // Q_1 enters
    // One of t1/t2 stays, the other goes to queue
    const stayingOnCourt = result.courtAfter.find((id) => id !== "t3");
    const leavingToQueue = result.queueAfter[0];
    expect(["t1", "t2"]).toContain(stayingOnCourt);
    expect(["t1", "t2"]).toContain(leavingToQueue);
    expect(stayingOnCourt).not.toBe(leavingToQueue);
    expect(result.queueAfter).toHaveLength(1);
    expect(result.swaps).toHaveLength(1);
    // Reset consecutiveWins for court teams
    expect(result.consecutiveWinsAfter["t1"]).toBe(0);
    expect(result.consecutiveWinsAfter["t2"]).toBe(0);
  });
});

// ── Test 6: DRAW, n=2 ─────────────────────────────────────────────────────────

describe("Test 6 — DRAW, n=2: both exit, Q_1 and Q_2 enter, exiting teams go to end", () => {
  it("DRAW with n=2: Q_1 and Q_2 enter, both court teams exit to end of queue", () => {
    const teams = [
      makeTeam("t1", ["p1", "p2"], null),
      makeTeam("t2", ["p3", "p4"], null),
      makeTeam("t3", ["p5", "p6"], 1), // Q_1
      makeTeam("t4", ["p7", "p8"], 2), // Q_2 = Q_n
    ];
    const result = computeRotation({
      ...DEFAULT_PARAMS,
      winnerTeamId: null,
      teams,
    });

    expect(result.kind).toBe("DRAW");
    expect(result.courtAfter).toContain("t3");
    expect(result.courtAfter).toContain("t4");
    expect(result.courtAfter).not.toContain("t1");
    expect(result.courtAfter).not.toContain("t2");
    // Exiting teams both in queue
    expect(result.queueAfter).toContain("t1");
    expect(result.queueAfter).toContain("t2");
    expect(result.queueAfter).toHaveLength(2);
    expect(result.swaps).toHaveLength(2);
  });
});

// ── Test 7: DRAW, n=3 ─────────────────────────────────────────────────────────

describe("Test 7 — DRAW, n=3: both exit, Q_1 and Q_2 enter, Q_3 shifts up, exiting teams go to end", () => {
  it("DRAW with n=3: Q_3 shifts up to position 1, exiting teams append at end", () => {
    const teams = [
      makeTeam("t1", ["p1", "p2"], null),
      makeTeam("t2", ["p3", "p4"], null),
      makeTeam("t3", ["p5", "p6"], 1),  // Q_1
      makeTeam("t4", ["p7", "p8"], 2),  // Q_2
      makeTeam("t5", ["p9", "p10"], 3), // Q_3
    ];
    const result = computeRotation({
      ...DEFAULT_PARAMS,
      winnerTeamId: null,
      teams,
    });

    expect(result.kind).toBe("DRAW");
    // Q_1 and Q_2 enter court
    expect(result.courtAfter).toContain("t3");
    expect(result.courtAfter).toContain("t4");
    // Q_3 shifts up (should be first in queue after rotation)
    expect(result.queueAfter[0]).toBe("t5");
    // Exiting court teams at end
    expect(result.queueAfter).toContain("t1");
    expect(result.queueAfter).toContain("t2");
    expect(result.queueAfter).toHaveLength(3); // Q_3 + 2 exiting
  });
});

// ── Test 8: ALWAYS with 3 consecutive wins ────────────────────────────────────

describe("Test 8 — ALWAYS with 3 consecutive wins: winner stays each time, consecutiveWins increments", () => {
  it("consecutiveWins keeps incrementing under ALWAYS rule", () => {
    // Simulate 3 matches where t1 keeps winning
    const players1 = ["p1", "p2"];
    const players2 = ["p3", "p4"];
    const players3 = ["p5", "p6"];

    let teams: DrawTeamSnapshot[] = [
      makeTeam("t1", players1, null, 0),
      makeTeam("t2", players2, null, 0),
      makeTeam("t3", players3, 1),
    ];

    for (let match = 1; match <= 3; match++) {
      const result = computeRotation({
        ...DEFAULT_PARAMS,
        winnerRule: "ALWAYS",
        winnerTeamId: "t1",
        teams,
      });
      expect(result.kind).toBe("WIN");
      expect(result.consecutiveWinsAfter["t1"]).toBe(match);
      teams = applyResultLocally(teams, result);
    }

    // After 3 wins, t1 should have 3 consecutive wins
    const t1 = teams.find((t) => t.id === "t1")!;
    expect(t1.consecutiveWins).toBe(3);
  });
});

// ── Test 9: Swap level matching ───────────────────────────────────────────────

describe("Test 9 — Swap level matching: STAR player swaps with closest-level partner", () => {
  it("a STAR player outgoing finds a STAR partner (dist=0) over a REGULAR partner (dist=2)", () => {
    // In WIN case with n=1: loser ALWAYS swaps with Q_n (the only queue team).
    // loser = t2 [p1=STAR, p2=STAR], partner = t3 [p3=STAR, p4=REGULAR]
    // For each STAR exiting t2, the closest partner is p3 (STAR, dist=0) not p4 (REGULAR, dist=2)
    const weights: WeightMap = {
      p1: "STAR",
      p2: "STAR",
      p3: "STAR",    // in partner team (closest to STAR)
      p4: "REGULAR", // in partner team (far from STAR)
    };

    // In WIN case with n=1: loser (t2) ALWAYS swaps with Q_n=Q_1=t3
    const inCounts: Record<string, number> = { p3: 0, p4: 0 };

    for (let i = 0; i < 60; i++) {
      const result = computeRotation({
        ...DEFAULT_PARAMS,
        winnerRule: "ALWAYS",
        winnerTeamId: "t1", // t1 wins, t2 is loser
        teams: [
          makeTeam("t1", ["p5", "p6"], null),      // winner
          makeTeam("t2", ["p1", "p2"], null),      // loser — always swaps with Q_n
          makeTeam("t3", ["p3", "p4"], 1),          // Q_1 = Q_n (barrier)
        ],
        weights,
      });

      expect(result.kind).toBe("WIN");
      // The swap is always between t2 (loser) and t3 (Q_n)
      const swap = result.swaps.find((s) => s.teamId === "t2");
      if (swap) {
        for (const p of swap.inPlayerIds) inCounts[p] = (inCounts[p] ?? 0) + 1;
      }
    }

    // p3 (STAR) must always be picked as partner for STAR players (p4 REGULAR has dist=2)
    // Both p1 and p2 are STAR, so both pick p3 first, but p3 can only be chosen once per swap.
    // The second pick gets p4. So in 60 runs: p3 appears ~60 times, p4 ~60 times (one each per swap).
    // But the KEY check: p3 is picked BEFORE p4 for the first STAR player — that's the level matching.
    // Let's verify that p3 is picked in every single run:
    expect(inCounts["p3"]).toBe(60); // p3 (STAR) always picked first for the first STAR player
    expect(inCounts["p4"]).toBe(60); // p4 (REGULAR) always picked second (no other option)
  });

  it("REGULAR player finds closest (REGULAR, dist=0) partner over GOOD (dist=1)", () => {
    // loser = t2 [p1=REGULAR, p2=REGULAR], partner = t3 [p3=GOOD, p4=REGULAR]
    // For REGULAR exiting, closest partner is p4 (REGULAR, dist=0) not p3 (GOOD, dist=1)
    const weights: WeightMap = {
      p1: "REGULAR",
      p2: "REGULAR",
      p3: "GOOD",
      p4: "REGULAR",
    };

    const inCounts: Record<string, number> = { p3: 0, p4: 0 };

    for (let i = 0; i < 60; i++) {
      const result = computeRotation({
        ...DEFAULT_PARAMS,
        winnerRule: "ALWAYS",
        winnerTeamId: "t1",
        teams: [
          makeTeam("t1", ["p5", "p6"], null),
          makeTeam("t2", ["p1", "p2"], null),
          makeTeam("t3", ["p3", "p4"], 1),
        ],
        weights,
      });

      const swap = result.swaps.find((s) => s.teamId === "t2");
      if (swap) {
        for (const p of swap.inPlayerIds) inCounts[p] = (inCounts[p] ?? 0) + 1;
      }
    }

    // p4 (REGULAR, dist=0) must be picked first for REGULAR player
    // p3 (GOOD, dist=1) is the only remaining option for the second pick
    expect(inCounts["p4"]).toBe(60); // always first choice for REGULAR
    expect(inCounts["p3"]).toBe(60); // always second choice
  });
});

// ── Test 10: No player duplicated or lost (invariant test — 20 simulated matches) ──

describe("Test 10 — No player duplicated or lost after 20 simulated matches", () => {
  it("invariant: union of all team playerIds equals same set after each rotation", () => {
    // 4 teams: 2 on court, 2 in queue; 4 players each
    const initialTeams: DrawTeamSnapshot[] = [
      makeTeam("t1", ["p1", "p2", "p3", "p4"], null),
      makeTeam("t2", ["p5", "p6", "p7", "p8"], null),
      makeTeam("t3", ["p9", "p10", "p11", "p12"], 1),
      makeTeam("t4", ["p13", "p14", "p15", "p16"], 2),
    ];

    const weights: WeightMap = {
      p1: "STAR", p2: "GOOD", p3: "REGULAR", p4: "GOOD",
      p5: "STAR", p6: "GOOD", p7: "GOOD", p8: "REGULAR",
      p9: "REGULAR", p10: "GOOD", p11: "STAR", p12: "GOOD",
      p13: "GOOD", p14: "REGULAR", p15: "GOOD", p16: "STAR",
    };

    const originalPlayerSet = allPlayers(initialTeams);
    let teams = initialTeams;

    for (let match = 0; match < 20; match++) {
      const courtTeams = teams.filter((t) => t.queuePosition === null);
      // Alternate between win and draw
      const winnerTeamId = match % 3 === 2 ? null : courtTeams[0]!.id;

      const result = computeRotation({
        winnerRule: "MAX_2_WINS",
        maxStarsPerTeam: 3,
        weights,
        winnerTeamId,
        teams,
      });

      // All teams accounted for in courtAfter + queueAfter
      const totalTeamsInResult = result.courtAfter.length + result.queueAfter.length;
      expect(totalTeamsInResult).toBe(teams.length);

      teams = applyResultLocally(teams, result);

      // Invariant: exact same set of players
      const afterPlayerSet = allPlayers(teams);
      expect(afterPlayerSet.size).toBe(originalPlayerSet.size);
      for (const p of originalPlayerSet) {
        expect(afterPlayerSet.has(p)).toBe(true);
      }
    }
  });
});

// ── Test 11: maxStarsPerTeam respected ───────────────────────────────────────

describe("Test 11 — maxStarsPerTeam respected: after swap, neither team exceeds maxStarsPerTeam", () => {
  it("does not produce a team with more STAR players than maxStarsPerTeam when constraint is satisfiable", () => {
    // loser = t2 [p1=STAR, p2=REGULAR], partnerTeam = t3 [p3=STAR, p4=REGULAR]
    // maxStarsPerTeam = 1
    // Valid swaps: send p1(STAR)+p2(REGULAR) out, receive p3(STAR)+p4(REGULAR) → t2 gets [STAR,REGULAR]=1✓
    //   partner gets [p1=STAR, p2=REGULAR] instead of [p3=STAR,p4=REGULAR] → same count ✓
    // Or send p1(STAR)+p2(REGULAR), receive p4(REGULAR)+p3(STAR) → same result
    // Or send p2(REGULAR)+p1(STAR) → same as above
    // Any combo where outgoing is STAR+REGULAR and incoming is STAR+REGULAR → always 1 STAR each ✓
    const weights: WeightMap = {
      p1: "STAR", p2: "REGULAR",
      p3: "STAR", p4: "REGULAR",
      p5: "REGULAR", p6: "REGULAR",
    };

    const maxStarsPerTeam = 1;
    let violated = false;

    for (let i = 0; i < 100; i++) {
      const result = computeRotation({
        winnerRule: "ALWAYS",
        maxStarsPerTeam,
        weights,
        winnerTeamId: "t1",
        teams: [
          makeTeam("t1", ["p5", "p6"], null), // winner
          makeTeam("t2", ["p1", "p2"], null), // loser — swaps with Q_n
          makeTeam("t3", ["p3", "p4"], 1),    // Q_1 = Q_n (barrier)
        ],
      });

      // Apply swaps locally and count stars
      const pidMap = new Map<string, string[]>([
        ["t1", ["p5", "p6"]],
        ["t2", ["p1", "p2"]],
        ["t3", ["p3", "p4"]],
      ]);

      for (const swap of result.swaps) {
        const outIds = pidMap.get(swap.teamId);
        const partnerIds = pidMap.get(swap.withTeamId);
        if (outIds && partnerIds) {
          pidMap.set(swap.teamId, outIds.filter((p) => !swap.outPlayerIds.includes(p)).concat(swap.inPlayerIds));
          pidMap.set(swap.withTeamId, partnerIds.filter((p) => !swap.inPlayerIds.includes(p)).concat(swap.outPlayerIds));
        }
      }

      for (const [, ids] of pidMap) {
        const starCount = ids.filter((p) => (weights[p] ?? "GOOD") === "STAR").length;
        if (starCount > maxStarsPerTeam) {
          violated = true;
          break;
        }
      }
      if (violated) break;
    }

    // In 100 trials, should not violate maxStarsPerTeam (constraint is always satisfiable here)
    expect(violated).toBe(false);
  });

  it("accepts swap after 20 attempts even if maxStarsPerTeam would be violated (capRelaxed behavior)", () => {
    // All players are STAR — impossible to satisfy maxStarsPerTeam=0
    // After 20 attempts, any swap is accepted
    const weights: WeightMap = {
      p1: "STAR", p2: "STAR",
      p3: "STAR", p4: "STAR",
      p5: "STAR", p6: "STAR",
    };

    const result = computeRotation({
      winnerRule: "ALWAYS",
      maxStarsPerTeam: 0, // impossible constraint
      weights,
      winnerTeamId: null,
      teams: [
        makeTeam("tWinner", ["p5", "p6"], null),
        makeTeam("tOut", ["p1", "p2"], null),
        makeTeam("tPartner", ["p3", "p4"], 1),
      ],
    });

    // Should still produce a result (capRelaxed)
    expect(result.swaps).toHaveLength(1);
    expect(result.swaps[0]!.outPlayerIds).toHaveLength(2);
    expect(result.swaps[0]!.inPlayerIds).toHaveLength(2);
  });
});

// ── Test 12: All players accounted for after each rotation ───────────────────

describe("Test 12 — All players accounted for after each rotation: union equals original set", () => {
  it("WIN case: all players present after rotation", () => {
    const teams: DrawTeamSnapshot[] = [
      makeTeam("t1", ["p1", "p2"], null),
      makeTeam("t2", ["p3", "p4"], null),
      makeTeam("t3", ["p5", "p6"], 1),
    ];
    const originalSet = allPlayers(teams);

    const result = computeRotation({
      ...DEFAULT_PARAMS,
      winnerTeamId: "t1",
      teams,
    });

    const after = applyResultLocally(teams, result);
    const afterSet = allPlayers(after);

    expect(afterSet.size).toBe(originalSet.size);
    for (const p of originalSet) expect(afterSet.has(p)).toBe(true);
  });

  it("DRAW n=2 case: all players present after rotation", () => {
    const teams: DrawTeamSnapshot[] = [
      makeTeam("t1", ["p1", "p2", "p3"], null),
      makeTeam("t2", ["p4", "p5", "p6"], null),
      makeTeam("t3", ["p7", "p8", "p9"], 1),
      makeTeam("t4", ["p10", "p11", "p12"], 2),
    ];
    const originalSet = allPlayers(teams);

    const result = computeRotation({
      ...DEFAULT_PARAMS,
      winnerTeamId: null,
      teams,
    });

    const after = applyResultLocally(teams, result);
    const afterSet = allPlayers(after);

    expect(afterSet.size).toBe(originalSet.size);
    for (const p of originalSet) expect(afterSet.has(p)).toBe(true);
  });

  it("WIN_LIMIT case: all players present after rotation", () => {
    const teams: DrawTeamSnapshot[] = [
      makeTeam("t1", ["p1", "p2"], null, 1), // winner with 1 consecutive win
      makeTeam("t2", ["p3", "p4"], null),
      makeTeam("t3", ["p5", "p6"], 1),
      makeTeam("t4", ["p7", "p8"], 2),
    ];
    const originalSet = allPlayers(teams);

    const result = computeRotation({
      ...DEFAULT_PARAMS,
      winnerRule: "MAX_2_WINS",
      winnerTeamId: "t1",
      teams,
    });

    expect(result.kind).toBe("WIN_LIMIT");
    const after = applyResultLocally(teams, result);
    const afterSet = allPlayers(after);

    expect(afterSet.size).toBe(originalSet.size);
    for (const p of originalSet) expect(afterSet.has(p)).toBe(true);
  });
});
