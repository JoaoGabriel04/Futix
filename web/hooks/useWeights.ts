"use client";
import useSWR from "swr";
import { apiFetch } from "../lib/api";
import { keys } from "../lib/keys";

export type WeightItem = {
  playerId: string;
  playerName: string;
  level: "REGULAR" | "GOOD" | "STAR";
};

export function useWeights(roomId: string) {
  const { data, error, isLoading, mutate } = useSWR<WeightItem[]>(
    roomId ? keys.weights(roomId) : null,
    (path: string) => apiFetch<WeightItem[]>(path),
  );
  return { weights: data ?? [], isLoading, error, mutate };
}
