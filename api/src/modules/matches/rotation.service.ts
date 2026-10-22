import { randomInt } from "crypto";
import { WEIGHT_VALUE } from "@fut/shared";

// ── public interfaces ──────────────────────────────────────────────────────────

export interface DrawTeamSnapshot {
  id: string;
  playerIds: string[];
  queuePosition: number | null; // null = on court
  consecutiveWins: number;
}

export interface WeightMap {
  [userId: string]: "REGULAR" | "GOOD" | "STAR";
}

export interface ComputeRotationParams {
  winnerTeamId: string | null;
  winnerRule: "ALWAYS" | "MAX_2_WINS";
  maxStarsPerTeam: number;
  teams: DrawTeamSnapshot[]; // all teams from the latest Draw
  weights: WeightMap; // userId → level (missing = GOOD)
}

export interface SwapRecord {
  teamId: string;
  withTeamId: string;
  outPlayerIds: string[];
  inPlayerIds: string[];
}

export interface RotationResult {
  kind: "WIN" | "DRAW" | "WIN_LIMIT" | "NONE";
  swaps: SwapRecord[];
  courtAfter: string[]; // team IDs on court
  queueAfter: string[]; // team IDs in queue, index 0 = position 1
  consecutiveWinsAfter: Record<string, number>; // teamId → consecutiveWins
}

// ── internal helpers ──────────────────────────────────────────────────────────

type MutableTeam = {
  id: string;
  playerIds: string[];
  consecutiveWins: number;
  queuePosition: number | null;
};

/**
 * R35 — swap 2 players from outTeam with 2 closest-level players from partnerTeam.
 * Mutates outTeam.playerIds and partnerTeam.playerIds in-place.
 * Returns the SwapRecord.
 */
function r35Swap(
  outTeam: MutableTeam,
  partnerTeam: MutableTeam,
  weights: WeightMap,
  maxStarsPerTeam: number,
): SwapRecord {
  const MAX_ATTEMPTS = 20;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    // Pick 2 random distinct indices from outTeam.playerIds
    const outIds = outTeam.playerIds.slice();
    const idx1 = randomInt(outIds.length);
    let idx2 = randomInt(outIds.length - 1);
    if (idx2 >= idx1) idx2++;

    const outPlayer1 = outIds[idx1]!;
    const outPlayer2 = outIds[idx2]!;

    // Find closest-level partner for outPlayer1 (must be distinct from partner for outPlayer2)
    const partnerIds = partnerTeam.playerIds.slice();

    const level1: "REGULAR" | "GOOD" | "STAR" = weights[outPlayer1] ?? "GOOD";
    const level2: "REGULAR" | "GOOD" | "STAR" = weights[outPlayer2] ?? "GOOD";

    // Candidates for player1 → pick closest
    const partner1 = pickClosestPartner(level1, partnerIds, weights);
    if (partner1 === null) continue; // no partners available

    // Candidates for player2 → pick closest excluding partner1
    const partnerIdsExcluding1 = partnerIds.filter((p) => p !== partner1);
    if (partnerIdsExcluding1.length === 0) continue;
    const partner2 = pickClosestPartner(level2, partnerIdsExcluding1, weights);
    if (partner2 === null) continue;

    // Validate maxStarsPerTeam constraint
    const isRelaxed = attempt === MAX_ATTEMPTS - 1;
    if (!isRelaxed) {
      const newOutTeamIds = outIds.filter((p) => p !== outPlayer1 && p !== outPlayer2).concat([partner1, partner2]);
      const newPartnerIds = partnerIds.filter((p) => p !== partner1 && p !== partner2).concat([outPlayer1, outPlayer2]);

      const outStars = newOutTeamIds.filter((p) => (weights[p] ?? "GOOD") === "STAR").length;
      const partnerStars = newPartnerIds.filter((p) => (weights[p] ?? "GOOD") === "STAR").length;

      if (outStars > maxStarsPerTeam || partnerStars > maxStarsPerTeam) {
        continue; // retry
      }
    }

    // Apply swap
    outTeam.playerIds = outTeam.playerIds.filter((p) => p !== outPlayer1 && p !== outPlayer2).concat([partner1, partner2]);
    partnerTeam.playerIds = partnerTeam.playerIds.filter((p) => p !== partner1 && p !== partner2).concat([outPlayer1, outPlayer2]);

    return {
      teamId: outTeam.id,
      withTeamId: partnerTeam.id,
      outPlayerIds: [outPlayer1, outPlayer2],
      inPlayerIds: [partner1, partner2],
    };
  }

  // Should not reach here normally, but TypeScript requires a return
  // Last attempt: accept any swap without constraint check
  const outPlayer1 = outTeam.playerIds[0]!;
  const outPlayer2 = outTeam.playerIds[1]!;
  const partner1 = partnerTeam.playerIds[0]!;
  const partner2 = partnerTeam.playerIds[1]!;

  outTeam.playerIds = outTeam.playerIds.filter((p) => p !== outPlayer1 && p !== outPlayer2).concat([partner1, partner2]);
  partnerTeam.playerIds = partnerTeam.playerIds.filter((p) => p !== partner1 && p !== partner2).concat([outPlayer1, outPlayer2]);

  return {
    teamId: outTeam.id,
    withTeamId: partnerTeam.id,
    outPlayerIds: [outPlayer1, outPlayer2],
    inPlayerIds: [partner1, partner2],
  };
}

