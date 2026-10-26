"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Shield, Shuffle, Timer } from "lucide-react";
import { Input } from "../../../components/ui/Input";
import { GoogleIcon, DiscordIcon } from "../../../components/ui/SocialIcons";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

const FEATURES = [
  { icon: Shield, label: "Só entra quem o organizador aprova" },
  { icon: Shuffle, label: "Times sorteados pelo peso de cada jogador" },
  { icon: Timer, label: "Placar e rodízio ao vivo" },
];

export function EntrarClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const oauthError = searchParams.get("error");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        router.push("/inicio");
        return;
      }

      const data = await response.json();
      const code: string = data?.error?.code ?? "";

      if (response.status === 401 && code === "INVALID_CREDENTIALS") {
        setError("E-mail ou senha incorretos");
      } else if (response.status === 429) {
        setError("Muitas tentativas. Tente novamente em 15 minutos.");
      } else {
        setError("Ocorreu um erro. Tente novamente.");
      }
    } catch {
      setError("Ocorreu um erro. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel — branding (lg+ only) */}
      <div className="relative hidden w-[720px] shrink-0 flex-col justify-between overflow-hidden bg-bg-sidebar px-20 py-14 lg:flex">
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
          <Image src="/logo-futix.webp" alt="Futix" width={40} height={40} />
          <span className="text-heading-h2 text-text-primary">Futix</span>
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
                <span className="text-body-strong text-text-primary">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="relative text-caption-regular text-text-muted">
          Grátis, feito para o futebol da comunidade.
        </p>
      </div>

      {/* Right panel / mobile full */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex flex-1 flex-col gap-[var(--space-2xl)] overflow-hidden px-[var(--space-lg)] pb-8 pt-4 lg:items-center lg:justify-center lg:gap-[var(--space-lg)] lg:px-0 lg:pt-0">

          {/* Mobile: logo + headline (hidden on lg+) */}
          <div className="flex flex-col gap-[var(--space-lg)] lg:hidden">
            <div className="flex items-center gap-[var(--space-md)]">
              <Image
                src="/logo-futix.webp"
                alt="Futix"
                width={48}
                height={48}
                className="rounded-2xl"
              />
              <span className="text-heading-h2 text-text-primary">Futix</span>
            </div>
            <h1 className="text-heading-h1 text-text-primary">
              Seu racha, organizado.
            </h1>
            <p className="text-body-regular text-text-secondary">
              Entre, confirme presença e deixe o sorteio dos times com a gente.
            </p>
          </div>

          {/* Desktop: form heading (hidden on mobile) */}
          <div className="hidden w-[400px] flex-col gap-[var(--space-sm)] lg:flex">
            <span className="text-heading-h1 text-text-primary">Entrar</span>
            <span className="text-body-regular text-text-secondary">
              Bem-vindo de volta. Entre para ver suas salas.
            </span>
          </div>

          {/* Form (shared mobile + desktop) */}
          <form
            onSubmit={handleSubmit}
            className="flex w-full flex-col gap-[var(--space-2xl)] lg:w-[400px] lg:gap-[var(--space-lg)]"
          >
            {/* Email + Password */}
            <div className="flex flex-col gap-[var(--space-lg)]">
              <Input
                label="E-mail"
                id="email"
                type="email"
                placeholder="voce@email.com"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
              />
              <Input
                label="Senha"
                id="password"
                type="password"
                placeholder="Sua senha"
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
              />
            </div>

            {/* Esqueci minha senha — oculto (R44) */}

            {/* Error message */}
            {(error ??
              (oauthError === "EMAIL_IN_USE_OTHER_METHOD"
                ? "Esse e-mail já tem conta. Entre com o método original e conecte este em Perfil."
                : null)) && (
              <span className="text-caption-regular text-status-danger">
                {error ??
                  "Esse e-mail já tem conta. Entre com o método original e conecte este em Perfil."}
              </span>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="h-[52px] w-full rounded-[var(--radius-md)] bg-accent-default text-body-strong text-text-on-accent disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-[var(--space-md)]">
              <div className="h-px flex-1 bg-border-default" />
              <span className="text-caption-regular text-text-muted">
                ou continue com
              </span>
              <div className="h-px flex-1 bg-border-default" />
            </div>

            {/* Social buttons */}
            <div className="flex flex-col gap-[var(--space-md)] lg:gap-[var(--space-sm)]">
              <a
                href={`${apiUrl}/auth/google`}
                className="flex h-[52px] items-center justify-center gap-[var(--space-md)] rounded-[var(--radius-md)] border border-border-default bg-bg-raised text-body-strong text-text-primary"
              >
                <GoogleIcon />
                Continuar com Google
              </a>
              <a
                href={`${apiUrl}/auth/discord`}
                className="flex h-[52px] items-center justify-center gap-[var(--space-md)] rounded-[var(--radius-md)] border border-border-default bg-bg-raised text-body-strong text-text-primary"
              >
                <DiscordIcon />
                Continuar com Discord
              </a>
            </div>

            {/* Criar conta */}
            <div className="flex items-center justify-center gap-[var(--space-xs)] text-caption-regular">
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
