"use client";

import useSWR from "swr";
import type { Summary } from "@fut/shared";
import { apiFetch } from "../lib/api";
import { keys } from "../lib/keys";

export function useRoomSummary(roomId: string | null) {
  const { data, isLoading, error } = useSWR<Summary>(
    roomId ? keys.summary(roomId) : null,
    (path: string) => apiFetch<Summary>(path),
  );
  return { summary: data ?? null, isLoading, error };
}
