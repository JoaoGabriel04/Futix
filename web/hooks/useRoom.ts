"use client";
import useSWR from "swr";
import { apiFetch } from "../lib/api";
import { keys } from "../lib/keys";

type RoomMemberSummary = {
  id: string;
  userId: string;
  role: string;
  playRole: string;
  status: string;
  waitlistPosition: number | null;
  user: {
    id: string;
    name: string;
    nickname: string | null;
    avatarUrl: string | null;
    preferredPosition: string | null;
  };
};

type RoomDetail = {
  id: string;
  title: string;
  location: string;
  startsAt: string;
  lineSlots: number;
  teamSize: number;
  goalkeeperSlots: number;
  requireApproval: boolean;
  status: string;
  ownerId: string;
  confirmedLine: number;
  confirmedGoalkeepers: number;
  matchMinutes: number;
  winnerRule: string;
  maxStarsPerTeam: number;
  myMember: RoomMemberSummary | null;
  members: RoomMemberSummary[];
};

export type { RoomDetail, RoomMemberSummary };

export function useRoom(id: string) {
  const { data, error, isLoading, mutate } = useSWR<RoomDetail>(
    keys.room(id),
    (path: string) => apiFetch<RoomDetail>(path),
  );
  return { room: data, isLoading, error, mutate };
}
