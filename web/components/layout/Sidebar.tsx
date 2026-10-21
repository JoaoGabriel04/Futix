"use client";

import { Calendar, Home, Shield, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";

type NavItem = "inicio" | "partidas" | "gestao" | "perfil";

interface NavEntry {
  key: NavItem;
  label: string;
  Icon: LucideIcon;
  href: string;
}

const entries: NavEntry[] = [
  { key: "inicio", label: "Início", Icon: Home, href: "/inicio" },
  { key: "partidas", label: "Partidas", Icon: Calendar, href: "/partidas" },
  { key: "gestao", label: "Gestão", Icon: Shield, href: "/gestao" },
  { key: "perfil", label: "Perfil", Icon: User, href: "/perfil" },
];

interface SidebarProps {
  showGestao?: boolean | undefined;
  userName?: string | undefined;
  userRole?: string | undefined;
  userIniciais?: string | undefined;
  userAvatarSrc?: string | undefined;
  onNovaSala?: (() => void) | undefined;
  className?: string | undefined;
}

export function Sidebar({
  showGestao = false,
  userName = "Usuário",
  userRole,
  userIniciais,
  userAvatarSrc,
  onNovaSala,
  className,
}: SidebarProps) {
  const pathname = usePathname() ?? "";

  const visible = entries.filter((e) => e.key !== "gestao" || showGestao);

  function isActive(entry: NavEntry) {
    return pathname === entry.href || pathname.startsWith(`${entry.href}/`);
  }

  return (
    <nav
      aria-label="Menu lateral"
      className={[
        "bg-bg-sidebar border-r border-border-default",
        "flex flex-col gap-[var(--space-2xl)] p-[var(--space-xl)] w-[248px] h-full",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Logo */}
      <div className="flex gap-[var(--space-md)] items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-futix-transparent.png"
          alt="Futix"
          width={36}
          height={36}
          className="shrink-0"
        />
        <span className="text-heading-h2 text-text-primary">Futix</span>
      </div>

      {/* Botão nova sala */}
      <Button variant="Primary" size="Large" className="w-full" onClick={onNovaSala}>
        Nova sala
      </Button>

      {/* Itens de navegação */}
      <div className="flex flex-col gap-[var(--space-xs)] flex-1">
        {visible.map((entry) => {
          const active = isActive(entry);
          return (
            <Link
              key={entry.key}
              href={entry.href}
              className={[
                "flex gap-[var(--space-md)] items-center h-11 px-[var(--space-md)] rounded-md",
                "text-body-strong transition-colors",
                active
                  ? "bg-accent-subtle text-accent-default"
                  : "text-text-secondary hover:bg-bg-raised",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <entry.Icon size={20} aria-hidden />
              {entry.label}
            </Link>
          );
        })}
      </div>

      {/* Usuário */}
      <div className="flex gap-[var(--space-md)] items-center">
        <Avatar
          iniciais={userIniciais ?? userName.slice(0, 2).toUpperCase()}
          src={userAvatarSrc}
          size="MD"
        />
        <div className="flex flex-col min-w-0 flex-1">
          <p className="text-body-strong text-text-primary truncate">{userName}</p>
          {userRole && <p className="text-caption-regular text-text-muted">{userRole}</p>}
        </div>
      </div>
    </nav>
  );
}
