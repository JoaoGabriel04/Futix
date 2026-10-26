import Image from "next/image";
import Link from "next/link";

export function LandingFooter() {
  return (
    <footer className="flex flex-col gap-[var(--space-lg)] border-t border-border-default px-5 pb-10 pt-8 md:flex-row md:items-center md:px-[120px] md:py-8">
      <Link href="/" className="flex items-center gap-[var(--space-sm)] shrink-0">
        <Image src="/logo-futix.webp" alt="Futix" width={28} height={28} />
        <span className="text-[15px] font-semibold leading-[22px] text-text-primary">Futix</span>
      </Link>
      <div className="hidden flex-1 md:block" />
      <p className="text-[13px] leading-[18px] text-text-muted">
        Feito para o futebol da comunidade. Sem custo, sem anúncios.
      </p>
    </footer>
  );
}
