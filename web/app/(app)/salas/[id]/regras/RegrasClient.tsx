"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Info } from "lucide-react";
import { useRoom } from "../../../../../hooks/useRoom";
import { apiFetch } from "../../../../../lib/api";
import { Button } from "../../../../../components/ui/Button";
import { StepperRow } from "../../../../../components/domain/StepperRow";
import { SegmentedControl } from "../../../../../components/ui/SegmentedControl";

interface RegrasClientProps {
  id: string;
}

export function RegrasClient({ id }: RegrasClientProps) {
  const router = useRouter();
  const { room, isLoading, mutate } = useRoom(id);

  const [matchMinutes, setMatchMinutes] = useState<number | null>(null);
  const [winnerRule, setWinnerRule] = useState<string | null>(null);
  const [maxStarsPerTeam, setMaxStarsPerTeam] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (isLoading) {
    return (
      <p className="text-body-regular text-text-muted p-[var(--space-lg)]">
        Carregando...
      </p>
    );
  }

  if (!room) {
    return (
      <p className="text-body-regular text-text-muted p-[var(--space-lg)]">
        Sala não encontrada.
      </p>
    );
  }

  // Permission guard — only ORGANIZER can edit rules
  if (room.myMember?.role !== "ORGANIZER") {
    return (
      <p className="text-body-regular text-text-muted p-[var(--space-lg)]">
        Apenas o organizador pode alterar as regras.
      </p>
    );
  }

  // Derived values with lazy init from room
  const currentMatchMinutes = matchMinutes ?? room.matchMinutes ?? 10;
  const currentWinnerRule = winnerRule ?? room.winnerRule ?? "MAX_2_WINS";
  const currentMaxStarsPerTeam = maxStarsPerTeam ?? room.maxStarsPerTeam ?? 3;

  const winnerRuleCaption =
    currentWinnerRule === "ALWAYS"
      ? "O vencedor continua em quadra indefinidamente."
      : "Com 2 vitórias seguidas o time sai, como em um empate. Evita que um time vire panela.";

  async function handleSave() {
    setIsSaving(true);
    setSaveError(null);
    try {
      await apiFetch(`/rooms/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          matchMinutes: currentMatchMinutes,
          winnerRule: currentWinnerRule,
          maxStarsPerTeam: currentMaxStarsPerTeam,
        }),
      });
      await mutate();
      router.back();
    } catch (e) {
      setSaveError((e as Error).message);
      setIsSaving(false);
    }
  }

  return (
    <div className="bg-bg-app flex flex-col h-full">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-[var(--space-lg)] flex flex-col gap-[var(--space-lg)]">
        {/* Header */}
        <div className="flex items-center gap-[var(--space-md)]">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-text-secondary hover:text-text-primary transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft size={22} />
          </button>
          <div className="flex flex-col flex-1 min-w-0">
            <p className="text-heading-h3 text-text-primary">Regras da partida</p>
            <p className="text-caption-regular text-text-secondary truncate">{room.title}</p>
          </div>
        </div>

        {/* Duration section */}
        <p className="text-overline text-text-muted">DURAÇÃO</p>
        <StepperRow
          titulo="Tempo da partida"
          dica="Minutos. Termina antes com 2 gols."
          value={currentMatchMinutes}
          min={3}
          max={30}
          onChange={setMatchMinutes}
        />

        {/* Winner rule section */}
        <p className="text-overline text-text-muted">QUEM VENCE</p>
        <div className="bg-bg-surface border border-border-default rounded-lg p-[var(--space-lg)] flex flex-col gap-[var(--space-md)]">
          <p className="text-body-strong text-text-primary">Time vencedor</p>
          <SegmentedControl
            options={[
              { value: "ALWAYS", label: "Fica sempre" },
              { value: "MAX_2_WINS", label: "Até 2 vitórias seguidas" },
            ]}
            value={currentWinnerRule}
            onChange={setWinnerRule}
          />
          <p className="text-caption-regular text-text-secondary">{winnerRuleCaption}</p>
        </div>

        {/* Balance section */}
        <p className="text-overline text-text-muted">EQUILÍBRIO</p>
        <StepperRow
          titulo="Máx. de craques por time"
          dica="Usado no sorteio e nas trocas."
          value={currentMaxStarsPerTeam}
          min={1}
          onChange={setMaxStarsPerTeam}
        />
        <div className="bg-bg-surface border border-border-default rounded-md flex gap-[var(--space-md)] items-center p-[var(--space-md)]">
          <Info size={18} className="text-text-secondary shrink-0" />
          <p className="text-caption-regular text-text-secondary flex-1">
            A partida sempre termina com 2 gols. Empate só acontece se o tempo acabar com placar igual.
          </p>
        </div>

        <div className="flex-1" />
      </div>

      {/* Action bar */}
      <div className="bg-bg-sidebar border-t border-border-default pt-[var(--space-md)] pb-[var(--space-2xl)] px-[var(--space-lg)]">
        <Button
          variant="Primary"
          size="Large"
          className="w-full"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? "Salvando..." : "Salvar regras"}
        </Button>
      </div>

      {/* Save error */}
      {saveError && (
        <p className="text-caption-regular text-status-danger px-[var(--space-lg)] pb-[var(--space-md)]">
          {saveError}
        </p>
      )}
    </div>
  );
}
