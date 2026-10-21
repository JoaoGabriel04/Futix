"use client";
import useSWR from "swr";
import { apiFetch } from "../lib/api";
import { keys } from "../lib/keys";

// RoomSummary type — matches listRooms API response shape
type RoomSummary = {
  id: string;
  title: string;
  location: string;
  startsAt: string;
  lineSlots: number;
  teamSize: number;
  goalkeeperSlots: number;
  requireApproval: boolean;
  status: string;
  confirmedLine: number;
  confirmedGoalkeepers: number;
  myRole: string | null;     // ORGANIZER | CO_ORGANIZER | PLAYER | null
  myStatus: string | null;   // CONFIRMED | PENDING | WAITLIST | REJECTED | LEFT | null
};

export type { RoomSummary };

export function useRooms() {
  const { data, error, isLoading, mutate } = useSWR<RoomSummary[]>(
    keys.rooms,
    (path: string) => apiFetch<RoomSummary[]>(path),
  );
  return { rooms: data ?? [], isLoading, error, mutate };
}
