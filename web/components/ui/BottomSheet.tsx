"use client";

import { useEffect, useState, type ReactNode } from "react";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function BottomSheet({ open, onClose, children }: BottomSheetProps) {
  const [mounted, setMounted] = useState(open);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setLeaving(false);
    } else if (mounted) {
      setLeaving(true);
      const t = setTimeout(() => {
        setMounted(false);
        setLeaving(false);
      }, 200);
      return () => clearTimeout(t);
    }
  }, [open, mounted]);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end">
      {/* Scrim */}
      <div
        className="absolute inset-0 transition-opacity"
        style={{
          backgroundColor: "rgba(0,0,0,0.6)",
          opacity: leaving ? 0 : 1,
          transitionDuration: "var(--motion-base)",
          transitionTimingFunction: "var(--ease-out)",
        }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet panel */}
      <div
        role="dialog"
        aria-modal="true"
        className={[
          "relative z-50 bg-bg-surface border border-border-default",
          "rounded-tl-[var(--radius-xl)] rounded-tr-[var(--radius-xl)]",
          "pb-[32px] pt-[12px] px-[var(--space-lg)]",
          "flex flex-col gap-[var(--space-lg)]",
          leaving ? "animate-sheet-exit" : "animate-sheet-enter",
        ].join(" ")}
      >
        {/* Drag handle */}
        <div className="flex justify-center">
          <div className="w-[40px] h-[4px] bg-border-strong rounded-[2px]" />
        </div>

        {children}
      </div>
    </div>
  );
}
