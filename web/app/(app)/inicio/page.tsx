"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { preload } from "swr";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bell, Calendar, ChevronRight, MapPin, Search } from "lucide-react";
import { MatchCard } from "../../../components/domain/MatchCard";
import InicioLoading from "./loading";
import { EmptyState } from "../../../components/ui/EmptyState";
import { ErrorState } from "../../../components/ui/ErrorState";
import { useRooms } from "../../../hooks/useRooms";
import { useMe } from "../../../hooks/useMe";
import type { RoomSummary } from "../../../hooks/useRooms";
import { formatRoomDateTime } from "../../../lib/format";
import { apiFetch } from "../../../lib/api";
import { keys } from "../../../lib/keys";

function statusToBadge(
  r: RoomSummary,
): "Confirmado" | "Pendente" | "Espera" | "Recusado" | "Organizador" | undefined {
  if (r.myRole === "ORGANIZER" || r.myRole === "CO_ORGANIZER") return "Organizador";
  if (r.myStatus === "CONFIRMED") return "Confirmado";
  if (r.myStatus === "PENDING") return "Pendente";
  if (r.myStatus === "WAITLIST") return "Espera";
  if (r.myStatus === "REJECTED") return "Recusado";
  return undefined;
}

function totalSlots(r: RoomSummary): number {
  return r.lineSlots + r.goalkeeperSlots;
}

function totalConfirmed(r: RoomSummary): number {
  return r.confirmedLine + r.confirmedGoalkeepers;
}

function buildDateLabel(date: Date): string {
  const weekday = format(date, "EEEE", { locale: ptBR })
    .replace("-feira", "")
    .replace(/^\w/, (c) => c.toUpperCase());
  const dayMonth = format(date, "d MMM", { locale: ptBR }).replace(".", "");
  return `${weekday}, ${dayMonth}`;
}

