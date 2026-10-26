"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Calendar, Copy, Check, MapPin, Share2, Users } from "lucide-react";
import { Badge } from "../../../../components/ui/Badge";
import { BottomSheet } from "../../../../components/ui/BottomSheet";
import { Button } from "../../../../components/ui/Button";
import { Progress } from "../../../../components/ui/Progress";
import { SegmentedControl } from "../../../../components/ui/SegmentedControl";
import { PlayerRow } from "../../../../components/domain/PlayerRow";
import SalaLoading from "./loading";
import { EmptyState } from "../../../../components/ui/EmptyState";
import { ErrorState } from "../../../../components/ui/ErrorState";
import { useRoom } from "../../../../hooks/useRoom";
import type { RoomMemberSummary } from "../../../../hooks/useRoom";
import { useDraw } from "../../../../hooks/useDraw";
import { useRoomSession } from "../../../../hooks/useRoomSession";
import { apiFetch } from "../../../../lib/api";
import { formatRoomDateTime } from "../../../../lib/format";

type BadgeStatus = "Confirmado" | "Pendente" | "Espera" | "Recusado" | "Organizador";

function memberStatusToBadge(m: RoomMemberSummary): BadgeStatus {
  switch (m.status) {
    case "CONFIRMED": return "Confirmado";
    case "PENDING": return "Pendente";
    case "WAITLIST": return "Espera";
    case "REJECTED": return "Recusado";
    default: return "Pendente";
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

const POSITION_LABELS: Record<string, string> = {
  GOALKEEPER: "Goleiro",
  DEFENDER: "Defensor",
  MIDFIELDER: "Meia",
  FORWARD: "Atacante",
};

function formatPosition(pos: string | null | undefined): string {
  if (!pos) return "";
  return POSITION_LABELS[pos] ?? pos;
}

function getMemberSubtitle(m: RoomMemberSummary): string {
  const pos = formatPosition(m.user.preferredPosition);
  if (pos) return pos;
  return m.playRole === "GOALKEEPER" ? "Goleiro" : "Linha";
}

export default function SalaPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { room, isLoading, error, mutate } = useRoom(id);
  const { draw } = useDraw(id);
  const { session } = useRoomSession(id);
  const [activeTab, setActiveTab] = useState("linha");
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  if (isLoading) return <SalaLoading />;
  if (error) return <ErrorState onRetry={() => mutate()} />;
  if (!room) return <ErrorState message="Sala não encontrada." />;

  const dataHora = formatRoomDateTime(room.startsAt);
  const lineRestantes = room.lineSlots - room.confirmedLine;
  const gkRestantes = room.goalkeeperSlots - room.confirmedGoalkeepers;
  const lineProgress =
    room.lineSlots > 0 ? Math.round((room.confirmedLine / room.lineSlots) * 100) : 0;

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

  const myMember = room.myMember;
  const isOrgOrCoOrg =
    myMember?.role === "ORGANIZER" || myMember?.role === "CO_ORGANIZER";
  const isConfirmed = myMember?.status === "CONFIRMED" && !isOrgOrCoOrg;
  const isVisitor = myMember === null && room.status === "OPEN";

  const memberBadge: BadgeStatus | null = myMember
    ? memberStatusToBadge(myMember)
    : null;

  const tabOptions = [
    { value: "linha", label: `Linha · ${lineMembers.length}` },
    {
      value: "goleiros",
      label: `Goleiros · ${room.confirmedGoalkeepers}/${room.goalkeeperSlots}`,
    },
    { value: "espera", label: `Espera · ${waitlistMembers.length}` },
  ];

  const activeMembers =
    activeTab === "linha"
      ? lineMembers
      : activeTab === "goleiros"
        ? goalkeeperMembers
        : waitlistMembers;

  const totalSlots = room.lineSlots + room.goalkeeperSlots;
  const totalConfirmed = room.confirmedLine + room.confirmedGoalkeepers;

  async function handleLeave() {
    if (!myMember) return;
    setLoadingAction("leave");
    try {
      await apiFetch(`/rooms/${id}/members/${myMember.id}`, { method: "DELETE" });
      await mutate();
      router.push("/inicio");
    } catch (e: unknown) {
      toast.error((e as { message?: string }).message ?? "Erro ao sair da sala.");
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleOpenInvite() {
    setShowInvite(true);
    if (!inviteLink) {
      setInviteLoading(true);
      try {
        const result = await apiFetch<{ id: string; token: string; expiresAt: string }>(
          `/rooms/${id}/invites`,
          { method: "POST" },
        );
        setInviteLink(`${window.location.origin}/convite/${result.token}`);
      } catch {
        toast.error("Erro ao gerar link de convite.");
        setShowInvite(false);
      } finally {
        setInviteLoading(false);
      }
    }
  }

  async function handleCopyInvite() {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="animate-page-enter flex flex-col h-full">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-[var(--space-lg)] lg:p-[var(--space-3xl)] flex flex-col gap-[var(--space-lg)]">

        {/* Header: ← Sala share */}
        <div className="flex items-center gap-[var(--space-md)]">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-text-secondary hover:text-text-primary transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft size={20} />
          </button>
          <span className="text-heading-h3 text-text-primary flex-1">Sala</span>
          <button
            type="button"
            aria-label="Compartilhar"
            className="text-text-secondary hover:text-text-primary transition-colors"
          >
            <Share2 size={20} />
          </button>
        </div>

        {/* Room title + member badge */}
        <div className="flex items-center gap-[var(--space-sm)]">
          <h1 className="text-heading-h2 text-text-primary flex-1 truncate">
            {room.title}
          </h1>
          {memberBadge && <Badge status={memberBadge} />}
        </div>

        {/* 4 detail lines */}
        <div className="flex flex-col gap-[var(--space-sm)]">
          <span className="flex gap-[var(--space-xs)] items-center text-body-regular text-text-secondary">
            <Calendar size={16} className="shrink-0" aria-hidden />
            {dataHora}
          </span>
          <span className="flex gap-[var(--space-xs)] items-center text-body-regular text-text-secondary">
            <MapPin size={16} className="shrink-0" aria-hidden />
            {room.location}
          </span>
          <span className="flex gap-[var(--space-xs)] items-center text-body-regular text-text-secondary">
            <Users size={16} className="shrink-0" aria-hidden />
            {room.confirmedLine} de {room.lineSlots} vagas na linha ·{" "}
            {lineRestantes} restante{lineRestantes !== 1 ? "s" : ""}
          </span>
          {room.goalkeeperSlots > 0 && (
            <span className="flex gap-[var(--space-xs)] items-center text-body-regular text-text-secondary">
              <Users size={16} className="shrink-0" aria-hidden />
              {room.confirmedGoalkeepers} de {room.goalkeeperSlots} vagas de
              goleiro · {gkRestantes} restante{gkRestantes !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Progress bar — line only */}
        <Progress value={lineProgress} />

        {/* Teams section: current session teams when LIVE, initial draw otherwise */}
        {room.status === "LIVE" && session && session.teams.length > 0 ? (
          <section className="flex flex-col gap-[var(--space-lg)]">
            <span className="text-overline text-text-muted">TIMES ATUAIS</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-[var(--space-lg)]">
              {session.teams
                .filter((t) => t.queuePosition === null)
                .map((team) => (
                  <div
                    key={team.id}
                    className="bg-bg-surface border border-border-default rounded-[var(--radius-md)] p-[var(--space-lg)] flex flex-col gap-[var(--space-md)]"
                  >
                    <span className="text-body-strong text-text-primary">{team.name}</span>
                    <ul className="flex flex-col gap-[var(--space-xs)]">
                      {team.playerIds.map((pid) => {
                        const mbr = room.members.find((m) => m.userId === pid);
                        const role = mbr?.playRole === "GOALKEEPER" ? "Goleiro" : "Linha";
                        return (
                          <li
                            key={pid}
                            className="text-body-regular text-text-secondary flex items-center gap-[var(--space-xs)]"
                          >
                            <span className="text-caption-regular text-text-muted w-[60px]">{role}</span>
                            {mbr?.user.name ?? "Jogador"}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
            </div>
            {session.teams.some((t) => t.queuePosition !== null) && (
              <div className="flex flex-col gap-[var(--space-xs)]">
                <span className="text-caption-regular text-text-muted">Na fila</span>
                <div className="flex flex-wrap gap-[var(--space-sm)]">
                  {session.teams
                    .filter((t) => t.queuePosition !== null)
                    .sort((a, b) => (a.queuePosition ?? 0) - (b.queuePosition ?? 0))
                    .map((team) => (
                      <span
                        key={team.id}
                        className="bg-bg-raised border border-border-default rounded-full px-[var(--space-md)] py-[var(--space-sm)] text-caption-strong text-text-primary"
                      >
                        {team.queuePosition}º {team.name}
                      </span>
                    ))}
                </div>
              </div>
            )}
          </section>
        ) : draw && draw.teams.length > 0 ? (
          <section className="flex flex-col gap-[var(--space-lg)]">
            <span className="text-overline text-text-muted">TIMES SORTEADOS</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-[var(--space-lg)]">
              {draw.teams.map((team) => (
                <div
                  key={team.id}
                  className="bg-bg-surface border border-border-default rounded-[var(--radius-md)] p-[var(--space-lg)] flex flex-col gap-[var(--space-md)]"
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
        ) : null}

        {/* Live/drawn banner */}
        {(room.status === "LIVE" || room.status === "DRAWN") && (
          <div
            className={[
              "border rounded-[var(--radius-md)] p-[var(--space-md)] flex items-center gap-[var(--space-md)] cursor-pointer",
              room.status === "LIVE"
                ? "bg-status-danger-subtle border-status-danger"
                : "bg-accent-subtle border-accent-default",
            ].join(" ")}
            onClick={() =>
              router.push(
                room.status === "LIVE"
                  ? `/salas/${id}/partida`
                  : `/salas/${id}/sorteio`,
              )
            }
          >
            {room.status === "LIVE" ? (
              <>
                <span className="inline-block w-[8px] h-[8px] rounded-full bg-status-danger shrink-0" />
                <p className="text-body-strong text-text-primary flex-1">Partida ao vivo</p>
                <p className="text-caption-regular text-text-muted">Ver →</p>
              </>
            ) : (
              <>
                <p className="text-body-strong text-text-primary flex-1">Times sorteados</p>
                <p className="text-caption-regular text-text-muted">Ver →</p>
              </>
            )}
          </div>
        )}

        {/* Tabs + player list */}
        <div className="flex flex-col gap-[var(--space-md)]">
          <SegmentedControl
            options={tabOptions}
            value={activeTab}
            onChange={setActiveTab}
          />

          <div key={activeTab} className="animate-page-enter">
            {activeMembers.length === 0 ? (
              <EmptyState icon={Users} title="Nenhum jogador aqui" />
            ) : (
              <div className="bg-bg-surface border border-border-default rounded-[var(--radius-md)] divide-y divide-border-default overflow-hidden">
                {activeMembers.map((m, index) => (
                  <div
                    key={m.id}
                    className="px-[var(--space-md)] animate-list-item"
                    style={{ animationDelay: `${Math.min(index, 5) * 40}ms` }}
                  >
                    <PlayerRow
                      nome={m.user.name}
                      posicao={getMemberSubtitle(m)}
                      iniciais={getInitials(m.user.name)}
                      {...(m.user.avatarUrl != null && { avatarSrc: m.user.avatarUrl })}
                      status={memberStatusToBadge(m)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer — visitor: "Pedir para entrar" */}
      {isVisitor && (
        <div className="border-t border-border-default bg-bg-app px-[var(--space-lg)] py-[var(--space-lg)]">
          <Button
            variant="Primary"
            size="Large"
            className="w-full"
            onClick={() => router.push(`/salas/${id}/entrar`)}
          >
            Pedir para entrar
          </Button>
        </div>
      )}

      {/* Footer — confirmed: "Sair da sala" */}
      {isConfirmed && (
        <div className="border-t border-border-default bg-bg-app px-[var(--space-lg)] py-[var(--space-lg)]">
          <Button
            variant="Danger"
            size="Large"
            className="w-full"
            onClick={handleLeave}
            disabled={loadingAction === "leave"}
          >
            {loadingAction === "leave" ? "Saindo..." : "Sair da sala"}
          </Button>
        </div>
      )}

      {/* Footer — org/co-org: "Gerenciar sala" + "Convidar amigo" */}
      {isOrgOrCoOrg && (
        <div className="border-t border-border-default bg-bg-app px-[var(--space-lg)] py-[var(--space-lg)] flex flex-col gap-[var(--space-md)]">
          <Button
            variant="Primary"
            size="Large"
            className="w-full"
            onClick={() => router.push(`/salas/${id}/gestao`)}
          >
            Gerenciar sala
          </Button>
          <Button
            variant="Secondary"
            size="Large"
            className="w-full"
            onClick={handleOpenInvite}
            disabled={inviteLoading}
          >
            {inviteLoading ? "Gerando..." : "Convidar amigo"}
          </Button>
        </div>
      )}

      {/* Invite BottomSheet */}
      <BottomSheet open={showInvite} onClose={() => setShowInvite(false)}>
        <p className="text-heading-h2 text-text-primary">Convidar amigo de fora</p>
        <p className="text-caption-regular text-text-secondary">
          {room.title} · {totalConfirmed} de {totalSlots} vagas preenchidas
        </p>
        {inviteLoading ? (
          <p className="text-body-regular text-text-muted">Gerando link...</p>
        ) : inviteLink ? (
          <div className="flex flex-col gap-[var(--space-sm)]">
            <div className="bg-bg-raised border border-border-default rounded-[var(--radius-md)] px-[var(--space-lg)] py-[var(--space-md)] flex items-center justify-between gap-[var(--space-md)]">
              <span className="text-caption-regular text-text-primary truncate flex-1">
                {inviteLink}
              </span>
              <button
                type="button"
                onClick={handleCopyInvite}
                aria-label="Copiar link"
                className="text-text-secondary hover:text-text-primary transition-colors shrink-0"
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
              </button>
            </div>
            <p className="text-caption-regular text-text-muted">
              Expira em 24h · Uso único
            </p>
          </div>
        ) : null}
        <Button
          variant="Primary"
          size="Large"
          className="w-full"
          onClick={handleCopyInvite}
          disabled={!inviteLink || copied}
        >
          {copied ? "Copiado!" : "Copiar link e enviar"}
        </Button>
        <button
          type="button"
          className="w-full text-body-strong text-text-secondary py-[var(--space-sm)]"
          onClick={() => setShowInvite(false)}
        >
          Cancelar
        </button>
      </BottomSheet>
    </div>
  );
}
