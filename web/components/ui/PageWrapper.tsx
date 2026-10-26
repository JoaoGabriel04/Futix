import type { ReactNode } from "react";

interface PageWrapperProps {
  children: ReactNode;
  className?: string;
}

export function PageWrapper({ children, className }: PageWrapperProps) {
  return (
    <div className={["animate-page-enter", className].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
}
