// rotation.service.ts — STUB for T2, will be replaced in T3

export interface RotationResult {
  kind: "WIN" | "DRAW" | "WIN_LIMIT" | "NONE";
  swaps: Array<{ teamId: string; withTeamId: string; outPlayerIds: string[]; inPlayerIds: string[] }>;
  courtAfter: string[];
  queueAfter: string[];
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function computeRotation(_params: {
  roomId: string;
  matchId: string;
  winnerTeamId: string | null;
  endReason: string;
}): RotationResult {
  // STUB — implemented in T3
  return { kind: "NONE", swaps: [], courtAfter: [], queueAfter: [] };
}
