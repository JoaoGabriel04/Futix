"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronRight, Hand, Info, Lock, Shuffle, Users } from "lucide-react";
import * as RadixSwitch from "@radix-ui/react-switch";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ApprovalCard } from "../../../../../components/domain/ApprovalCard";
import GestaoLoading from "./loading";
import { EmptyState } from "../../../../../components/ui/EmptyState";
import { ErrorState } from "../../../../../components/ui/ErrorState";
import { Avatar } from "../../../../../components/ui/Avatar";
import { Badge } from "../../../../../components/ui/Badge";
import { Button } from "../../../../../components/ui/Button";
import { BottomSheet } from "../../../../../components/ui/BottomSheet";
import { SegmentedControl } from "../../../../../components/ui/SegmentedControl";
import { StepperRow } from "../../../../../components/domain/StepperRow";
import { useRoom } from "../../../../../hooks/useRoom";
import { apiFetch } from "../../../../../lib/api";
import { finishRoom, deleteRoom } from "../../../../../lib/matchApi";

const POSITION_LABELS: Record<string, string> = {
  GOALKEEPER: "Goleiro",
  DEFENDER: "Defensor",
  MIDFIELDER: "Meia",
  FORWARD: "Atacante",
};

interface GestaoClientProps {
  id: string;
}

type Tab = "requests" | "players" | "settings";

