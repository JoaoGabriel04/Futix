const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

export default function EntrarPage() {
  return (
    <div className="bg-bg-surface rounded-[var(--radius-lg)] p-[var(--space-3xl)] flex flex-col gap-[var(--space-xl)] w-full max-w-[390px]">
      <div className="flex flex-col gap-[var(--space-sm)]">
        <div className="flex items-center gap-[var(--space-md)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-futix-transparent.png"
            alt="Futix"
            width={44}
            height={44}
          />
          <h1 className="text-display-h1 text-text-primary">Futix</h1>
        </div>
        <p className="text-body-regular text-text-secondary">
          Organize o seu racha de futebol
        </p>
      </div>

      <div className="flex flex-col gap-[var(--space-md)]">
        <a
          href={`${apiUrl}/auth/google`}
          className="flex items-center justify-center h-[52px] px-[var(--space-xl)] rounded-[var(--radius-sm)] border border-border-default bg-bg-raised text-text-primary text-body-strong font-semibold w-full"
        >
          Entrar com Google
        </a>
        <a
          href={`${apiUrl}/auth/discord`}
          className="flex items-center justify-center h-[52px] px-[var(--space-xl)] rounded-[var(--radius-sm)] border border-border-default bg-bg-raised text-text-primary text-body-strong font-semibold w-full"
        >
          Entrar com Discord
        </a>
      </div>

      <p className="text-caption-regular text-text-muted text-center">
        Ao entrar, você concorda com as regras do racha.
      </p>
    </div>
  );
}
