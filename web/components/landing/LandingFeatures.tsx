import { Calendar, Shield, Shuffle, Timer, Repeat, Trophy } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const FEATURES: { icon: LucideIcon; title: string; desc: string }[] = [
  {
    icon: Calendar,
    title: "Salas por partida",
    desc: "Cada racha é uma sala com data, local e vagas de linha e de goleiro.",
  },
  {
    icon: Shield,
    title: "Aprovação do organizador",
    desc: "Você e até 2 co-organizadores decidem quem entra na sala.",
  },
  {
    icon: Shuffle,
    title: "Sorteio equilibrado",
    desc: "Times sorteados considerando o peso de cada jogador, sem time panela.",
  },
  {
    icon: Timer,
    title: "Placar ao vivo",
    desc: "Cronômetro, gols e assistências registrados na hora, com 2 gols encerrando.",
  },
  {
    icon: Repeat,
    title: "Rodízio automático",
    desc: "Quem perde troca jogadores com a fila e todo mundo joga.",
  },
  {
    icon: Trophy,
    title: "Resumo da sala",
    desc: "Artilharia, assistências e partidas jogadas no fim do racha.",
  },
];

export function LandingFeatures() {
  return (
    <section
      id="recursos"
      className="flex flex-col gap-[var(--space-2xl)] bg-bg-sidebar px-5 py-12 md:px-[120px] md:py-20"
    >
      {/* Header */}
      <div className="flex flex-col items-start gap-[var(--space-md)] md:items-center">
        <span className="text-[11px] font-semibold uppercase leading-[14px] tracking-[0.66px] text-accent-default">
          Recursos
        </span>
        <h2 className="text-[28px] font-bold leading-[34px] text-text-primary md:text-center md:text-[40px] md:leading-[48px]">
          Tudo o que um racha precisa
        </h2>
        <p className="text-[15px] leading-[22px] text-text-secondary md:text-center md:text-[17px] md:leading-[26px]">
          Feito para quem organiza e para quem joga.
        </p>
      </div>

      {/* Features grid — mobile: stacked; desktop: 3+3 */}
      <div className="grid grid-cols-1 gap-[var(--space-lg)] md:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="flex flex-col gap-[var(--space-md)] rounded-[var(--radius-xl)] border border-border-default bg-bg-surface p-[var(--space-xl)]"
          >
            <div className="flex size-12 items-center justify-center rounded-[var(--radius-md)] bg-accent-subtle shrink-0">
              <Icon size={24} className="text-accent-default" />
            </div>
            <span className="text-[17px] font-semibold leading-[22px] text-text-primary">{title}</span>
            <p className="text-[15px] leading-[22px] text-text-secondary">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
