"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { useMe } from "../../hooks/useMe";
import { useOfflineToast } from "../../hooks/useOfflineToast";
import { AppShell } from "./AppShell";

export function AppShellWithUser({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useMe();
  const pathname = usePathname();
  const hideTabBar = /\/salas\/[^/]+\/partida/.test(pathname ?? "");
  useOfflineToast();

  const toastFiredRef = useRef(false);
  useEffect(() => {
    if (!isLoading || toastFiredRef.current) return;
    const timer = setTimeout(() => {
      if (isLoading) {
        toastFiredRef.current = true;
        toast("Servidor acordando...", {
          description: "Pode levar alguns segundos na primeira vez.",
          duration: 8000,
        });
      }
    }, 4000);
    return () => clearTimeout(timer);
  }, [isLoading]);

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
      hideTabBar={hideTabBar}
    >
      {children}
    </AppShell>
  );
}
