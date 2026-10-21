"use client";

import { useMe } from "../../hooks/useMe";
import { AppShell } from "./AppShell";

export function AppShellWithUser({ children }: { children: React.ReactNode }) {
  const { user } = useMe();

  const iniciais = (user?.name ?? "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <AppShell
      userName={user?.name ?? undefined}
      userIniciais={iniciais || undefined}
      userAvatarSrc={user?.avatarUrl ?? undefined}
    >
      {children}
    </AppShell>
  );
}