/**
 * Pick the player from candidates whose weight level is closest to targetLevel.
 * On tie, pick at random. Returns null if candidates is empty.
 */
function pickClosestPartner(
  targetLevel: "REGULAR" | "GOOD" | "STAR",
  candidates: string[],
  weights: WeightMap,
): string | null {
  if (candidates.length === 0) return null;

  const targetVal = WEIGHT_VALUE[targetLevel];

  let minDist = Infinity;
  for (const c of candidates) {
    const level: "REGULAR" | "GOOD" | "STAR" = weights[c] ?? "GOOD";
    const dist = Math.abs(WEIGHT_VALUE[level] - targetVal);
    if (dist < minDist) minDist = dist;
  }

  const tied = candidates.filter((c) => {
    const level: "REGULAR" | "GOOD" | "STAR" = weights[c] ?? "GOOD";
    return Math.abs(WEIGHT_VALUE[level] - targetVal) === minDist;
  });

  return tied[randomInt(tied.length)]!;
}

// ── main pure function ────────────────────────────────────────────────────────

export function computeRotation(params: ComputeRotationParams): RotationResult {
  const { winnerTeamId, winnerRule, maxStarsPerTeam, teams, weights } = params;

  // Deep-clone teams so the function is pure (no input mutation)
  const mutableTeams: MutableTeam[] = teams.map((t) => ({
    id: t.id,
    playerIds: t.playerIds.slice(),
    consecutiveWins: t.consecutiveWins,
    queuePosition: t.queuePosition,
  }));

  const courtTeams = mutableTeams.filter((t) => t.queuePosition === null);
  const queueTeams = mutableTeams
    .filter((t) => t.queuePosition !== null)
    .sort((a, b) => (a.queuePosition as number) - (b.queuePosition as number));

  const n = queueTeams.length;

  // ── Case: no queue ──────────────────────────────────────────────────────────
  if (n === 0) {
    const consecutiveWinsAfter: Record<string, number> = {};
    for (const t of mutableTeams) {
      consecutiveWinsAfter[t.id] = t.consecutiveWins;
    }
    return {
      kind: "NONE",
      swaps: [],
      courtAfter: courtTeams.map((t) => t.id),
      queueAfter: [],
      consecutiveWinsAfter,
    };
  }

  // ── Determine rotation kind ─────────────────────────────────────────────────

  const winner = winnerTeamId ? mutableTeams.find((t) => t.id === winnerTeamId) ?? null : null;
  const loser = winnerTeamId ? courtTeams.find((t) => t.id !== winnerTeamId) ?? null : null;

  let kind: RotationResult["kind"];

  if (winner !== null && loser !== null) {
    // There is a winner
    const winsAfterThisMatch = winner.consecutiveWins + 1;
    if (winnerRule === "MAX_2_WINS" && winsAfterThisMatch >= 2) {
      kind = "WIN_LIMIT";
    } else {
      kind = "WIN";
    }
  } else {
    kind = "DRAW";
  }

  // ── WIN case (R32) ──────────────────────────────────────────────────────────
  if (kind === "WIN" && winner !== null && loser !== null) {
    winner.consecutiveWins = winner.consecutiveWins + 1;
    loser.consecutiveWins = 0;

    const qn = queueTeams[n - 1]!; // last barrier
    const q1 = queueTeams[0]!;     // first in queue (enters court)

    // R35: loser swaps with Q_n
    const swap = r35Swap(loser, qn, weights, maxStarsPerTeam);

    // Q_1 enters court. Loser goes to end of queue.
    // Q_1 leaves queue; Q_2..Q_n shift up; loser appended.
    const queueAfter: string[] = [
      ...queueTeams.slice(1).map((t) => t.id), // Q_2..Q_n
      loser.id,
    ];

    const consecutiveWinsAfter: Record<string, number> = {};
    for (const t of mutableTeams) {
      consecutiveWinsAfter[t.id] = t.consecutiveWins;
    }

    return {
      kind: "WIN",
      swaps: [swap],
      courtAfter: [winner.id, q1.id],
      queueAfter,
      consecutiveWinsAfter,
    };
  }

  // ── WIN_LIMIT and DRAW cases ────────────────────────────────────────────────
  // Both court teams exit. Reset consecutiveWins to 0.

  for (const t of courtTeams) {
    t.consecutiveWins = 0;
  }

  if (n === 1) {
    // Special case: n=1 — only one team in queue
    // Randomly pick which court team swaps with Q_1
    const q1 = queueTeams[0]!;
    const leavingIdx = randomInt(2); // 0 or 1
    const leaving = courtTeams[leavingIdx]!;
    const staying = courtTeams[1 - leavingIdx]!;

    const swap = r35Swap(leaving, q1, weights, maxStarsPerTeam);

    const consecutiveWinsAfter: Record<string, number> = {};
    for (const t of mutableTeams) {
      consecutiveWinsAfter[t.id] = t.consecutiveWins;
    }

    return {
      kind,
      swaps: [swap],
      courtAfter: [staying.id, q1.id],
      queueAfter: [leaving.id],
      consecutiveWinsAfter,
    };
  }

  // n >= 2: both court teams exit
  // Last two in queue: Q_{n-1} and Q_n (barriers for player swaps)
  const qnMinus1 = queueTeams[n - 2]!; // Q_{n-1}
  const qn = queueTeams[n - 1]!;        // Q_n

  // Randomly assign: one court team swaps with Q_{n-1}, the other with Q_n
  const pairChoice = randomInt(2); // 0 or 1
  const [exitA, exitB] = pairChoice === 0
    ? [courtTeams[0]!, courtTeams[1]!]
    : [courtTeams[1]!, courtTeams[0]!];

  const swapA = r35Swap(exitA, qnMinus1, weights, maxStarsPerTeam);
  const swapB = r35Swap(exitB, qn, weights, maxStarsPerTeam);

  // Q_1 and Q_2 enter court
  const q1 = queueTeams[0]!;
  const q2 = queueTeams[1]!;

  // Remaining queue: Q_3..Q_n (all except Q_1 and Q_2), then exiting court teams
  const remainingQueue = queueTeams.slice(2); // Q_3, Q_4, ..., Q_n

  // Randomize order of exiting teams at end of queue
  const exitOrder = randomInt(2) === 0 ? [exitA, exitB] : [exitB, exitA];

  const queueAfter: string[] = [
    ...remainingQueue.map((t) => t.id),
    exitOrder[0]!.id,
    exitOrder[1]!.id,
  ];

  const consecutiveWinsAfter: Record<string, number> = {};
  for (const t of mutableTeams) {
    consecutiveWinsAfter[t.id] = t.consecutiveWins;
  }

  return {
    kind,
    swaps: [swapA, swapB],
    courtAfter: [q1.id, q2.id],
    queueAfter,
    consecutiveWinsAfter,
  };
}

