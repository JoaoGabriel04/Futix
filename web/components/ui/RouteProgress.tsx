"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

type BarState = "idle" | "loading" | "done";

export function RouteProgress() {
  const pathname = usePathname();
  const [barState, setBarState] = useState<BarState>("idle");
  const prevPathname = useRef(pathname);
  const doneTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fire immediately on link click — before Next.js starts the navigation
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const anchor = (e.target as Element).closest("a[href]");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || !href.startsWith("/")) return;
      try {
        const target = new URL(href, window.location.origin);
        if (
          target.pathname === window.location.pathname &&
          target.search === window.location.search
        ) return;
      } catch {
        return;
      }
      if (doneTimer.current) clearTimeout(doneTimer.current);
      setBarState("loading");
    }
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  useEffect(() => {
    if (pathname === prevPathname.current) return;
    prevPathname.current = pathname;
    setBarState("done");
    doneTimer.current = setTimeout(() => setBarState("idle"), 400);
    return () => {
      if (doneTimer.current) clearTimeout(doneTimer.current);
    };
  }, [pathname]);

  if (barState === "idle") return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[200] h-[3px]">
      <div className={barState === "done" ? "progress-bar-done" : "progress-bar-loading"} />
    </div>
  );
}
