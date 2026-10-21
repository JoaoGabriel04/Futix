"use client";

import { Calendar, Home, Shield, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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

interface TabBarProps {
  showGestao?: boolean | undefined;
  className?: string | undefined;
}

export function TabBar({ showGestao = false, className }: TabBarProps) {
  const pathname = usePathname() ?? "";

  const visible = entries.filter((e) => e.key !== "gestao" || showGestao);

  function isActive(entry: NavEntry) {
    return pathname === entry.href || pathname.startsWith(`${entry.href}/`);
  }

  return (
    <nav
      aria-label="Navegação principal"
      className={[
        "bg-bg-sidebar border-t border-border-default",
        "flex items-start pt-[10px] pb-[24px] px-[var(--space-sm)] h-[84px] w-full",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {visible.map((entry) => {
        const active = isActive(entry);
        return (
          <Link
            key={entry.key}
            href={entry.href}
            className="flex flex-1 flex-col gap-[var(--space-xs)] items-center min-w-0"
          >
            {/* Pill de ícone */}
            <span
              className={[
                "flex items-center justify-center h-8 w-14 rounded-full",
                active ? "bg-accent-subtle" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <entry.Icon
                size={22}
                aria-hidden
                className={active ? "text-accent-default" : "text-text-muted"}
              />
            </span>
            <span
              className={[
                "text-caption-strong whitespace-nowrap",
                active ? "text-accent-default" : "text-caption-regular text-text-muted",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {entry.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
