"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import * as RadixSwitch from "@radix-ui/react-switch";
import { Button } from "../../../../../components/ui/Button";
import { StepperRow } from "../../../../../components/domain/StepperRow";
import { useRoom } from "../../../../../hooks/useRoom";
import { apiFetch } from "../../../../../lib/api";

interface AjustesClientProps {
  id: string;
}

export function AjustesClient({ id }: AjustesClientProps) {
  const router = useRouter();
  const { room, isLoading, mutate } = useRoom(id);

  // Seção 1 — Formato
  const [lineSlots, setLineSlots] = useState<number | null>(null);
  const [teamSize, setTeamSize] = useState<number | null>(null);
  const [goalkeeperSlots, setGoalkeeperSlots] = useState<number | null>(null);

  // Seção 2 — Regras
  const [requireApproval, setRequireApproval] = useState<boolean | null>(null);

  // Seção 4 — Co-organizadores
  const [selectedCoOrgUserId, setSelectedCoOrgUserId] = useState<string>("");

  // Loading state por ação
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  if (isLoading) {
    return (
      <p className="text-body-regular text-text-muted p-[var(--space-lg)]">Carregando...</p>
    );
  }

  if (!room) {
    return (
      <p className="text-body-regular text-text-muted p-[var(--space-lg)]">
        Sala não encontrada.
      </p>
    );
  }

  const myMember = room.myMember;
  const isOrganizer = myMember?.role === "ORGANIZER";
  const isCoOrg = myMember?.role === "CO_ORGANIZER";

  // Inicializa os valores locais a partir do room (lazy init)
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

  async function handleSaveFormato() {
    setLoadingAction("formato");
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
      setLoadingAction(null);
    }
  }

  async function handleSaveRegras() {
    setLoadingAction("regras");
    try {
      await apiFetch(`/rooms/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ requireApproval: currentRequireApproval }),
      });
      await mutate();
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleLock() {
    setLoadingAction("lock");
    try {
      await apiFetch(`/rooms/${id}/lock`, { method: "POST" });
      await mutate();
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleUnlock() {
    setLoadingAction("unlock");
    try {
      await apiFetch(`/rooms/${id}/unlock`, { method: "POST" });
      await mutate();
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleCancel() {
    const confirmed = window.confirm(
      "Tem certeza que deseja cancelar a sala? Essa ação não pode ser desfeita.",
    );
    if (!confirmed) return;
    setLoadingAction("cancel");
    try {
      await apiFetch(`/rooms/${id}/cancel`, { method: "POST" });
      router.push("/inicio");
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleAddCoOrg() {
    if (!selectedCoOrgUserId) return;
    setLoadingAction(`add-coorg-${selectedCoOrgUserId}`);
    try {
      await apiFetch(`/rooms/${id}/co-organizers/${selectedCoOrgUserId}`, {
        method: "PUT",
      });
      setSelectedCoOrgUserId("");
      await mutate();
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleRemoveCoOrg(userId: string) {
    setLoadingAction(`remove-coorg-${userId}`);
    try {
      await apiFetch(`/rooms/${id}/co-organizers/${userId}`, {
        method: "DELETE",
      });
      await mutate();
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-[var(--space-lg)] lg:p-[var(--space-3xl)] flex flex-col gap-[var(--space-3xl)]">
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
        <h1 className="text-heading-h2 text-text-primary flex-1 truncate">Ajustes da sala</h1>
      </div>

      {/* Seção 1 — Formato da partida (só quando OPEN) */}
      {room.status === "OPEN" && (
        <section className="flex flex-col gap-[var(--space-lg)]">
          <span className="text-overline text-text-muted">FORMATO DA PARTIDA</span>
          <StepperRow
            titulo="Vagas de linha"
            dica="Mínimo 2"
            value={currentLineSlots}
            min={2}
            max={99}
            onChange={setLineSlots}
          />
          <StepperRow
            titulo="Jogadores por time"
            value={currentTeamSize}
            min={1}
            max={99}
            onChange={setTeamSize}
          />
          <StepperRow
            titulo="Vagas de goleiro"
            value={currentGoalkeeperSlots}
            min={0}
            max={20}
            onChange={setGoalkeeperSlots}
          />
          <Button
            variant="Primary"
            size="Large"
            onClick={handleSaveFormato}
            disabled={loadingAction === "formato"}
          >
            {loadingAction === "formato" ? "Salvando..." : "Salvar formato"}
          </Button>
        </section>
      )}

      {/* Seção 2 — Regras */}
      <section className="flex flex-col gap-[var(--space-lg)]">
        <span className="text-overline text-text-muted">REGRAS</span>
        <div className="flex items-center justify-between gap-[var(--space-lg)]">
          <div className="flex flex-col gap-[var(--space-xs)]">
            <span className="text-body-strong text-text-primary">Aprovação obrigatória</span>
            <span className="text-caption-regular text-text-secondary">
              Novos jogadores precisam de aprovação
            </span>
          </div>
          <RadixSwitch.Root
            checked={currentRequireApproval}
            onCheckedChange={setRequireApproval}
            className="relative inline-flex h-[28px] w-[48px] shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent bg-border-default transition-colors data-[state=checked]:bg-accent-default focus:outline-none focus:ring-2 focus:ring-accent-default focus:ring-offset-2"
            aria-label="Aprovação obrigatória"
          >
            <RadixSwitch.Thumb className="pointer-events-none block h-[20px] w-[20px] translate-x-[2px] rounded-full bg-white shadow-md transition-transform data-[state=checked]:translate-x-[22px]" />
          </RadixSwitch.Root>
        </div>
        <Button
          variant="Primary"
          size="Large"
          onClick={handleSaveRegras}
          disabled={loadingAction === "regras"}
        >
          {loadingAction === "regras" ? "Salvando..." : "Salvar"}
        </Button>
      </section>

      {/* Seção 3 — Status da sala */}
      <section className="flex flex-col gap-[var(--space-lg)]">
        <span className="text-overline text-text-muted">STATUS DA SALA</span>
        <div className="flex flex-col gap-[var(--space-md)]">
          {room.status === "OPEN" && (
            <Button
              variant="Secondary"
              size="Large"
              onClick={handleLock}
              disabled={loadingAction === "lock"}
            >
              {loadingAction === "lock" ? "Travando..." : "Travar sala"}
            </Button>
          )}
          {room.status === "LOCKED" && (
            <Button
              variant="Secondary"
              size="Large"
              onClick={handleUnlock}
              disabled={loadingAction === "unlock"}
            >
              {loadingAction === "unlock" ? "Destravando..." : "Destravar sala"}
            </Button>
          )}
          <Button
            variant="Danger"
            size="Large"
            onClick={handleCancel}
            disabled={loadingAction === "cancel"}
          >
            {loadingAction === "cancel" ? "Cancelando..." : "Cancelar sala"}
          </Button>
        </div>
      </section>

      {/* Seção 4 — Co-organizadores (apenas para ORGANIZER e CO_ORGANIZER) */}
      {(isOrganizer || isCoOrg) && (
        <section className="flex flex-col gap-[var(--space-lg)]">
          <span className="text-overline text-text-muted">CO-ORGANIZADORES</span>

          {/* Lista de co-orgs */}
          <div className="flex flex-col gap-[var(--space-sm)]">
            {coOrganizers.length === 0 ? (
              <p className="text-body-regular text-text-muted">Nenhum co-organizador.</p>
            ) : (
              coOrganizers.map((m) => (
                <div
                  key={m.id}
                  className="bg-bg-surface border border-border-default rounded-lg flex items-center justify-between px-[var(--space-lg)] py-[var(--space-md)]"
                >
                  <span className="text-body-regular text-text-primary">{m.user.name}</span>
                  {isOrganizer && (
                    <button
                      type="button"
                      aria-label={`Remover ${m.user.name} como co-organizador`}
                      disabled={loadingAction === `remove-coorg-${m.userId}`}
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

          {/* Adicionar co-org (apenas ORGANIZER) */}
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
                onChange={(e) => setSelectedCoOrgUserId(e.target.value)}
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
                disabled={!selectedCoOrgUserId || loadingAction?.startsWith("add-coorg-")}
              >
                {loadingAction?.startsWith("add-coorg-") ? "Adicionando..." : "Adicionar co-organizador"}
              </Button>
            </div>
          )}

          {isOrganizer && confirmedNonOrgs.length === 0 && (
            <p className="text-caption-regular text-text-muted">
              Não há membros confirmados disponíveis para adicionar.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
