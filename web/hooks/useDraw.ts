"use client";
import useSWR from "swr";
import { apiFetch } from "../lib/api";
import { keys } from "../lib/keys";

export type DrawPlayer = {
  userId: string;
  name: string;
  playRole: string;
  level?: "REGULAR" | "GOOD" | "STAR";
};

export type DrawTeam = {
  id: string;
  name: string;
  queuePosition: number | null;
  players: DrawPlayer[];
  weightTotal?: number;
};

export type DrawResult = {
  id: string;
  roomId: string;
  createdAt: string;
  teams: DrawTeam[];
  leftoverPlayers: DrawPlayer[];
  capRelaxed: boolean;
};

export function useDraw(roomId: string) {
  const { data, error, isLoading, mutate } = useSWR<DrawResult | null>(
    roomId ? keys.draw(roomId) : null,
    (path: string) => apiFetch<DrawResult | null>(path),
  );
  return { draw: data ?? null, isLoading, error, mutate };
}
