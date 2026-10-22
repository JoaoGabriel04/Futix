import { apiFetch } from "./api";
import type { CreateGoalInput } from "@fut/shared";

export async function startMatch(roomId: string): Promise<{ id: string; number: number }> {
  return apiFetch<{ id: string; number: number }>(`/rooms/${roomId}/matches`, { method: "POST" });
}

export async function pauseMatch(matchId: string): Promise<void> {
  return apiFetch<void>(`/matches/${matchId}/pause`, { method: "POST" });
}

export async function resumeMatch(matchId: string): Promise<void> {
  return apiFetch<void>(`/matches/${matchId}/resume`, { method: "POST" });
}

export async function endMatch(matchId: string): Promise<void> {
  return apiFetch<void>(`/matches/${matchId}/end`, { method: "POST" });
}

export async function addGoal(matchId: string, payload: CreateGoalInput): Promise<void> {
  return apiFetch<void>(`/matches/${matchId}/goals`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function undoLastGoal(matchId: string): Promise<void> {
  return apiFetch<void>(`/matches/${matchId}/goals/last`, { method: "DELETE" });
}