export default function InicioPage() {
  const router = useRouter();
  const { rooms, isLoading, error, mutate } = useRooms();
  const { user } = useMe();

  const today = new Date();
  const dateLabel = buildDateLabel(today);
  const firstName = user?.name?.split(" ")[0] ?? "...";

  const nextRoom = rooms.find(
    (r) =>
      r.myStatus === "CONFIRMED" &&
      r.status !== "CANCELED" &&
      r.status !== "FINISHED",
  );

  if (isLoading) return <InicioLoading />;
  if (error) return <ErrorState onRetry={() => mutate()} />;

  const nextRoomConfirmed = nextRoom ? totalConfirmed(nextRoom) : 0;
  const nextRoomTotal = nextRoom ? totalSlots(nextRoom) : 0;
  const nextRoomFreeSlots = nextRoom
    ? Math.max(0, nextRoom.lineSlots - nextRoom.confirmedLine) +
      Math.max(0, nextRoom.goalkeeperSlots - nextRoom.confirmedGoalkeepers)
    : 0;
  const nextRoomPendingCount = nextRoom?.pendingCount ?? 0;
  const nextRoomIsOrg =
    nextRoom?.myRole === "ORGANIZER" || nextRoom?.myRole === "CO_ORGANIZER";

  return (
    <div className="animate-page-enter w-full max-w-2xl mx-auto lg:max-w-none p-[var(--space-lg)] lg:p-[var(--space-3xl)] flex flex-col gap-[var(--space-lg)]">

      {/* Header — greeting on mobile, page title + search on desktop */}
      <div className="flex flex-col gap-[var(--space-xs)] lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-[var(--space-xs)]">
          <span className="text-caption-regular text-text-muted">{dateLabel}</span>
          <h1 className="text-heading-h1 text-text-primary lg:hidden">Fala, {firstName}</h1>
          <h1 className="hidden lg:block text-heading-h2 text-text-primary">Salas abertas</h1>
        </div>
        {/* Search + bell — desktop only, decorative */}
        <div className="hidden lg:flex items-center gap-[var(--space-md)]">
          <div className="flex items-center gap-[var(--space-sm)] bg-bg-raised border border-border-default rounded-[var(--radius-md)] px-[var(--space-md)] h-[44px] w-[300px]">
            <Search size={18} className="text-text-muted shrink-0" aria-hidden />
            <span className="text-body-regular text-text-muted">Buscar sala ou jogador</span>
          </div>
          <button
            type="button"
            aria-label="Notificações"
            className="size-[44px] flex items-center justify-center rounded-full bg-bg-raised border border-border-default shrink-0"
          >
            <Bell size={18} className="text-text-secondary" />
          </button>
        </div>
      </div>

      {/* Hero card — next confirmed room */}
      {nextRoom && (
        <Link href={`/salas/${nextRoom.id}`} className="block">
          <div className="bg-accent-default rounded-[var(--radius-lg)] p-[var(--space-lg)] lg:p-[var(--space-3xl)] flex flex-col gap-[var(--space-md)] lg:flex-row lg:items-center lg:justify-between">
            {/* Left: room info */}
            <div className="flex flex-col gap-[var(--space-md)]">
              <span className="text-overline text-text-on-accent opacity-70">
                SUA PRÓXIMA PARTIDA
              </span>
              <p className="text-heading-h2 text-text-on-accent">{nextRoom.title}</p>
              <div className="flex flex-wrap items-center gap-x-[var(--space-lg)] gap-y-[var(--space-xs)] text-caption-regular text-text-on-accent opacity-80">
                <span className="flex items-center gap-[var(--space-xs)]">
                  <Calendar size={14} aria-hidden />
                  {formatRoomDateTime(nextRoom.startsAt)}
                </span>
                <span className="flex items-center gap-[var(--space-xs)]">
                  <MapPin size={14} aria-hidden />
                  {nextRoom.location}
                </span>
              </div>
              <div>
                <span className="inline-flex items-center gap-[var(--space-xs)] bg-bg-app text-text-primary text-caption-strong px-[var(--space-md)] py-[var(--space-xs)] rounded-full">
                  Ver sala <ChevronRight size={14} aria-hidden />
                </span>
              </div>
            </div>
            {/* Right: stats — desktop only */}
            <div className="hidden lg:flex items-center gap-[var(--space-3xl)] shrink-0">
              <div className="flex flex-col">
                <span className="text-heading-h2 text-text-on-accent">
                  {nextRoomConfirmed}/{nextRoomTotal}
                </span>
                <span className="text-caption-regular text-text-on-accent opacity-70">
                  confirmados
                </span>
              </div>
              {nextRoomIsOrg && (
                <div className="flex flex-col">
                  <span className="text-heading-h2 text-text-on-accent">
                    {nextRoomPendingCount}
                  </span>
                  <span className="text-caption-regular text-text-on-accent opacity-70">
                    solicitações
                  </span>
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-heading-h2 text-text-on-accent">
                  {nextRoomFreeSlots}
                </span>
                <span className="text-caption-regular text-text-on-accent opacity-70">
                  vagas livres
                </span>
              </div>
            </div>
          </div>
        </Link>
      )}

      {rooms.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="Nenhuma sala por aqui"
          description="Crie uma sala ou peça para entrar em uma partida."
          action={{ label: "Criar sala", onClick: () => router.push("/salas/criar") }}
        />
      ) : (
        /* Room list */
        <div className="flex flex-col gap-[var(--space-lg)]">
          {/* Section label */}
          <div className="flex items-center justify-between">
            <span className="text-body-strong text-text-primary">
              <span className="lg:hidden">Salas abertas</span>
              <span className="hidden lg:inline">Todas as salas</span>
            </span>
            <span className="text-caption-regular text-accent-default">
              <span className="lg:hidden">Ver todas</span>
              <span className="hidden lg:inline">Ver calendário</span>
            </span>
          </div>

          {/* Grid: single column mobile, 3 columns desktop */}
          <div className="flex flex-col gap-[var(--space-lg)] lg:grid lg:grid-cols-3">
            {rooms.map((r, index) => {
              const quando = formatRoomDateTime(r.startsAt);
              const total = totalSlots(r);
              const confirmed = totalConfirmed(r);
              const progressValue = total > 0 ? Math.round((confirmed / total) * 100) : 0;
              const vagas = `${confirmed}/${total} jogadores`;
              const badgeStatus = statusToBadge(r);

              return (
                <Link
                  key={r.id}
                  href={`/salas/${r.id}`}
                  className="block animate-list-item"
                  style={{ animationDelay: `${Math.min(index, 5) * 40}ms` }}
                  onMouseEnter={() => preload(keys.room(r.id), (path) => apiFetch(path))}
                  onFocus={() => preload(keys.room(r.id), (path) => apiFetch(path))}
                >
                  <MatchCard
                    titulo={r.title}
                    quando={quando}
                    local={r.location}
                    vagas={vagas}
                    {...(badgeStatus !== undefined && { status: badgeStatus })}
                    progressValue={progressValue}
                    isLive={r.status === "LIVE"}
                  />
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