// ── applyRotation ─────────────────────────────────────────────────────────────

export type PrismaTx = {
  drawTeam: {
    update: (args: {
      where: { id: string };
      data: { playerIds?: string[]; consecutiveWins?: number; queuePosition?: number | null };
    }) => Promise<unknown>;
  };
};

/**
 * Apply a RotationResult to the DB.
 * Must be called inside a Prisma transaction.
 */
export async function applyRotation(
  teams: DrawTeamSnapshot[],
  result: RotationResult,
  tx: PrismaTx,
): Promise<void> {
  // Build updated playerIds from swaps
  const playerIdsMap = new Map<string, string[]>(teams.map((t) => [t.id, t.playerIds.slice()]));

  for (const swap of result.swaps) {
    const outTeamIds = playerIdsMap.get(swap.teamId);
    const partnerIds = playerIdsMap.get(swap.withTeamId);
    if (outTeamIds && partnerIds) {
      const newOut = outTeamIds.filter((p) => !swap.outPlayerIds.includes(p)).concat(swap.inPlayerIds);
      const newPartner = partnerIds.filter((p) => !swap.inPlayerIds.includes(p)).concat(swap.outPlayerIds);
      playerIdsMap.set(swap.teamId, newOut);
      playerIdsMap.set(swap.withTeamId, newPartner);
    }
  }

  // Update each team
  for (const team of teams) {
    const newPlayerIds = playerIdsMap.get(team.id) ?? team.playerIds;
    const courtIdx = result.courtAfter.indexOf(team.id);
    const queueIdx = result.queueAfter.indexOf(team.id);

    let newQueuePosition: number | null;
    if (courtIdx !== -1) {
      newQueuePosition = null;
    } else if (queueIdx !== -1) {
      newQueuePosition = queueIdx + 1;
    } else {
      // team not in result (shouldn't happen) — keep original
      newQueuePosition = team.queuePosition;
    }

    const newConsecutiveWins = result.consecutiveWinsAfter[team.id] ?? team.consecutiveWins;

    await tx.drawTeam.update({
      where: { id: team.id },
      data: {
        playerIds: newPlayerIds,
        consecutiveWins: newConsecutiveWins,
        queuePosition: newQueuePosition,
      },
    });
  }
}
