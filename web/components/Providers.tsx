"use client";

import { SWRConfig } from "swr";
import type { ReactNode } from "react";
import { RouteProgress } from "./ui/RouteProgress";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        keepPreviousData: true,
        dedupingInterval: 5000,
        onErrorRetry(error, _key, _config, revalidate, { retryCount }) {
          const status = (error as { status?: number }).status;
          if (status === 401 || status === 403) return;
          if (retryCount >= 3) return;
          setTimeout(() => revalidate({ retryCount }), Math.min(1000 * 2 ** retryCount, 30_000));
        },
      }}
    >
      <RouteProgress />
      {children}
    </SWRConfig>
  );
}
