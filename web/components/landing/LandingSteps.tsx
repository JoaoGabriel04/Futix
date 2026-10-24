const STEPS = [
  { num: "1", title: "Crie sua conta", desc: "Cadastro livre e rápido. A foto é opcional." },
  { num: "2", title: "Peça para entrar", desc: "Escolha se vai de jogador de linha ou goleiro." },
  { num: "3", title: "O organizador aprova", desc: "Só entra quem foi aprovado. Sem penetra." },
  { num: "4", title: "Sorteio e jogo", desc: "Times equilibrados, placar e rodízio automático." },
];

export function LandingSteps() {
  return (
    <section id="como-funciona" className="flex flex-col gap-[var(--space-2xl)] px-5 py-12 md:px-[120px] md:py-20">
      {/* Header */}
      <div className="flex flex-col items-start gap-[var(--space-md)] md:items-center">
        <span className="text-[11px] font-semibold uppercase leading-[14px] tracking-[0.66px] text-accent-default">
          Como funciona
        </span>
        <h2 className="text-[28px] font-bold leading-[34px] text-text-primary md:text-center md:text-[40px] md:leading-[48px]">
          Do pedido ao apito final
        </h2>
        <p className="text-[15px] leading-[22px] text-text-secondary md:text-center md:text-[17px] md:leading-[26px]">
          Quatro passos simples para o racha rodar sem confusão.
        </p>
      </div>

      {/* Steps grid */}
      <div className="flex flex-col gap-3 md:flex-row md:gap-[var(--space-lg)]">
        {STEPS.map(({ num, title, desc }) => (
          <div
            key={num}
            className="flex flex-1 flex-col gap-[var(--space-md)] rounded-[var(--radius-xl)] border border-border-default bg-bg-surface p-[var(--space-xl)]"
          >
            <div className="flex size-9 items-center justify-center rounded-full bg-accent-default shrink-0">
              <span className="text-[15px] font-semibold leading-[22px] text-text-on-accent">{num}</span>
            </div>
            <span className="text-[17px] font-semibold leading-[22px] text-text-primary">{title}</span>
            <p className="text-[15px] leading-[22px] text-text-secondary">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
