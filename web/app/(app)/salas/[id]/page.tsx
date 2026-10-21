"use client";

import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as Tabs from "@radix-ui/react-tabs";
import { ArrowLeft, MapPin, Clock } from "lucide-react";
import { Badge } from "../../../../components/ui/Badge";
import { Progress } from "../../../../components/ui/Progress";
import { PlayerRow } from "../../../../components/domain/PlayerRow";
import { useRoom } from "../../../../hooks/useRoom";
import type { RoomMemberSummary } from "../../../../hooks/useRoom";

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
  const { room, isLoading } = useRoom(id);

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
    <div className="p-[var(--space-lg)] flex flex-col gap-[var(--space-lg)]">
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
