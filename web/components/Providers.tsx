"use client";

import { SWRConfig } from "swr";
import type { ReactNode } from "react";
import { RouteProgress } from "./ui/RouteProgress";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: false,
        keepPreviousData: true,
        dedupingInterval: 5000,
      }}
    >
      <RouteProgress />
      {children}
    </SWRConfig>
  );
}
