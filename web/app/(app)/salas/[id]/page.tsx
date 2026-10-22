"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as Tabs from "@radix-ui/react-tabs";
import { ArrowLeft, MapPin, Clock } from "lucide-react";
import { Badge } from "../../../../components/ui/Badge";
import { Button } from "../../../../components/ui/Button";
import { Progress } from "../../../../components/ui/Progress";
import { PlayerRow } from "../../../../components/domain/PlayerRow";
import { useRoom } from "../../../../hooks/useRoom";
import type { RoomMemberSummary } from "../../../../hooks/useRoom";
import { useDraw } from "../../../../hooks/useDraw";
import { apiFetch } from "../../../../lib/api";

type BadgeStatus = "Confirmado" | "Pendente" | "Espera" | "Recusado" | "Organizador";

function roomStatusToBadge(status: string): BadgeStatus {
  switch (status) {
    case "OPEN":
    case "ACTIVE":
      return "Confirmado";
    case "CANCELLED":
      return "Recusado";
    case "FINISHED":
      return "Recusado";
    default:
      return "Pendente";
  }
}

function memberStatusToBadge(m: RoomMemberSummary): BadgeStatus {
  if (m.role === "ORGANIZER" || m.role === "CO_ORGANIZER") return "Organizador";
  switch (m.status) {
    case "CONFIRMED":
      return "Confirmado";
    case "PENDING":
      return "Pendente";
    case "WAITLIST":
      return "Espera";
    case "REJECTED":
      return "Recusado";
    default:
      return "Pendente";
  }
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export default function SalaPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { room, isLoading, mutate } = useRoom(id);
  const { draw, mutate: mutateDraw } = useDraw(id);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  if (isLoading) {
    return (
      <p className="text-body-regular text-text-muted p-[var(--space-lg)]">Carregando...</p>
    );
  }

  if (!room) {
    return (
      <p className="text-body-regular text-text-muted p-[var(--space-lg)]">Sala não encontrada.</p>
    );
  }

  const quando = format(new Date(room.startsAt), "d 'de' MMMM, HH:mm", { locale: ptBR });

  const totalLine = room.lineSlots;
  const totalGoalkeepers = room.goalkeeperSlots;
  const lineProgress = totalLine > 0 ? Math.round((room.confirmedLine / totalLine) * 100) : 0;
  const goalkeeperProgress =
    totalGoalkeepers > 0
      ? Math.round((room.confirmedGoalkeepers / totalGoalkeepers) * 100)
      : 0;

  async function handleDraw() {
    setLoadingAction("draw");
    try {
      await apiFetch(`/rooms/${id}/draw`, { method: "POST" });
      await Promise.all([mutate(), mutateDraw()]);
    } catch (e: unknown) {
      alert((e as { message?: string }).message ?? "Erro ao realizar o sorteio.");
    } finally {
      setLoadingAction(null);
    }
  }

  const lineMembers = room.members.filter(
    (m) => m.playRole === "LINE" && m.status === "CONFIRMED",
  );
  const goalkeeperMembers = room.members.filter(
    (m) => m.playRole === "GOALKEEPER" && m.status === "CONFIRMED",
  );
  const waitlistMembers = room.members
    .filter((m) => m.status === "WAITLIST")
    .slice()
    .sort((a, b) => (a.waitlistPosition ?? 0) - (b.waitlistPosition ?? 0));

  return (
    <div className="w-full max-w-2xl mx-auto p-[var(--space-lg)] lg:p-[var(--space-3xl)] flex flex-col gap-[var(--space-lg)]">
      {/* Header */}
      <div className="flex items-center gap-[var(--space-md)]">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-text-secondary hover:text-text-primary transition-colors"
          aria-label="Voltar"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-heading-h2 text-text-primary flex-1 truncate">{room.title}</h1>
        <Badge status={roomStatusToBadge(room.status)} />
        {(room.myMember?.role === "ORGANIZER" || room.myMember?.role === "CO_ORGANIZER") && (
          <Button
            variant="Secondary"
            size="Small"
            onClick={() => router.push(`/salas/${id}/ajustes`)}
          >
            Ajustes
          </Button>
        )}
        {room.myMember?.role === "ORGANIZER" &&
          (room.status === "OPEN" || room.status === "LOCKED") && (
            <Button
              variant="Secondary"
              size="Small"
              onClick={handleDraw}
              disabled={loadingAction === "draw"}
            >
              {loadingAction === "draw" ? "Sorteando..." : "Sortear times"}
            </Button>
          )}
      </div>

      {/* Room info */}
      <div className="flex flex-col gap-[var(--space-sm)]">
        <span className="flex gap-[var(--space-xs)] items-center text-body-regular text-text-secondary">
          <MapPin size={16} className="shrink-0" aria-hidden />
          {room.location}
        </span>
        <span className="flex gap-[var(--space-xs)] items-center text-body-regular text-text-secondary">
          <Clock size={16} className="shrink-0" aria-hidden />
          {quando}
        </span>
      </div>

      {/* Vacancy rows */}
      <div className="flex flex-col gap-[var(--space-md)]">
        <div className="flex flex-col gap-[var(--space-xs)]">
          <div className="flex items-center justify-between">
            <span className="text-caption-strong text-text-primary">
              {room.confirmedLine}/{totalLine} linha
            </span>
          </div>
          <Progress value={lineProgress} />
        </div>

        {totalGoalkeepers > 0 && (
          <div className="flex flex-col gap-[var(--space-xs)]">
            <div className="flex items-center justify-between">
              <span className="text-caption-strong text-text-primary">
                {room.confirmedGoalkeepers}/{totalGoalkeepers} goleiros
              </span>
            </div>
            <Progress value={goalkeeperProgress} />
          </div>
        )}
      </div>

      {/* Drawn teams */}
      {draw && draw.teams.length > 0 && (
        <section className="flex flex-col gap-[var(--space-lg)]">
          <span className="text-overline text-text-muted">TIMES SORTEADOS</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-[var(--space-lg)]">
            {draw.teams.map((team) => (
              <div
                key={team.id}
                className="bg-bg-surface border border-border-default rounded-xl p-[var(--space-lg)] flex flex-col gap-[var(--space-md)]"
              >
                <span className="text-body-strong text-text-primary">{team.name}</span>
                <ul className="flex flex-col gap-[var(--space-xs)]">
                  {team.players.map((p) => (
                    <li
                      key={p.userId}
                      className="text-body-regular text-text-secondary flex items-center gap-[var(--space-xs)]"
                    >
                      <span className="text-caption-regular text-text-muted w-[60px]">
                        {p.playRole === "GOALKEEPER" ? "Goleiro" : "Linha"}
                      </span>
                      {p.name}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Join button — visible when room is open and user is not a member */}
      {room.status === "OPEN" && room.myMember === null && (
        <Button
          variant="Primary"
          size="Large"
          className="w-full"
          onClick={() => router.push(`/salas/${id}/entrar`)}
        >
          Entrar na sala
        </Button>
      )}

      {/* Tabs */}
      <Tabs.Root defaultValue="linha" className="flex flex-col gap-[var(--space-md)]">
        <Tabs.List
          className="flex gap-0 border-b border-border-default"
          aria-label="Jogadores da sala"
        >
          {(
            [
              { value: "linha", label: "Linha" },
              { value: "goleiros", label: "Goleiros" },
              { value: "espera", label: "Espera" },
            ] as const
          ).map((tab) => (
            <Tabs.Trigger
              key={tab.value}
              value={tab.value}
              className={[
                "flex-1 h-[40px] text-body-regular text-text-secondary",
                "border-b-2 border-transparent -mb-px transition-colors",
                "data-[state=active]:text-accent-default data-[state=active]:border-accent-default",
                "hover:text-text-primary",
              ].join(" ")}
            >
              {tab.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <Tabs.Content value="linha" className="flex flex-col gap-0">
          {lineMembers.length === 0 ? (
            <p className="text-body-regular text-text-muted">Nenhum jogador aqui.</p>
          ) : (
            lineMembers.map((m) => (
              <PlayerRow
                key={m.id}
                nome={m.user.name}
                posicao={m.user.preferredPosition ?? "—"}
                iniciais={getInitials(m.user.name)}
                {...(m.user.avatarUrl != null && { avatarSrc: m.user.avatarUrl })}
                status={memberStatusToBadge(m)}
              />
            ))
          )}
        </Tabs.Content>

        <Tabs.Content value="goleiros" className="flex flex-col gap-0">
          {goalkeeperMembers.length === 0 ? (
            <p className="text-body-regular text-text-muted">Nenhum jogador aqui.</p>
          ) : (
            goalkeeperMembers.map((m) => (
              <PlayerRow
                key={m.id}
                nome={m.user.name}
                posicao={m.user.preferredPosition ?? "—"}
                iniciais={getInitials(m.user.name)}
                {...(m.user.avatarUrl != null && { avatarSrc: m.user.avatarUrl })}
                status={memberStatusToBadge(m)}
              />
            ))
          )}
        </Tabs.Content>

        <Tabs.Content value="espera" className="flex flex-col gap-0">
          {waitlistMembers.length === 0 ? (
            <p className="text-body-regular text-text-muted">Nenhum jogador aqui.</p>
          ) : (
            waitlistMembers.map((m) => (
              <PlayerRow
                key={m.id}
                nome={m.user.name}
                posicao={m.user.preferredPosition ?? "—"}
                iniciais={getInitials(m.user.name)}
                {...(m.user.avatarUrl != null && { avatarSrc: m.user.avatarUrl })}
                status={memberStatusToBadge(m)}
              />
            ))
          )}
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}
