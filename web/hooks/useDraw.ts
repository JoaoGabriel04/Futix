"use client";
import useSWR from "swr";
import { apiFetch } from "../lib/api";

type DrawPlayer = { userId: string; name: string; playRole: string };
type DrawTeam = { id: string; name: string; players: DrawPlayer[] };

export type DrawResult = {
  id: string;
  roomId: string;
  createdAt: string;
  teams: DrawTeam[];
};

export function useDraw(roomId: string) {
  const { data, error, isLoading, mutate } = useSWR<DrawResult | null>(
    roomId ? `/rooms/${roomId}/draw` : null,
    (path: string) => apiFetch<DrawResult | null>(path),
  );
  return { draw: data ?? null, isLoading, error, mutate };
}
