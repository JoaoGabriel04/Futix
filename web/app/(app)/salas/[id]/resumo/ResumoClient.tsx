"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { Summary } from "@fut/shared";
import { useRoom } from "../../../../../hooks/useRoom";
import { useRoomSummary } from "../../../../../hooks/useRoomSummary";
import { Avatar } from "../../../../../components/ui/Avatar";
import { Button } from "../../../../../components/ui/Button";

// ── helpers ──────────────────────────────────────────────────────────────────

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? "";
  return (first + second).toUpperCase();
}

function formatPlayTime(seconds: number): string {
  if (seconds >= 3600) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return m > 0 ? `${h}h${String(m).padStart(2, "0")}min` : `${h}h`;
  }
  if (seconds >= 60) {
    const m = Math.floor(seconds / 60);
    return `${m}min`;
  }
  return `${seconds}s`;
}

function buildShareText(room: { title: string }, summary: Summary): string {
  const lines: string[] = [
    `${room.title} · Encerrado`,
    `${summary.totalMatches} partida${summary.totalMatches !== 1 ? "s" : ""} · ${summary.totalGoals} gol${summary.totalGoals !== 1 ? "s" : ""} · ${formatPlayTime(summary.totalPlaySeconds)}`,
    "",
    "Artilharia:",
  ];
  if (summary.scorers.length === 0) {
    lines.push("Sem gols registrados.");
  } else {
    lines.push(...summary.scorers.slice(0, 5).map((s, i) => `${i + 1}. ${s.name} — ${s.goals} gol${s.goals !== 1 ? "s" : ""}`));
  }
  if (summary.assists.length > 0) {
    lines.push("", "Assistências:");
    summary.assists.slice(0, 5).forEach((a, i) => {
      lines.push(`${i + 1}. ${a.name} — ${a.assists} assistência${a.assists !== 1 ? "s" : ""}`);
    });
  }
  return lines.join("\n");
}

// ── component ─────────────────────────────────────────────────────────────────

export function ResumoClient({ id }: { id: string }) {
  const router = useRouter();
  const { room, isLoading: roomLoading } = useRoom(id);
  const { summary, isLoading } = useRoomSummary(id);
  const [sharing, setSharing] = useState(false);

  if (isLoading || roomLoading) {
    return <p className="text-body-regular text-text-muted p-[var(--space-lg)]">Carregando...</p>;
  }
  if (!summary || !room) {
    return <p className="text-body-regular text-text-muted p-[var(--space-lg)]">Resumo não disponível.</p>;
  }

  function handleConcluir() {
    router.push(`/salas/${id}`);
  }

  async function handleShare() {
    if (!room || !summary) return;
    setSharing(true);
    const text = buildShareText(room, summary);
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ text });
      } else {
        await navigator.clipboard.writeText(text);
      }
    } catch {
      // user cancelled or clipboard failed — silently ignore
    } finally {
      setSharing(false);
    }
  }

  const { totalMatches, totalGoals, totalPlaySeconds, scorers, assists } = summary;

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col h-full">
      {/* scrollable content */}
      <div className="flex-1 overflow-y-auto p-[var(--space-lg)] flex flex-col gap-[var(--space-lg)]">

        {/* header row */}
        <div className="flex items-center gap-[var(--space-md)]">
          <button
            onClick={() => router.push(`/salas/${id}`)}
            className="flex items-center justify-center shrink-0 text-text-primary"
            aria-label="Voltar"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="flex flex-col min-w-0">
            <p className="text-heading-h3 text-text-primary truncate">{room.title}</p>
            <p className="text-caption-regular text-text-secondary">
              Encerrado · {totalMatches} partida{totalMatches !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* stats row */}
        <div className="flex gap-[var(--space-sm)]">
          <div className="bg-bg-surface border border-border-default rounded-lg p-[var(--space-lg)] flex flex-col items-center gap-[var(--space-xs)] flex-1">
            <p className="text-heading-h2 text-text-primary">{totalMatches}</p>
            <p className="text-caption-regular text-text-secondary">partidas</p>
          </div>
          <div className="bg-bg-surface border border-border-default rounded-lg p-[var(--space-lg)] flex flex-col items-center gap-[var(--space-xs)] flex-1">
            <p className="text-heading-h2 text-text-primary">{totalGoals}</p>
            <p className="text-caption-regular text-text-secondary">gols</p>
          </div>
          <div className="bg-bg-surface border border-border-default rounded-lg p-[var(--space-lg)] flex flex-col items-center gap-[var(--space-xs)] flex-1">
            <p className="text-heading-h2 text-text-primary">{formatPlayTime(totalPlaySeconds)}</p>
            <p className="text-caption-regular text-text-secondary">de jogo</p>
          </div>
        </div>

        {/* artilharia section */}
        <div className="flex flex-col gap-[var(--space-sm)]">
          <p className="text-overline text-text-muted">Artilharia</p>
          <div className="bg-bg-surface border border-border-default rounded-lg p-[var(--space-lg)] flex flex-col gap-[var(--space-md)]">
            {scorers.length === 0 ? (
              <p className="text-caption-regular text-text-muted">Sem gols registrados.</p>
            ) : (
              scorers.map((scorer, index) => (
                <div key={scorer.userId} className="flex items-center gap-[var(--space-md)]">
                  <p className="text-body-strong text-text-muted w-[20px] shrink-0">{index + 1}</p>
                  <Avatar iniciais={initials(scorer.name)} size="MD" />
                  <p className="text-body-strong text-text-primary flex-1 min-w-0 truncate">{scorer.name}</p>
                  <p className="text-body-strong text-accent-default shrink-0">{scorer.goals}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* assistências section */}
        <div className="flex flex-col gap-[var(--space-sm)]">
          <p className="text-overline text-text-muted">Assistências</p>
          <div className="bg-bg-surface border border-border-default rounded-lg p-[var(--space-lg)] flex flex-col gap-[var(--space-md)]">
            {assists.length === 0 ? (
              <p className="text-caption-regular text-text-muted">Sem assistências registradas.</p>
            ) : (
              assists.map((assister, index) => (
                <div key={assister.userId} className="flex items-center gap-[var(--space-md)]">
                  <p className="text-body-strong text-text-muted w-[20px] shrink-0">{index + 1}</p>
                  <Avatar iniciais={initials(assister.name)} size="MD" />
                  <p className="text-body-strong text-text-primary flex-1 min-w-0 truncate">{assister.name}</p>
                  <p className="text-body-strong text-accent-default shrink-0">{assister.assists}</p>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* bottom action bar — sticky, outside the scroll container */}
      <div className="bg-bg-sidebar border-t border-border-default pt-[12px] pb-[24px] px-[var(--space-lg)] flex flex-col gap-[var(--space-sm)] shrink-0">
        <Button variant="Primary" size="Large" className="w-full" onClick={handleConcluir}>
          Concluir
        </Button>
        <Button variant="Ghost" size="Large" className="w-full" onClick={handleShare} disabled={sharing}>
          {sharing ? "Compartilhando..." : "Compartilhar resumo"}
        </Button>
      </div>
    </div>
  );
}
