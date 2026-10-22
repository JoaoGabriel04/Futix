"use client";

import type { ReactNode } from "react";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function BottomSheet({ open, onClose, children }: BottomSheetProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end">
      {/* Overlay scrim */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet panel */}
      <div
        className={[
          "relative z-50 bg-bg-surface border border-border-default",
          "rounded-tl-[var(--radius-xl)] rounded-tr-[var(--radius-xl)]",
          "pb-[32px] pt-[12px] px-[var(--space-lg)]",
          "flex flex-col gap-[var(--space-lg)]",
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
