import Image from "next/image";
import Link from "next/link";

export function LandingNav() {
  return (
    <nav className="flex shrink-0 items-center gap-[var(--space-lg)] overflow-hidden px-5 pb-3 pt-12 md:px-[120px] md:py-5">
      <Link href="/" className="flex shrink-0 items-center gap-[var(--space-sm)]">
        <Image src="/logo-futix.png" alt="Futix" width={36} height={36} />
        <span className="text-[17px] font-semibold leading-[22px] text-text-primary">Futix</span>
      </Link>

      <div className="flex-1" />

      <div className="hidden items-center gap-[var(--space-2xl)] text-[15px] font-semibold text-text-secondary md:flex">
        <a href="#como-funciona">Como funciona</a>
        <a href="#recursos">Recursos</a>
        <a href="#como-funciona">Para quem organiza</a>
      </div>

      <div className="hidden flex-1 md:block" />

      <div className="flex items-center gap-[var(--space-sm)]">
        <Link
          href="/entrar"
          className="inline-flex h-9 items-center justify-center px-[var(--space-lg)] text-[13px] font-semibold leading-[18px] text-accent-default rounded-[var(--radius-sm)]"
        >
          Entrar
        </Link>
        <Link
          href="/cadastro"
          className="hidden h-9 items-center justify-center rounded-[var(--radius-sm)] bg-accent-default px-[var(--space-lg)] text-[13px] font-semibold leading-[18px] text-text-on-accent md:inline-flex"
        >
          Criar conta
        </Link>
      </div>
    </nav>
  );
}
