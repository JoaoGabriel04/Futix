"use client";
import useSWR from "swr";
import { apiFetch } from "../lib/api";

type InvitePreview = {
  roomId: string;
  room: { title: string; location: string; startsAt: string; lineSlots: number; goalkeeperSlots: number; status: string };
  expiresAt: string;
};

export function useInvitePreview(token: string) {
  const { data, error, isLoading } = useSWR<InvitePreview>(
    token ? `/invites/${token}` : null,
    (path: string) => apiFetch<InvitePreview>(path),
  );
  return { preview: data, isLoading, error };
}

export type { InvitePreview };
