import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function LandingCta() {
  return (
    <section className="px-5 py-12 md:px-[120px] md:py-20">
      <div className="flex flex-col items-start gap-[var(--space-xl)] rounded-[var(--radius-xl)] bg-accent-default px-6 py-9 md:items-center md:p-16">
        <h2 className="text-[30px] font-bold leading-[36px] text-text-on-accent md:text-center md:text-[48px] md:leading-[56px]">
          Bora organizar o próximo racha?
        </h2>
        <p className="text-[15px] leading-[22px] text-text-on-accent md:text-center md:text-[18px]">
          Crie sua conta, abra uma sala e chame a galera. É grátis.
        </p>
        <Link
          href="/cadastro"
          className="inline-flex w-full items-center justify-center gap-[var(--space-sm)] rounded-[var(--radius-md)] bg-bg-app px-[var(--space-xl)] py-4 text-[15px] font-semibold leading-[22px] text-text-primary md:w-auto"
        >
          Criar conta grátis
          <ArrowRight size={18} />
        </Link>
      </div>
    </section>
  );
}
