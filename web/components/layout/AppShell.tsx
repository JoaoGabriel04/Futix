import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { TabBar } from "./TabBar";

interface AppShellProps {
  children: ReactNode;
  showGestao?: boolean | undefined;
  userName?: string | undefined;
  userRole?: string | undefined;
  userIniciais?: string | undefined;
  userAvatarSrc?: string | undefined;
  onNovaSala?: (() => void) | undefined;
}

export function AppShell({
  children,
  showGestao,
  userName,
  userRole,
  userIniciais,
  userAvatarSrc,
  onNovaSala,
}: AppShellProps) {
  return (
    <div className="flex h-dvh bg-bg-app">
      {/* Sidebar — visível somente em ≥ lg */}
      <div className="hidden lg:flex shrink-0">
        <Sidebar
          showGestao={showGestao}
          userName={userName}
          userRole={userRole}
          userIniciais={userIniciais}
          userAvatarSrc={userAvatarSrc}
          onNovaSala={onNovaSala}
        />
      </div>

      {/* Conteúdo principal */}
      <main className="flex flex-col flex-1 min-w-0 overflow-y-auto">
        {children}
      </main>

      {/* TabBar — visível somente em < lg */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-10">
        <TabBar showGestao={showGestao} />
      </div>
    </div>
  );
}
