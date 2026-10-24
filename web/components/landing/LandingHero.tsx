import Link from "next/link";
import { Check } from "lucide-react";
import { PhoneMock } from "./PhoneMock";

export function LandingHero() {
  return (
    <section className="relative flex flex-col overflow-hidden px-5 pb-10 pt-6 md:flex-row md:items-center md:gap-[var(--space-3xl)] md:px-[120px] md:pb-[72px] md:pt-14">
      {/* Decorative circle + glow — mobile */}
      <div
        aria-hidden
        className="pointer-events-none absolute md:hidden"
        style={{
          left: "-30px",
          top: "260px",
          width: "420px",
          height: "420px",
          borderRadius: "50%",
          border: "1px solid rgba(158,242,36,0.14)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute md:hidden"
        style={{
          left: "-60px",
          top: "240px",
          width: "520px",
          height: "520px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(158,242,36,0.09) 0%, transparent 65%)",
        }}
      />
      {/* Decorative circle + glow — desktop */}
      <div
        aria-hidden
        className="pointer-events-none absolute hidden md:block"
        style={{
          left: "760px",
          top: "40px",
          width: "640px",
          height: "640px",
          borderRadius: "50%",
          border: "1px solid rgba(158,242,36,0.14)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute hidden md:block"
        style={{
          left: "640px",
          top: "-120px",
          width: "900px",
          height: "900px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(158,242,36,0.09) 0%, transparent 65%)",
        }}
      />

      {/* Text column */}
      <div className="relative flex flex-col gap-5 md:flex-1 md:gap-[var(--space-xl)]">
        {/* Badge */}
        <div className="inline-flex self-start items-center gap-[var(--space-sm)] rounded-full border border-accent-default bg-accent-subtle px-3 py-1.5">
          <Check size={14} className="shrink-0 text-accent-default" />
          <span className="text-[13px] font-semibold leading-[18px] text-accent-default">
            Grátis, feito para o futebol da comunidade
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-[44px] font-bold leading-[50px] text-text-primary md:text-[72px] md:leading-[78px]">
          {"Seu racha, "}
          <span style={{ color: "var(--color-accent-default)" }}>organizado.</span>
        </h1>

        {/* Description */}
        <p className="text-[16px] leading-6 text-text-secondary md:text-[19px] md:leading-[30px]">
          Salas por partida, aprovação do organizador, times sorteados com equilíbrio e placar ao vivo. Chega de grupo
          de WhatsApp bagunçado.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col gap-3 md:flex-row md:gap-[var(--space-md)]">
          <Link
            href="/cadastro"
            className="inline-flex w-full items-center justify-center rounded-[var(--radius-md)] bg-accent-default px-[var(--space-xl)] py-0 text-[15px] font-semibold leading-[52px] text-text-on-accent md:w-auto"
          >
            Criar conta grátis
          </Link>
          <Link
            href="/entrar"
            className="inline-flex w-full items-center justify-center rounded-[var(--radius-md)] border border-border-default bg-bg-raised px-[var(--space-xl)] py-0 text-[15px] font-semibold leading-[52px] text-text-primary md:w-auto"
          >
            Já tenho conta
          </Link>
        </div>

        {/* Trust badges */}
        <div className="flex flex-col gap-[var(--space-sm)] md:flex-row md:gap-[var(--space-xl)]">
          {["Sem pagamento", "Times equilibrados", "Placar ao vivo"].map((label) => (
            <div key={label} className="flex items-center gap-[var(--space-sm)]">
              <Check size={16} className="shrink-0 text-text-secondary" />
              <span className="text-[13px] font-semibold leading-[18px] text-text-secondary">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Phone mock */}
      <div className="relative mt-6 h-[600px] w-full shrink-0 md:mt-0 md:h-[740px] md:w-[600px]">
        <PhoneMock />
      </div>
    </section>
  );
}
