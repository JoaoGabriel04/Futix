"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Shield, Shuffle, Timer } from "lucide-react";
import { useRouter } from "next/navigation";
import { Input } from "../../../components/ui/Input";
import { GoogleIcon, DiscordIcon } from "../../../components/ui/SocialIcons";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

const FEATURES = [
  { icon: Shield, label: "Só entra quem o organizador aprova" },
  { icon: Shuffle, label: "Times sorteados pelo peso de cada jogador" },
  { icon: Timer, label: "Placar e rodízio ao vivo" },
];

export function CadastroClient() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  function validate(): boolean {
    setError(null);
    setConfirmError(null);

    if (!name.trim()) {
      setError("Informe seu nome completo.");
      return false;
    }
    if (!email.includes("@") || !email.includes(".")) {
      setError("Informe um e-mail válido.");
      return false;
    }
    if (password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres com letra e número");
      return false;
    }
    if (password !== confirmPassword) {
      setConfirmError("As senhas não coincidem.");
      return false;
    }
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      if (res.ok) {
        router.push("/cadastro/perfil");
        return;
      }

      const data = await res.json().catch(() => ({}));
      const code: string = data?.error?.code ?? "";

      if (code === "EMAIL_TAKEN") {
        setError("Este e-mail já está em uso");
      } else if (code === "WEAK_PASSWORD") {
        setError("A senha deve ter pelo menos 8 caracteres com letra e número");
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
        <div className="flex flex-1 flex-col gap-[var(--space-lg)] overflow-hidden bg-bg-app pt-4 px-[var(--space-lg)] pb-[var(--space-2xl)] lg:items-center lg:justify-center lg:px-0 lg:pt-0 lg:bg-transparent">

          {/* Mobile: logo (hidden on lg+) */}
          <div className="flex items-center gap-[var(--space-sm)] lg:hidden">
            <Image
              src="/logo-futix.webp"
              alt="Futix"
              width={32}
              height={32}
              className="rounded-xl"
            />
            <span className="text-body-strong text-text-primary">Futix</span>
          </div>

          {/* Heading block */}
          <div className="flex flex-col gap-[var(--space-sm)] lg:w-[400px]">
            <h1 className="text-heading-h1 text-text-primary">Criar conta</h1>
            <p className="text-body-regular text-text-secondary lg:hidden">
              Leva menos de um minuto. A aprovação só acontece quando você pede
              para entrar numa sala.
            </p>
            <p className="hidden text-body-regular text-text-secondary lg:block">
              Cadastro livre. A aprovação só acontece quando você pede para
              entrar numa sala.
            </p>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="flex w-full flex-col gap-[var(--space-lg)] lg:w-[400px]"
          >
            <Input
              label="Nome"
              id="name"
              type="text"
              placeholder="Seu nome completo"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <Input
              label="E-mail"
              id="email"
              type="email"
              placeholder="voce@email.com"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            {/* Senha + Confirmar senha: stacked on mobile, side-by-side on lg+ */}
            <div className="flex flex-col gap-[var(--space-lg)] lg:flex-row lg:gap-[var(--space-md)]">
              <Input
                className="lg:flex-1"
                label="Senha"
                id="password"
                type="password"
                placeholder="Mínimo de 8 caracteres"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <div className="flex flex-col gap-[var(--space-sm)] lg:flex-1">
                <Input
                  label="Confirmar senha"
                  id="confirmPassword"
                  type="password"
                  placeholder="Repita a senha"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                {confirmError && (
                  <span className="text-caption-regular text-status-danger">
                    {confirmError}
                  </span>
                )}
              </div>
            </div>

            {/* Inline error */}
            {error && (
              <span className="text-caption-regular text-status-danger">
                {error}
              </span>
            )}

            {/* Termos */}
            <p className="text-caption-regular text-text-muted">
              Ao criar a conta você concorda com os termos de uso da plataforma.
            </p>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="h-[52px] w-full rounded-[var(--radius-md)] bg-accent-default text-body-strong text-text-on-accent disabled:opacity-60"
            >
              {loading ? "Criando conta..." : "Criar conta"}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-[var(--space-md)]">
              <div className="h-px flex-1 bg-border-default" />
              <span className="text-caption-regular text-text-muted">
                ou continue com
              </span>
              <div className="h-px flex-1 bg-border-default" />
            </div>

            {/* Social buttons: stacked on mobile, side-by-side on lg+ */}
            <div className="flex flex-col gap-[var(--space-md)] lg:flex-row lg:gap-[var(--space-sm)]">
              <a
                href={`${apiUrl}/auth/google`}
                className="flex h-[52px] lg:flex-1 items-center justify-center gap-[var(--space-md)] rounded-[var(--radius-md)] border border-border-default bg-bg-raised text-body-strong text-text-primary"
              >
                <GoogleIcon />
                <span className="lg:hidden">Continuar com Google</span>
                <span className="hidden lg:inline">Google</span>
              </a>
              <a
                href={`${apiUrl}/auth/discord`}
                className="flex h-[52px] lg:flex-1 items-center justify-center gap-[var(--space-md)] rounded-[var(--radius-md)] border border-border-default bg-bg-raised text-body-strong text-text-primary"
              >
                <DiscordIcon />
                <span className="lg:hidden">Continuar com Discord</span>
                <span className="hidden lg:inline">Discord</span>
              </a>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-center gap-[var(--space-xs)] text-caption-regular">
              <span className="text-text-secondary">Já tem conta?</span>
              <Link href="/entrar" className="font-semibold text-accent-default">
                Entrar
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
