"use client";
import useSWR from "swr";
import { apiFetch } from "../lib/api";
import { keys } from "../lib/keys";

// The User type returned by GET /me (API omits providerId)
type MeUser = {
  id: string;
  name: string;
  nickname: string | null;
  phone: string | null;
  preferredPosition: string | null;
  avatarUrl: string | null;
  email: string | null;
  createdAt: string;
  connections?: { google: boolean; discord: boolean; password: boolean };
};

export function useMe() {
  const { data, error, isLoading, mutate } = useSWR<MeUser>(
    keys.me,
    (path: string) => apiFetch<MeUser>(path),
  );
  return { user: data, isLoading, error, mutate };
}
