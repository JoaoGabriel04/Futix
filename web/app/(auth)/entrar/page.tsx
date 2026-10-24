"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Shield, Shuffle, Timer } from "lucide-react";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

const FEATURES = [
  { icon: Shield, label: "Só entra quem o organizador aprova" },
  { icon: Shuffle, label: "Times sorteados pelo peso de cada jogador" },
  { icon: Timer, label: "Placar e rodízio ao vivo" },
];

export default function EntrarPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
  }

  return (
    <div className="flex min-h-screen">
      {/* ── Left panel — branding (desktop only) ───────────────────── */}
      <div className="relative hidden w-[720px] shrink-0 flex-col justify-between overflow-hidden bg-bg-sidebar px-20 py-14 md:flex">
        {/* Decorative circles */}
        <div
          aria-hidden
          className="pointer-events-none absolute"
          style={{
            left: "300px",
            top: "420px",
            width: "560px",
            height: "560px",
            borderRadius: "50%",
            border: "1px solid rgba(158,242,36,0.15)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute"
          style={{
            left: "240px",
            top: "360px",
            width: "780px",
            height: "780px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(158,242,36,0.10) 0%, transparent 65%)",
          }}
        />

        {/* Logo */}
        <div className="relative flex items-center gap-[var(--space-sm)]">
          <Image src="/logo-futix.png" alt="Futix" width={40} height={40} />
          <span className="text-[22px] font-bold leading-[28px] text-text-primary">
            Futix
          </span>
        </div>

        {/* Headline + features */}
        <div className="relative flex flex-col gap-[var(--space-xl)]">
          <h1 className="w-[560px] text-[56px] font-bold leading-[62px] text-text-primary">
            {"Seu racha, "}
            <span style={{ color: "var(--color-accent-default)" }}>
              organizado.
            </span>
          </h1>
          <p className="w-[520px] text-[18px] leading-[28px] text-text-secondary">
            Salas por partida, aprovação do organizador e times sorteados com
            equilíbrio.
          </p>
          <div className="flex flex-col gap-[var(--space-md)]">
            {FEATURES.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-[var(--space-md)]">
                <div className="flex shrink-0 size-9 items-center justify-center rounded-[var(--radius-md)] bg-accent-subtle">
                  <Icon size={18} className="text-accent-default" />
                </div>
                <span className="text-[15px] font-semibold leading-[22px] text-text-primary">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="relative text-[13px] leading-[18px] text-text-muted">
          Grátis, feito para o futebol da comunidade.
        </p>
      </div>

      {/* ── Right panel / mobile full ────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex flex-1 flex-col gap-[var(--space-2xl)] overflow-hidden px-[var(--space-lg)] pb-8 pt-4 md:items-center md:justify-center md:gap-[var(--space-lg)] md:px-0 md:pt-0">

          {/* Mobile: logo + headline (hidden on desktop) */}
          <div className="flex flex-col gap-[var(--space-lg)] md:hidden">
            <div className="flex items-center gap-[var(--space-md)]">
              <Image
                src="/logo-futix.png"
                alt="Futix"
                width={48}
                height={48}
                className="rounded-2xl"
              />
              <span className="text-[22px] font-bold leading-[28px] text-text-primary">
                Futix
              </span>
            </div>
            <h1 className="text-[28px] font-bold leading-[34px] text-text-primary">
              Seu racha, organizado.
            </h1>
            <p className="text-[15px] leading-[22px] text-text-secondary">
              Entre, confirme presença e deixe o sorteio dos times com a gente.
            </p>
          </div>

          {/* Desktop: form heading (hidden on mobile) */}
          <div className="hidden w-[400px] flex-col gap-[var(--space-sm)] md:flex">
            <span className="text-[36px] font-bold leading-[42px] text-text-primary">
              Entrar
            </span>
            <span className="text-[15px] leading-[22px] text-text-secondary">
              Bem-vindo de volta. Entre para ver suas salas.
            </span>
          </div>

          {/* Form (shared mobile + desktop) */}
          <form
            onSubmit={handleSubmit}
            className="flex w-full flex-col gap-[var(--space-2xl)] md:w-[400px] md:gap-[var(--space-lg)]"
          >
            {/* Email + Password */}
            <div className="flex flex-col gap-[var(--space-lg)]">
              <div className="flex flex-col gap-[var(--space-sm)]">
                <label className="text-[13px] font-semibold leading-[18px] text-text-secondary">
                  E-mail
                </label>
                <input
                  type="email"
                  placeholder="voce@email.com"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-[52px] w-full rounded-[var(--radius-md)] border border-border-default bg-bg-surface px-[var(--space-lg)] text-[15px] leading-[22px] text-text-primary placeholder:text-text-muted outline-none focus:border-accent-default"
                />
              </div>
              <div className="flex flex-col gap-[var(--space-sm)]">
                <label className="text-[13px] font-semibold leading-[18px] text-text-secondary">
                  Senha
                </label>
                <input
                  type="password"
                  placeholder="Sua senha"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-[52px] w-full rounded-[var(--radius-md)] border border-border-default bg-bg-surface px-[var(--space-lg)] text-[15px] leading-[22px] text-text-primary placeholder:text-text-muted outline-none focus:border-accent-default"
                />
              </div>
            </div>

            {/* Esqueci minha senha (desktop only) */}
            <div className="hidden justify-end md:flex">
              <button
                type="button"
                className="text-[13px] font-semibold leading-[18px] text-accent-default"
              >
                Esqueci minha senha
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="h-[52px] w-full rounded-[var(--radius-md)] bg-accent-default text-[15px] font-semibold leading-[22px] text-text-on-accent"
            >
              Entrar
            </button>

            {/* Divider */}
            <div className="flex items-center gap-[var(--space-md)]">
              <div className="h-px flex-1 bg-border-default" />
              <span className="text-[13px] leading-[18px] text-text-muted">
                ou continue com
              </span>
              <div className="h-px flex-1 bg-border-default" />
            </div>

            {/* Social buttons */}
            <div className="flex flex-col gap-[var(--space-md)] md:gap-[var(--space-sm)]">
              <a
                href={`${apiUrl}/auth/google`}
                className="flex h-[52px] items-center justify-center gap-[var(--space-md)] rounded-[var(--radius-md)] border border-border-default bg-bg-raised text-[15px] font-semibold leading-[22px] text-text-primary"
              >
                <span className="flex size-6 items-center justify-center rounded-full bg-accent-subtle text-[13px] font-semibold text-accent-default md:hidden">
                  G
                </span>
                Continuar com Google
              </a>
              <a
                href={`${apiUrl}/auth/discord`}
                className="flex h-[52px] items-center justify-center gap-[var(--space-md)] rounded-[var(--radius-md)] border border-border-default bg-bg-raised text-[15px] font-semibold leading-[22px] text-text-primary"
              >
                <span className="flex size-6 items-center justify-center rounded-full bg-accent-subtle text-[13px] font-semibold text-accent-default md:hidden">
                  D
                </span>
                Continuar com Discord
              </a>
            </div>

            {/* Criar conta */}
            <div className="flex items-center justify-center gap-[var(--space-xs)] text-[13px] leading-[18px]">
              <span className="text-text-secondary">Ainda não tem conta?</span>
              <Link href="/cadastro" className="font-semibold text-accent-default">
                Criar conta
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
