"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { Avatar } from "../ui/Avatar";
import { useMe } from "../../hooks/useMe";

const HEADER_PATHS = ["/inicio", "/partidas", "/perfil"];

export function AppHeader() {
  const pathname = usePathname();
  const { user } = useMe();

  if (!HEADER_PATHS.includes(pathname)) return null;

  const iniciais = (user?.name ?? "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <header className="lg:hidden sticky top-0 z-10 flex items-center gap-[var(--space-md)] bg-bg-surface border-b border-border-default px-[16px] py-[12px] shrink-0">
      <div className="relative size-[36px] rounded-[var(--radius-md)] overflow-hidden shrink-0">
        <Image
          src="/logo-futix.png"
          alt="Futix"
          fill
          className="object-contain"
          priority
        />
      </div>

      <span className="text-[17px] font-semibold leading-[22px] text-text-primary">
        Futix
      </span>

      <div className="flex-1" />

      <button
        type="button"
        aria-label="Notificações"
        className="size-[40px] flex items-center justify-center rounded-full bg-bg-raised border border-border-default shrink-0"
      >
        <Bell size={18} className="text-text-secondary" />
      </button>

      <Avatar
        iniciais={iniciais || undefined}
        src={user?.avatarUrl ?? undefined}
        size="MD"
      />
    </header>
  );
}
