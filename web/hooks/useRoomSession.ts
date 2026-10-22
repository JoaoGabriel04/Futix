"use client";
import useSWR from "swr";
import { apiFetch } from "../lib/api";
import { keys } from "../lib/keys";

// Types matching GET /rooms/:id/session response
export interface SessionTeam {
  id: string;
  name: string;
  queuePosition: number | null;
  playerIds: string[];
  consecutiveWins: number;
  weightTotal?: number; // org/co-org only
}

// Matches MatchForMember from the backend — no events array in session response
export interface SessionMatch {
  id: string;
  roomId: string;
  number: number;
  teamAId: string;
  teamBId: string;
  teamAPlayerIds: string[];
  teamBPlayerIds: string[];
  limitSeconds: number;
  status: "LIVE" | "PAUSED" | "FINISHED";
  startedAt: string; // ISO string
  elapsedSeconds: number;
  scoreA: number;
  scoreB: number;
  winnerTeamId: string | null;
  endReason: string | null;
  endedAt: string | null;
}

export interface SessionRotation {
  kind: string;
  swaps: unknown;
  courtAfter: string[];
  queueAfter: string[];
}

export interface RoomSession {
  status: string;
  teams: SessionTeam[];
  currentMatch: SessionMatch | null;
  lastRotation: SessionRotation | null;
}

export function useRoomSession(roomId: string) {
  const { data, error, isLoading, mutate } = useSWR<RoomSession>(
    roomId ? keys.roomSession(roomId) : null,
    (path: string) => apiFetch<RoomSession>(path),
  );
  return { session: data ?? null, isLoading, error, mutate };
}