export function GestaoClient({ id }: GestaoClientProps) {
  const router = useRouter();
  const { room, isLoading, mutate } = useRoom(id);
  const [activeTab, setActiveTab] = useState<Tab>("requests");
  const [loadingMemberId, setLoadingMemberId] = useState<string | null>(null);

  const [showStartSheet, setShowStartSheet] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const [lineSlots, setLineSlots] = useState<number | null>(null);
  const [teamSize, setTeamSize] = useState<number | null>(null);
  const [goalkeeperSlots, setGoalkeeperSlots] = useState<number | null>(null);
  const [requireApproval, setRequireApproval] = useState<boolean | null>(null);
  const [settingsLoading, setSettingsLoading] = useState<string | null>(null);

  const [selectedCoOrgUserId, setSelectedCoOrgUserId] = useState<string>("");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loadingFinish, setLoadingFinish] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);

  if (isLoading) return <GestaoLoading />;
  if (!room) return <ErrorState message="Sala não encontrada." onRetry={() => mutate()} />;

  const pending = room.members.filter((m) => m.status === "PENDING");
  const confirmed = room.members.filter(
    (m) => m.status === "CONFIRMED" && m.role === "PLAYER",
  );
  const waitlist = room.members
    .filter((m) => m.status === "WAITLIST")
    .slice()
    .sort((a, b) => (a.waitlistPosition ?? 0) - (b.waitlistPosition ?? 0));

  const myMember = room.myMember;
  const isOrganizer = myMember?.role === "ORGANIZER";
  const isOrgOrCoOrg =
    myMember?.role === "ORGANIZER" || myMember?.role === "CO_ORGANIZER";
  const showActionBar =
    isOrgOrCoOrg && (room.status === "OPEN" || room.status === "LOCKED");

  const freeSlots =
    Math.max(0, room.lineSlots - room.confirmedLine) +
    Math.max(0, room.goalkeeperSlots - room.confirmedGoalkeepers);

  const currentLineSlots = lineSlots ?? room.lineSlots;
  const currentTeamSize = teamSize ?? room.teamSize;
  const currentGoalkeeperSlots = goalkeeperSlots ?? room.goalkeeperSlots;
  const currentRequireApproval = requireApproval ?? room.requireApproval;

  const coOrganizers = room.members.filter((m) => m.role === "CO_ORGANIZER");
  const confirmedNonOrgs = room.members.filter(
    (m) =>
      m.status === "CONFIRMED" &&
      m.role !== "ORGANIZER" &&
      m.role !== "CO_ORGANIZER",
  );

  const teamsCount =
    currentTeamSize > 0 ? Math.floor(currentLineSlots / currentTeamSize) : 0;
  const leftover =
    currentTeamSize > 0 ? currentLineSlots % currentTeamSize : 0;
  const infoText = `${currentLineSlots} na linha com ${currentTeamSize} por time formam ${teamsCount} times.${leftover > 0 ? " Sobras ficam de reserva." : ""}`;

  const roomDateLabel = format(new Date(room.startsAt), "d MMM", {
    locale: ptBR,
  }).replace(".", "");

  const roomDateTimeLabel =
    format(new Date(room.startsAt), "EEEE, d MMM '·' HH:mm", { locale: ptBR })
      .replace(".", "")
      .replace(/^\w/, (c) => c.toUpperCase()) +
    ` · ${room.location}`;

  const segmentOptions = [
    { value: "requests", label: `Solicitações · ${pending.length}` },
    { value: "players", label: "Jogadores" },
    { value: "settings", label: "Ajustes" },
  ];

  async function handleAction(
    memberId: string,
    action: "approve" | "reject" | "promote",
  ) {
    setLoadingMemberId(memberId);
    try {
      await apiFetch(`/rooms/${id}/members/${memberId}/${action}`, {
        method: "POST",
      });
      await mutate();
    } finally {
      setLoadingMemberId(null);
    }
  }

  async function handleStart() {
    setIsStarting(true);
    setStartError(null);
    try {
      await apiFetch(`/rooms/${id}/start`, { method: "POST" });
      await mutate();
      setShowStartSheet(false);
      router.push(`/salas/${id}/sorteio`);
    } catch (e) {
      setStartError((e as Error).message);
      setIsStarting(false);
    }
  }

  async function handleSaveFormato() {
    setSettingsLoading("formato");
    try {
      await apiFetch(`/rooms/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          lineSlots: currentLineSlots,
          teamSize: currentTeamSize,
          goalkeeperSlots: currentGoalkeeperSlots,
        }),
      });
      await mutate();
    } finally {
      setSettingsLoading(null);
    }
  }

  function handleToggleRequireApproval(v: boolean) {
    setRequireApproval(v);
    void apiFetch(`/rooms/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ requireApproval: v }),
    })
      .then(() => mutate())
      .catch(() => {
        toast.error("Erro ao salvar. Tente novamente.");
        setRequireApproval(!v);
      });
  }

  function handleToggleLock(v: boolean) {
    if (!v) return;
    void apiFetch(`/rooms/${id}/lock`, { method: "POST" })
      .then(() => mutate())
      .catch(() => toast.error("Não foi possível travar a sala."));
  }

  function handleCancel() {
    toast.warning(
      "Tem certeza que deseja cancelar a sala? Essa ação não pode ser desfeita.",
      {
        action: {
          label: "Cancelar sala",
          onClick: () => {
            void executeCancel();
          },
        },
        cancel: { label: "Manter sala", onClick: () => {} },
        duration: 10000,
        id: "confirm-cancel",
      },
    );
  }

  async function executeCancel() {
    setSettingsLoading("cancel");
    try {
      await apiFetch(`/rooms/${id}/cancel`, { method: "POST" });
      router.push("/inicio");
    } finally {
      setSettingsLoading(null);
    }
  }

  function handleFinishRoom() {
    toast.warning("Encerrar a sala? Esta ação não pode ser desfeita.", {
      action: { label: "Encerrar sala", onClick: () => { void executeFinishRoom(); } },
      cancel: { label: "Cancelar", onClick: () => {} },
      duration: 10000,
      id: "confirm-finish-room",
    });
  }

  async function executeFinishRoom() {
    setLoadingFinish(true);
    try {
      await finishRoom(id);
      router.push(`/salas/${id}/resumo`);
    } catch (e) {
      toast.error((e as Error).message ?? "Erro ao encerrar sala.");
      setLoadingFinish(false);
    }
  }

  function handleDeleteRoom() {
    toast.warning("Excluir a sala permanentemente? Todos os dados serão perdidos.", {
      action: { label: "Excluir sala", onClick: () => { void executeDeleteRoom(); } },
      cancel: { label: "Cancelar", onClick: () => {} },
      duration: 10000,
      id: "confirm-delete-room",
    });
  }

  async function executeDeleteRoom() {
    setLoadingDelete(true);
    try {
      await deleteRoom(id);
      router.push("/inicio");
    } catch (e) {
      toast.error((e as Error).message ?? "Erro ao excluir sala.");
      setLoadingDelete(false);
    }
  }

  async function handleAddCoOrg() {
    if (!selectedCoOrgUserId) return;
    setSettingsLoading(`add-coorg-${selectedCoOrgUserId}`);
    try {
      await apiFetch(`/rooms/${id}/co-organizers/${selectedCoOrgUserId}`, {
        method: "PUT",
      });
      setSelectedCoOrgUserId("");
      await mutate();
    } finally {
      setSettingsLoading(null);
    }
  }

  async function handleRemoveCoOrg(userId: string) {
    setSettingsLoading(`remove-coorg-${userId}`);
    try {
      await apiFetch(`/rooms/${id}/co-organizers/${userId}`, {
        method: "DELETE",
      });
      await mutate();
    } finally {
      setSettingsLoading(null);
    }
  }

  async function handleGenerateInvite() {
    setSettingsLoading("invite");
    try {
      const result = await apiFetch<{
        id: string;
        token: string;
        expiresAt: string;
      }>(`/rooms/${id}/invites`, { method: "POST" });
      setInviteLink(`${window.location.origin}/convite/${result.token}`);
    } finally {
      setSettingsLoading(null);
    }
  }

  async function handleCopyInvite() {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const memberToCard = (m: (typeof room.members)[number]) => ({
    id: m.id,
    userId: m.userId,
    role: m.role as "PLAYER" | "ORGANIZER" | "CO_ORGANIZER",
    status: m.status as
      | "PENDING"
      | "CONFIRMED"
      | "WAITLIST"
      | "REJECTED"
      | "LEFT",
    playRole: m.playRole as "LINE" | "GOALKEEPER",
    waitlistPosition: m.waitlistPosition,
    user: {
      name: m.user.name,
      nickname: m.user.nickname,
      avatarUrl: m.user.avatarUrl,
      preferredPosition: m.user.preferredPosition,
    },
  });

  function memberInitials(name: string): string {
    return name
      .split(" ")
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase();
  }

  function memberPosition(m: {
    playRole: string;
    user: { preferredPosition: string | null };
  }): string {
    return (
      (m.user.preferredPosition &&
        POSITION_LABELS[m.user.preferredPosition]) ??
      (m.playRole === "GOALKEEPER" ? "Goleiro" : "Jogador de linha")
    );
  }

  return (
    <div className="animate-page-enter flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <div className="w-full max-w-2xl mx-auto lg:max-w-none p-[var(--space-lg)] lg:p-[var(--space-3xl)] flex flex-col gap-[var(--space-lg)]">

          {/* Header — responsive */}
          <div className="flex items-center gap-[var(--space-md)] lg:justify-between">
            <div className="flex items-center gap-[var(--space-md)] min-w-0 flex-1">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex items-center justify-center shrink-0 text-text-secondary hover:text-text-primary transition-colors lg:size-[44px] lg:rounded-full lg:bg-bg-raised lg:border lg:border-border-default"
                aria-label="Voltar"
              >
                <ArrowLeft size={20} />
              </button>
              {/* Mobile title */}
              <div className="flex flex-col min-w-0 lg:hidden">
                <h1 className="text-heading-h3 text-text-primary truncate">
                  Gestão da sala
                </h1>
                <p className="text-caption-regular text-text-muted truncate">
                  {room.title} · {roomDateLabel}
                </p>
              </div>
              {/* Desktop title */}
              <div className="hidden lg:flex flex-col min-w-0">
                <p className="text-caption-regular text-text-muted truncate">
                  {roomDateTimeLabel}
                </p>
                <h1 className="text-heading-h2 text-text-primary truncate">
                  Gestão · {room.title}
                </h1>
              </div>
            </div>
            {/* Desktop action buttons */}
            {showActionBar && (
              <div className="hidden lg:flex items-center gap-[var(--space-md)] shrink-0">
                <Button
                  variant="Secondary"
                  size="Large"
                  onClick={() => handleToggleLock(true)}
                  disabled={room.status === "LOCKED"}
                >
                  Travar sala
                </Button>
                <Button
                  variant="Primary"
                  size="Large"
                  onClick={() => setShowStartSheet(true)}
                >
                  Sortear times
                </Button>
              </div>
            )}
          </div>

          {/* ===== MOBILE LAYOUT ===== */}
          <div className="lg:hidden flex flex-col gap-[var(--space-lg)]">

            <SegmentedControl
              options={segmentOptions}
              value={activeTab}
              onChange={(v) => setActiveTab(v as Tab)}
            />

            {/* Stats cards */}
            <div className="grid grid-cols-3 gap-[var(--space-sm)]">
              <div className="bg-bg-raised rounded-[var(--radius-md)] p-[var(--space-md)] flex flex-col gap-[var(--space-xs)]">
                <span className="text-heading-h2 text-text-primary">
                  {room.confirmedLine}/{room.lineSlots}
                </span>
                <span className="text-caption-regular text-text-muted">
                  na linha
                </span>
              </div>
              <div className="bg-bg-raised rounded-[var(--radius-md)] p-[var(--space-md)] flex flex-col gap-[var(--space-xs)]">
                <span className="text-heading-h2 text-text-primary">
                  {room.confirmedGoalkeepers}/{room.goalkeeperSlots}
                </span>
                <span className="text-caption-regular text-text-muted">
                  goleiros
                </span>
              </div>
              <div className="bg-accent-default rounded-[var(--radius-md)] p-[var(--space-md)] flex flex-col gap-[var(--space-xs)]">
                <span className="text-heading-h2 text-text-on-accent">
                  {pending.length}
                </span>
                <span className="text-caption-regular text-text-on-accent opacity-80">
                  pedidos
                </span>
              </div>
            </div>

            <div key={activeTab} className="animate-page-enter flex flex-col gap-[var(--space-lg)]">
            {/* Requests tab */}
            {activeTab === "requests" && (
              <div className="flex flex-col gap-[var(--space-md)]">
                <div className="flex items-center justify-between">
                  <span className="text-body-strong text-text-primary">
                    Aguardando aprovação
                  </span>
                  <span className="text-caption-regular text-accent-default">
                    {freeSlots} vagas livres
                  </span>
                </div>
                {pending.length === 0 ? (
                  <EmptyState title="Nenhuma solicitação pendente" />
                ) : (
                  pending.map((m, index) => (
                    <div
                      key={m.id}
                      className="animate-list-item"
                      style={{ animationDelay: `${Math.min(index, 5) * 40}ms` }}
                    >
                      <ApprovalCard
                        member={memberToCard(m)}
                        isLoading={loadingMemberId === m.id}
                        onApprove={() => handleAction(m.id, "approve")}
                        onReject={() => handleAction(m.id, "reject")}
                      />
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Players tab */}
            {activeTab === "players" && (
              <div className="flex flex-col gap-[var(--space-md)]">
                {confirmed.length === 0 && waitlist.length === 0 ? (
                  <EmptyState icon={Users} title="Nenhum membro confirmado ainda" />
                ) : (
                  <>
                    {confirmed.map((m, index) => (
                      <div
                        key={m.id}
                        className="animate-list-item"
                        style={{ animationDelay: `${Math.min(index, 5) * 40}ms` }}
                      >
                        <ApprovalCard member={memberToCard(m)} />
                      </div>
                    ))}
                    {waitlist.map((m, index) => (
                      <div
                        key={m.id}
                        className="animate-list-item"
                        style={{ animationDelay: `${Math.min(confirmed.length + index, 5) * 40}ms` }}
                      >
                        <ApprovalCard
                          member={memberToCard(m)}
                          isLoading={loadingMemberId === m.id}
                          onPromote={() => handleAction(m.id, "promote")}
                        />
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* Settings tab */}
            {activeTab === "settings" && (
              <div className="flex flex-col gap-[var(--space-3xl)]">

                {room.status === "OPEN" && (
                  <section className="flex flex-col gap-[var(--space-lg)]">
                    <span className="text-body-strong text-text-primary">
                      Formato da partida
                    </span>
                    <StepperRow
                      titulo="Vagas na linha"
                      dica="Quantos jogadores de linha podem confirmar."
                      value={currentLineSlots}
                      min={2}
                      max={99}
                      onChange={setLineSlots}
                    />
                    <StepperRow
                      titulo="Linha por time"
                      dica="Cada time sorteado terá esse número de jogadores."
                      value={currentTeamSize}
                      min={1}
                      max={99}
                      onChange={setTeamSize}
                    />
                    <StepperRow
                      titulo="Vagas de goleiro"
                      dica="Não entram no sorteio. Definidos em quadra."
                      value={currentGoalkeeperSlots}
                      min={0}
                      max={20}
                      onChange={setGoalkeeperSlots}
                    />
                    <div className="bg-accent-subtle rounded-[var(--radius-md)] p-[var(--space-md)] flex gap-[var(--space-sm)] items-start">
                      <Info
                        size={14}
                        className="text-accent-default shrink-0 mt-[2px]"
                        aria-hidden
                      />
                      <span className="text-caption-regular text-accent-default">
                        {infoText}
                      </span>
                    </div>
                    <Button
                      variant="Primary"
                      size="Large"
                      onClick={handleSaveFormato}
                      disabled={settingsLoading === "formato"}
                    >
                      {settingsLoading === "formato"
                        ? "Salvando..."
                        : "Salvar formato"}
                    </Button>
                  </section>
                )}

                <section className="flex flex-col gap-[var(--space-lg)]">
                  <span className="text-body-strong text-text-primary">
                    Regras da sala
                  </span>
                  <div className="bg-bg-surface border border-border-default rounded-[var(--radius-md)] px-[var(--space-lg)] py-[var(--space-md)] flex items-center justify-between gap-[var(--space-lg)]">
                    <div className="flex flex-col gap-[var(--space-xs)]">
                      <span className="text-body-strong text-text-primary">
                        Entrada só com aprovação
                      </span>
                      <span className="text-caption-regular text-text-secondary">
                        Todo pedido passa pela fila de solicitações.
                      </span>
                    </div>
                    <RadixSwitch.Root
                      checked={currentRequireApproval}
                      onCheckedChange={handleToggleRequireApproval}
                      className="relative inline-flex h-[28px] w-[48px] shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent bg-border-default transition-colors data-[state=checked]:bg-accent-default focus:outline-none focus:ring-2 focus:ring-accent-default focus:ring-offset-2"
                      aria-label="Entrada só com aprovação"
                    >
                      <RadixSwitch.Thumb className="pointer-events-none block h-[20px] w-[20px] translate-x-[2px] rounded-full bg-white shadow-md transition-transform data-[state=checked]:translate-x-[22px]" />
                    </RadixSwitch.Root>
                  </div>
                  <div className="bg-bg-surface border border-border-default rounded-[var(--radius-md)] px-[var(--space-lg)] py-[var(--space-md)] flex items-center justify-between gap-[var(--space-lg)]">
                    <div className="flex flex-col gap-[var(--space-xs)]">
                      <span className="text-body-strong text-text-primary">
                        Travar sala
                      </span>
                      <span className="text-caption-regular text-text-secondary">
                        Bloqueia novas entradas e libera o sorteio.
                      </span>
                    </div>
                    <RadixSwitch.Root
                      checked={room.status === "LOCKED"}
                      disabled={room.status === "LOCKED"}
                      onCheckedChange={handleToggleLock}
                      className="relative inline-flex h-[28px] w-[48px] shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent bg-border-default transition-colors data-[state=checked]:bg-accent-default focus:outline-none focus:ring-2 focus:ring-accent-default focus:ring-offset-2 disabled:opacity-50 disabled:cursor-default"
                      aria-label="Travar sala"
                    >
                      <RadixSwitch.Thumb className="pointer-events-none block h-[20px] w-[20px] translate-x-[2px] rounded-full bg-white shadow-md transition-transform data-[state=checked]:translate-x-[22px]" />
                    </RadixSwitch.Root>
                  </div>
                </section>

                <button
                  type="button"
                  onClick={() => router.push(`/salas/${id}/regras`)}
                  className="bg-bg-surface border border-border-default rounded-[var(--radius-md)] px-[var(--space-lg)] py-[var(--space-md)] flex items-center justify-between gap-[var(--space-lg)] w-full text-left"
                >
                  <div className="flex flex-col gap-[var(--space-xs)]">
                    <span className="text-body-strong text-text-primary">Regras da partida</span>
                    <span className="text-caption-regular text-text-secondary">
                      Tempo, regra de vencedor e craques por time.
                    </span>
                  </div>
                  <ChevronRight size={18} className="text-text-muted shrink-0" />
                </button>

                {isOrgOrCoOrg && (
                  <section className="flex flex-col gap-[var(--space-lg)]">
                    <span className="text-body-strong text-text-primary">
                      Co-organizadores
                    </span>
                    <div className="flex flex-col gap-[var(--space-sm)]">
                      {coOrganizers.length === 0 ? (
                        <p className="text-body-regular text-text-muted">
                          Nenhum co-organizador.
                        </p>
                      ) : (
                        coOrganizers.map((m) => (
                          <div
                            key={m.id}
                            className="bg-bg-surface border border-border-default rounded-lg flex items-center justify-between px-[var(--space-lg)] py-[var(--space-md)]"
                          >
                            <span className="text-body-regular text-text-primary">
                              {m.user.name}
                            </span>
                            {isOrganizer && (
                              <button
                                type="button"
                                aria-label={`Remover ${m.user.name} como co-organizador`}
                                disabled={
                                  settingsLoading ===
                                  `remove-coorg-${m.userId}`
                                }
                                onClick={() => handleRemoveCoOrg(m.userId)}
                                className="text-status-danger text-caption-strong transition-opacity disabled:opacity-40"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                    {isOrganizer && confirmedNonOrgs.length > 0 && (
                      <div className="flex flex-col gap-[var(--space-md)]">
                        <label
                          htmlFor="select-co-org"
                          className="text-caption-strong text-text-secondary"
                        >
                          Adicionar co-organizador
                        </label>
                        <select
                          id="select-co-org"
                          value={selectedCoOrgUserId}
                          onChange={(e) =>
                            setSelectedCoOrgUserId(e.target.value)
                          }
                          className="bg-bg-surface border border-border-default rounded-md h-[52px] px-[var(--space-lg)] text-body-regular text-text-primary outline-none focus:border-2 focus:border-accent-default w-full"
                        >
                          <option value="">Selecione um membro...</option>
                          {confirmedNonOrgs.map((m) => (
                            <option key={m.id} value={m.userId}>
                              {m.user.name}
                            </option>
                          ))}
                        </select>
                        <Button
                          variant="Secondary"
                          size="Large"
                          onClick={handleAddCoOrg}
                          disabled={
                            !selectedCoOrgUserId ||
                            settingsLoading?.startsWith("add-coorg-") === true
                          }
                        >
                          {settingsLoading?.startsWith("add-coorg-")
                            ? "Adicionando..."
                            : "Adicionar co-organizador"}
                        </Button>
                      </div>
                    )}
                  </section>
                )}

                {isOrgOrCoOrg && (
                  <section className="flex flex-col gap-[var(--space-lg)]">
                    <span className="text-body-strong text-text-primary">
                      Convite
                    </span>
                    {inviteLink ? (
                      <div className="flex flex-col gap-[var(--space-md)]">
                        <p className="text-caption-regular text-text-secondary">
                          Link de uso único válido por 24h:
                        </p>
                        <div className="bg-bg-surface border border-border-default rounded-lg px-[var(--space-lg)] py-[var(--space-md)] flex items-center justify-between gap-[var(--space-md)]">
                          <span className="text-caption-regular text-text-primary truncate flex-1">
                            {inviteLink}
                          </span>
                          <button
                            type="button"
                            onClick={handleCopyInvite}
                            className="text-accent-default text-caption-strong shrink-0"
                          >
                            {copied ? "Copiado!" : "Copiar"}
                          </button>
                        </div>
                        <Button
                          variant="Secondary"
                          size="Large"
                          onClick={handleGenerateInvite}
                          disabled={settingsLoading === "invite"}
                        >
                          Gerar novo link
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="Secondary"
                        size="Large"
                        onClick={handleGenerateInvite}
                        disabled={settingsLoading === "invite"}
                      >
                        {settingsLoading === "invite"
                          ? "Gerando..."
                          : "Gerar link de convite"}
                      </Button>
                    )}
                  </section>
                )}

                {room.status !== "LIVE" &&
                  room.status !== "FINISHED" &&
                  room.status !== "CANCELED" && (
                    <Button
                      variant="Danger"
                      size="Large"
                      onClick={handleCancel}
                      disabled={settingsLoading === "cancel"}
                    >
                      {settingsLoading === "cancel"
                        ? "Cancelando..."
                        : "Cancelar sala"}
                    </Button>
                  )}

                {(room.status === "LIVE" || room.status === "DRAWN") && isOrgOrCoOrg && (
                  <Button
                    variant="Danger"
                    size="Large"
                    onClick={handleFinishRoom}
                    disabled={loadingFinish}
                  >
                    {loadingFinish ? "Encerrando..." : "Encerrar sala"}
                  </Button>
                )}

                {room.status === "FINISHED" && isOrganizer && (
                  <Button
                    variant="Danger"
                    size="Large"
                    onClick={handleDeleteRoom}
                    disabled={loadingDelete}
                  >
                    {loadingDelete ? "Excluindo..." : "Excluir sala"}
                  </Button>
                )}
              </div>
            )}
            </div>
          </div>

          {/* ===== DESKTOP LAYOUT ===== */}
          <div className="hidden lg:flex gap-[var(--space-3xl)]">

            {/* Left column — pending + confirmed + waitlist */}
            <div className="flex-1 min-w-0 flex flex-col gap-[var(--space-xl)]">

              {/* Pending section */}
              <section className="flex flex-col gap-[var(--space-lg)]">
                <div className="flex items-center justify-between">
                  <h2 className="text-heading-h3 text-text-primary">
                    Aguardando aprovação
                  </h2>
                  <Badge status="Pendente" />
                </div>
                {pending.length === 0 ? (
                  <EmptyState title="Nenhuma solicitação pendente" />
                ) : (
                  <div className="grid grid-cols-2 gap-[var(--space-lg)]">
                    {pending.map((m) => (
                      <ApprovalCard
                        key={m.id}
                        member={memberToCard(m)}
                        isLoading={loadingMemberId === m.id}
                        onApprove={() => handleAction(m.id, "approve")}
                        onReject={() => handleAction(m.id, "reject")}
                      />
                    ))}
                  </div>
                )}
              </section>

              {/* Confirmed section */}
              <section className="flex flex-col gap-[var(--space-lg)]">
                <h2 className="text-heading-h3 text-text-primary">
                  Confirmados · linha {room.confirmedLine}/{room.lineSlots} ·
                  goleiros {room.confirmedGoalkeepers}/{room.goalkeeperSlots}
                </h2>
                <div className="bg-bg-surface border border-border-default rounded-[var(--radius-md)] overflow-hidden">
                  {confirmed.length === 0 ? (
                    <EmptyState icon={Users} title="Nenhum confirmado ainda" />
                  ) : (
                    confirmed.map((m, i) => (
                      <div
                        key={m.id}
                        className={[
                          "flex items-center gap-[var(--space-md)] px-[var(--space-lg)] py-[var(--space-md)]",
                          i < confirmed.length - 1
                            ? "border-b border-border-default"
                            : "",
                        ].join(" ")}
                      >
                        <Avatar
                          iniciais={memberInitials(m.user.name)}
                          src={m.user.avatarUrl ?? undefined}
                          size="MD"
                        />
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-body-strong text-text-primary truncate">
                            {m.user.name}
                          </span>
                          <span className="text-caption-regular text-accent-default">
                            {memberPosition(m)}
                          </span>
                        </div>
                        <Badge status="Confirmado" />
                      </div>
                    ))
                  )}
                </div>
              </section>

              {/* Waitlist section */}
              {waitlist.length > 0 && (
                <section className="flex flex-col gap-[var(--space-lg)]">
                  <h2 className="text-heading-h3 text-text-primary">
                    Lista de espera
                  </h2>
                  <div className="grid grid-cols-2 gap-[var(--space-lg)]">
                    {waitlist.map((m) => (
                      <ApprovalCard
                        key={m.id}
                        member={memberToCard(m)}
                        isLoading={loadingMemberId === m.id}
                        onPromote={() => handleAction(m.id, "promote")}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* Right column — settings */}
            <div className="w-[380px] shrink-0 flex flex-col gap-[var(--space-xl)]">

              {/* Formato da partida */}
              {room.status === "OPEN" && (
                <section className="flex flex-col gap-[var(--space-lg)]">
                  <h2 className="text-heading-h3 text-accent-default">
                    Formato da partida
                  </h2>
                  <StepperRow
                    titulo="Vagas na linha"
                    dica="Quantos de linha podem confirmar."
                    value={currentLineSlots}
                    min={2}
                    max={99}
                    onChange={setLineSlots}
                  />
                  <StepperRow
                    titulo="Linha por time"
                    dica="Define quantos times saem do sorteio."
                    value={currentTeamSize}
                    min={1}
                    max={99}
                    onChange={setTeamSize}
                  />
                  <StepperRow
                    titulo="Vagas de goleiro"
                    dica="Fora do sorteio. Definidos em quadra."
                    value={currentGoalkeeperSlots}
                    min={0}
                    max={20}
                    onChange={setGoalkeeperSlots}
                  />
                  <Button
                    variant="Primary"
                    size="Large"
                    onClick={handleSaveFormato}
                    disabled={settingsLoading === "formato"}
                  >
                    {settingsLoading === "formato"
                      ? "Salvando..."
                      : "Salvar formato"}
                  </Button>
                </section>
              )}

              {/* Regras da sala */}
              <section className="flex flex-col gap-[var(--space-lg)]">
                <h2 className="text-heading-h3 text-accent-default">
                  Regras da sala
                </h2>
                <div className="bg-bg-surface border border-border-default rounded-[var(--radius-md)] px-[var(--space-lg)] py-[var(--space-md)] flex items-center justify-between gap-[var(--space-lg)]">
                  <div className="flex flex-col gap-[var(--space-xs)]">
                    <span className="text-body-strong text-text-primary">
                      Entrada só com aprovação
                    </span>
                    <span className="text-caption-regular text-text-secondary">
                      Sempre ativo. Nenhum convidado entra sem passar pela fila.
                    </span>
                  </div>
                  <RadixSwitch.Root
                    checked={currentRequireApproval}
                    onCheckedChange={handleToggleRequireApproval}
                    className="relative inline-flex h-[28px] w-[48px] shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent bg-border-default transition-colors data-[state=checked]:bg-accent-default focus:outline-none focus:ring-2 focus:ring-accent-default focus:ring-offset-2"
                    aria-label="Entrada só com aprovação"
                  >
                    <RadixSwitch.Thumb className="pointer-events-none block h-[20px] w-[20px] translate-x-[2px] rounded-full bg-white shadow-md transition-transform data-[state=checked]:translate-x-[22px]" />
                  </RadixSwitch.Root>
                </div>
                <div className="bg-bg-surface border border-border-default rounded-[var(--radius-md)] px-[var(--space-lg)] py-[var(--space-md)] flex items-center justify-between gap-[var(--space-lg)]">
                  <div className="flex flex-col gap-[var(--space-xs)]">
                    <span className="text-body-strong text-text-primary">
                      Travar sala
                    </span>
                    <span className="text-caption-regular text-text-secondary">
                      Bloqueia novas entradas e libera o sorteio.
                    </span>
                  </div>
                  <RadixSwitch.Root
                    checked={room.status === "LOCKED"}
                    disabled={room.status === "LOCKED"}
                    onCheckedChange={handleToggleLock}
                    className="relative inline-flex h-[28px] w-[48px] shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent bg-border-default transition-colors data-[state=checked]:bg-accent-default focus:outline-none focus:ring-2 focus:ring-accent-default focus:ring-offset-2 disabled:opacity-50 disabled:cursor-default"
                    aria-label="Travar sala"
                  >
                    <RadixSwitch.Thumb className="pointer-events-none block h-[20px] w-[20px] translate-x-[2px] rounded-full bg-white shadow-md transition-transform data-[state=checked]:translate-x-[22px]" />
                  </RadixSwitch.Root>
                </div>
              </section>

              {/* Regras da partida — link */}
              <button
                type="button"
                onClick={() => router.push(`/salas/${id}/regras`)}
                className="bg-bg-surface border border-border-default rounded-[var(--radius-md)] px-[var(--space-lg)] py-[var(--space-md)] flex items-center justify-between gap-[var(--space-lg)] w-full text-left"
              >
                <div className="flex flex-col gap-[var(--space-xs)]">
                  <span className="text-body-strong text-text-primary">Regras da partida</span>
                  <span className="text-caption-regular text-text-secondary">
                    Tempo, regra de vencedor e craques por time.
                  </span>
                </div>
                <ChevronRight size={18} className="text-text-muted shrink-0" />
              </button>

              {/* Cancelar sala */}
              {room.status !== "LIVE" &&
                room.status !== "FINISHED" &&
                room.status !== "CANCELED" && (
                  <Button
                    variant="Danger"
                    size="Large"
                    onClick={handleCancel}
                    disabled={settingsLoading === "cancel"}
                  >
                    {settingsLoading === "cancel" ? "Cancelando..." : "Cancelar sala"}
                  </Button>
                )}

              {/* Encerrar sala — sala em andamento */}
              {(room.status === "LIVE" || room.status === "DRAWN") && isOrgOrCoOrg && (
                <Button
                  variant="Danger"
                  size="Large"
                  onClick={handleFinishRoom}
                  disabled={loadingFinish}
                >
                  {loadingFinish ? "Encerrando..." : "Encerrar sala"}
                </Button>
              )}

              {/* Excluir sala — apenas após conclusão */}
              {room.status === "FINISHED" && isOrganizer && (
                <Button
                  variant="Danger"
                  size="Large"
                  onClick={handleDeleteRoom}
                  disabled={loadingDelete}
                >
                  {loadingDelete ? "Excluindo..." : "Excluir sala"}
                </Button>
              )}

              {/* Co-organizadores */}
              {isOrgOrCoOrg && (
                <section className="flex flex-col gap-[var(--space-lg)]">
                  <h2 className="text-heading-h3 text-accent-default">
                    Co-organizadores · {coOrganizers.length}
                  </h2>
                  <div className="bg-bg-surface border border-border-default rounded-[var(--radius-md)] overflow-hidden">
                    {coOrganizers.length === 0 ? (
                      <p className="p-[var(--space-lg)] text-body-regular text-text-muted">
                        Nenhum co-organizador.
                      </p>
                    ) : (
                      coOrganizers.map((m, i) => (
                        <div
                          key={m.id}
                          className={[
                            "flex items-center gap-[var(--space-md)] px-[var(--space-lg)] py-[var(--space-md)]",
                            i < coOrganizers.length - 1
                              ? "border-b border-border-default"
                              : "",
                          ].join(" ")}
                        >
                          <Avatar
                            iniciais={memberInitials(m.user.name)}
                            src={m.user.avatarUrl ?? undefined}
                            size="MD"
                          />
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="text-body-strong text-text-primary truncate">
                              {m.user.name}
                            </span>
                            <span className="text-caption-regular text-text-muted">
                              Co-organizador
                            </span>
                          </div>
                          <Badge status="Organizador" />
                        </div>
                      ))
                    )}
                    {isOrganizer && confirmedNonOrgs.length > 0 && (
                      <div
                        className={
                          coOrganizers.length > 0
                            ? "border-t border-border-default"
                            : ""
                        }
                      >
                        <div className="flex flex-col gap-[var(--space-md)] p-[var(--space-lg)]">
                          <select
                            id="select-co-org-desktop"
                            value={selectedCoOrgUserId}
                            onChange={(e) =>
                              setSelectedCoOrgUserId(e.target.value)
                            }
                            className="bg-bg-raised border border-border-default rounded-md h-[44px] px-[var(--space-md)] text-body-regular text-text-primary outline-none focus:border-2 focus:border-accent-default w-full"
                          >
                            <option value="">Selecione um membro...</option>
                            {confirmedNonOrgs.map((m) => (
                              <option key={m.id} value={m.userId}>
                                {m.user.name}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={handleAddCoOrg}
                            disabled={
                              !selectedCoOrgUserId ||
                              settingsLoading?.startsWith("add-coorg-") === true
                            }
                            className="text-body-strong text-accent-default text-left disabled:opacity-40 transition-opacity"
                          >
                            {settingsLoading?.startsWith("add-coorg-")
                              ? "Adicionando..."
                              : "Adicionar co-organizador"}
                          </button>
                        </div>
                      </div>
                    )}
                    {isOrganizer && confirmedNonOrgs.length === 0 && coOrganizers.length > 0 && (
                      <div className="border-t border-border-default px-[var(--space-lg)] py-[var(--space-md)]">
                        <span className="text-caption-regular text-text-muted">
                          Nenhum membro disponível para adicionar.
                        </span>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Convite */}
              {isOrgOrCoOrg && (
                <section className="flex flex-col gap-[var(--space-lg)]">
                  <h2 className="text-heading-h3 text-accent-default">
                    Convite
                  </h2>
                  {inviteLink ? (
                    <div className="flex flex-col gap-[var(--space-md)]">
                      <p className="text-caption-regular text-text-secondary">
                        Link de uso único válido por 24h:
                      </p>
                      <div className="bg-bg-surface border border-border-default rounded-lg px-[var(--space-lg)] py-[var(--space-md)] flex items-center justify-between gap-[var(--space-md)]">
                        <span className="text-caption-regular text-text-primary truncate flex-1">
                          {inviteLink}
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyInvite}
                          className="text-accent-default text-caption-strong shrink-0"
                        >
                          {copied ? "Copiado!" : "Copiar"}
                        </button>
                      </div>
                      <Button
                        variant="Secondary"
                        size="Large"
                        onClick={handleGenerateInvite}
                        disabled={settingsLoading === "invite"}
                      >
                        Gerar novo link
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="Secondary"
                      size="Large"
                      onClick={handleGenerateInvite}
                      disabled={settingsLoading === "invite"}
                    >
                      {settingsLoading === "invite" ? "Gerando..." : "Gerar link de convite"}
                    </Button>
                  )}
                </section>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Mobile action bar */}
      {showActionBar && (
        <div className="lg:hidden bg-bg-sidebar border-t border-border-default flex flex-col gap-[var(--space-sm)] pt-[12px] pb-[24px] px-[var(--space-lg)]">
          <div className="flex items-center gap-[var(--space-sm)]">
            <Users size={16} className="text-text-secondary shrink-0" />
            <p className="text-caption-regular text-text-secondary flex-1">
              {room.confirmedLine} de {room.lineSlots} na linha ·{" "}
              {room.confirmedGoalkeepers} de {room.goalkeeperSlots} goleiros
            </p>
          </div>
          <Button
            variant="Primary"
            size="Large"
            className="w-full"
            onClick={() => setShowStartSheet(true)}
          >
            Iniciar sala e sortear times
          </Button>
          <p className="text-caption-regular text-text-muted">
            Trava a sala e sorteia os times. Depois de iniciar, ninguém novo
            entra.
          </p>
        </div>
      )}

      {/* BottomSheet — Iniciar sala */}
      <BottomSheet
        open={showStartSheet}
        onClose={() => setShowStartSheet(false)}
      >
        <p className="text-heading-h2 text-text-primary">Iniciar a sala?</p>
        <p className="text-body-regular text-text-secondary">
          Os times serão sorteados agora com os {room.confirmedLine} jogadores
          de linha confirmados. Você ainda poderá sortear de novo até iniciar a
          1ª partida.
        </p>
        <div className="flex flex-col gap-[var(--space-md)]">
          <div className="flex gap-[var(--space-md)] items-center">
            <Lock size={18} className="shrink-0 text-text-secondary" />
            <p className="text-body-regular text-text-primary">
              Sala travada: novos pedidos vão para a lista de espera
            </p>
          </div>
          <div className="flex gap-[var(--space-md)] items-center">
            <Shuffle size={18} className="shrink-0 text-text-secondary" />
            <p className="text-body-regular text-text-primary">
              Sorteio equilibrado pelo peso de cada jogador
            </p>
          </div>
          <div className="flex gap-[var(--space-md)] items-center">
            <Hand size={18} className="shrink-0 text-text-secondary" />
            <p className="text-body-regular text-text-primary">
              Goleiros ficam fora do sorteio
            </p>
          </div>
        </div>
        <Button
          variant="Primary"
          size="Large"
          className="w-full"
          onClick={handleStart}
          disabled={isStarting}
        >
          {isStarting ? "Iniciando..." : "Iniciar sala e sortear"}
        </Button>
        <Button
          variant="Ghost"
          size="Large"
          className="w-full"
          onClick={() => setShowStartSheet(false)}
          disabled={isStarting}
        >
          Cancelar
        </Button>
        {startError && (
          <p className="text-caption-regular text-status-danger">{startError}</p>
        )}
      </BottomSheet>
    </div>
  );
}
