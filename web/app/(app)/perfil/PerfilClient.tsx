"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, LogOut, Mail, Phone, Target, Trash2, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { apiFetch } from "../../../lib/api";
import { useMe } from "../../../hooks/useMe";

function isConnected(
  connections: { google: boolean; discord: boolean; password: boolean } | undefined,
  provider: "GOOGLE" | "DISCORD",
): boolean {
  if (!connections) return false;
  return provider === "GOOGLE" ? connections.google : connections.discord;
}

function formatPhone(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function PerfilClient() {
  const router = useRouter();
  const { user, isLoading, mutate } = useMe();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isDeletingAvatar, setIsDeletingAvatar] = useState(false);

  const [dName, setDName] = useState("");
  const [dNickname, setDNickname] = useState("");
  const [dPhone, setDPhone] = useState("");
  const [dPosition, setDPosition] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setDName(user.name ?? "");
      setDNickname(user.nickname ?? "");
      setDPhone(user.phone ?? "");
      setDPosition(user.preferredPosition ?? "");
    }
  }, [user]);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      toast.error("Formato inválido. Use JPG, PNG ou WebP.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 2MB.");
      return;
    }
    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("avatar", file);
      await apiFetch<unknown>("/me/avatar", { method: "POST", body: formData });
      await mutate();
      toast.success("Foto atualizada.");
    } catch {
      toast.error("Erro ao atualizar foto.");
    } finally {
      setIsUploadingAvatar(false);
      e.target.value = "";
    }
  }

  async function handleDeleteAvatar() {
    setIsDeletingAvatar(true);
    try {
      await apiFetch<unknown>("/me/avatar", { method: "DELETE" });
      await mutate();
      toast.success("Foto removida.");
    } catch {
      toast.error("Erro ao remover foto.");
    } finally {
      setIsDeletingAvatar(false);
    }
  }

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // continue to clear cache and redirect even on error
    }
    await mutate(undefined, { revalidate: false });
    router.push("/entrar");
  }

  async function handleDesktopSave() {
    setIsSaving(true);
    try {
      await apiFetch<unknown>("/me", {
        method: "PATCH",
        body: JSON.stringify({
          name: dName,
          nickname: dNickname || undefined,
          phone: dPhone || undefined,
          preferredPosition: dPosition || undefined,
        }),
      });
      await mutate();
      toast.success("Perfil atualizado.");
    } catch {
      toast.error("Erro ao salvar. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleDesktopCancel() {
    if (user) {
      setDName(user.name ?? "");
      setDNickname(user.nickname ?? "");
      setDPhone(user.phone ?? "");
      setDPosition(user.preferredPosition ?? "");
    }
  }

  if (isLoading) return <p className="text-text-muted p-[var(--space-lg)]">Carregando...</p>;

  const iniciais = (user?.name ?? "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="w-full">
      {/* Mobile — lg:hidden */}
      <div className="lg:hidden flex flex-col pt-[20px] pb-[24px] px-[16px] gap-[16px]">
        {/* Hero card */}
        <div className="bg-bg-surface border border-border-default rounded-[var(--radius-xl)] px-[16px] py-[20px] flex flex-col gap-[16px] items-center">
          <div className="relative size-[96px]">
            <div className="absolute inset-0 bg-accent-subtle border-2 border-accent-default rounded-full flex items-center justify-center overflow-hidden">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={iniciais} className="size-full object-cover" />
              ) : (
                <span className="text-[33px] font-bold text-accent-default">{iniciais || "?"}</span>
              )}
            </div>
            <button
              type="button"
              aria-label="Alterar foto"
              onClick={() => fileInputRef.current?.click()}
              className="absolute size-[34px] left-[62px] top-[62px] bg-accent-default rounded-full flex items-center justify-center"
              style={{ border: "3px solid var(--color-bg-app)" }}
            >
              <Camera size={16} className="text-text-on-accent" />
            </button>
          </div>

          <p className="text-[22px] font-bold text-text-primary">{user?.name}</p>
          {user?.nickname && (
            <p className="text-[15px] text-text-secondary">@{user.nickname}</p>
          )}

          {user?.preferredPosition && (
            <div className="flex gap-[8px] items-center">
              <span className="bg-accent-default border border-accent-default rounded-full px-[12px] py-[8px] text-[13px] font-semibold text-text-on-accent">
                {user.preferredPosition}
              </span>
              {user.preferredPosition !== "Goleiro" && (
                <span className="bg-bg-raised border border-border-default rounded-full px-[12px] py-[8px] text-[13px] font-semibold text-text-primary">
                  Jogador de linha
                </span>
              )}
            </div>
          )}

          <div className="flex gap-[12px] w-full">
            <Button
              variant="Secondary"
              size="Small"
              className="flex-1"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
            >
              {isUploadingAvatar ? "Enviando..." : "Alterar foto"}
            </Button>
            <Button
              variant="Primary"
              size="Small"
              className="flex-1"
              onClick={() => router.push("/perfil/editar")}
            >
              Editar perfil
            </Button>
          </div>
        </div>

        {/* Dados pessoais */}
        <p className="text-[11px] font-semibold tracking-[0.66px] uppercase text-text-muted">
          DADOS PESSOAIS
        </p>

        <div className="bg-bg-surface border border-border-default rounded-[var(--radius-lg)] px-[16px] py-[8px]">
          <div className="flex gap-[12px] items-center py-[12px]">
            <User size={18} className="text-text-muted shrink-0" />
            <div className="flex flex-col gap-[4px] flex-1">
              <span className="text-[13px] text-text-muted">Nome</span>
              <span className="text-[15px] font-semibold text-text-primary">{user?.name ?? "—"}</span>
            </div>
          </div>
          <div className="h-px bg-border-default" />
          <div className="flex gap-[12px] items-center py-[12px]">
            <Target size={18} className="text-text-muted shrink-0" />
            <div className="flex flex-col gap-[4px] flex-1">
              <span className="text-[13px] text-text-muted">Posição preferida</span>
              <span className="text-[15px] font-semibold text-text-primary">{user?.preferredPosition ?? "—"}</span>
            </div>
          </div>
          <div className="h-px bg-border-default" />
          <div className="flex gap-[12px] items-center py-[12px]">
            <Phone size={18} className="text-text-muted shrink-0" />
            <div className="flex flex-col gap-[4px] flex-1">
              <span className="text-[13px] text-text-muted">Celular</span>
              <span className="text-[15px] font-semibold text-text-primary">{user?.phone ?? "—"}</span>
            </div>
          </div>
          <div className="h-px bg-border-default" />
          <div className="flex gap-[12px] items-center py-[12px]">
            <Mail size={18} className="text-text-muted shrink-0" />
            <div className="flex flex-col gap-[4px] flex-1">
              <span className="text-[13px] text-text-muted">E-mail</span>
              <span className="text-[15px] font-semibold text-text-primary">{user?.email ?? "—"}</span>
            </div>
          </div>
        </div>

        {/* Contas conectadas */}
        <p className="text-[11px] font-semibold tracking-[0.66px] uppercase text-text-muted">
          CONTAS CONECTADAS
        </p>

        <div className="bg-bg-surface border border-border-default rounded-[var(--radius-lg)] px-[16px] py-[8px]">
          <div className="flex gap-[12px] items-center py-[12px]">
            <div className="size-[32px] bg-bg-raised rounded-full flex items-center justify-center shrink-0">
              <span className="text-[13px] font-semibold text-text-secondary">G</span>
            </div>
            <span className="flex-1 text-[15px] font-semibold text-text-primary">Google</span>
            {isConnected(user?.connections, "GOOGLE") ? (
              <span className="bg-status-success-subtle px-[8px] py-[2px] rounded-full text-[13px] font-semibold text-status-success">
                Conectado
              </span>
            ) : (
              <a
                href={`${apiUrl}/auth/google?link=1`}
                className="text-[13px] font-semibold text-accent-default"
              >
                Conectar
              </a>
            )}
          </div>
          <div className="h-px bg-border-default" />
          <div className="flex gap-[12px] items-center py-[12px]">
            <div className="size-[32px] bg-bg-raised rounded-full flex items-center justify-center shrink-0">
              <span className="text-[13px] font-semibold text-text-secondary">D</span>
            </div>
            <span className="flex-1 text-[15px] font-semibold text-text-primary">Discord</span>
            {isConnected(user?.connections, "DISCORD") ? (
              <span className="bg-status-success-subtle px-[8px] py-[2px] rounded-full text-[13px] font-semibold text-status-success">
                Conectado
              </span>
            ) : (
              <a
                href={`${apiUrl}/auth/discord?link=1`}
                className="text-[13px] font-semibold text-accent-default"
              >
                Conectar
              </a>
            )}
          </div>
          <div className="h-px bg-border-default" />
          <div className="flex gap-[12px] items-center py-[12px]">
            <div className="size-[32px] bg-bg-raised rounded-full flex items-center justify-center shrink-0">
              <Mail size={16} className="text-text-secondary" />
            </div>
            <span className="flex-1 text-[15px] font-semibold text-text-primary">E-mail e senha</span>
            <Link
              href="/perfil/editar"
              className="text-[13px] font-semibold text-accent-default"
            >
              {user?.connections?.password ? "Alterar senha" : "Criar senha"}
            </Link>
          </div>
        </div>

        {/* Logout */}
        <Button variant="Danger" size="Large" className="w-full py-[14px]" onClick={handleLogout}>
          <LogOut size={18} />
          Sair da conta
        </Button>
      </div>

      {/* Desktop — hidden lg:flex */}
      <div className="hidden lg:flex flex-col px-[48px] py-[40px] gap-[20px] flex-1">
        {/* Header */}
        <div>
          <h1 className="text-[28px] font-bold text-text-primary">Perfil</h1>
          <p className="text-[15px] text-text-secondary mt-[4px]">
            Seus dados aparecem para os organizadores das salas em que você pede para entrar.
          </p>
        </div>

        {/* Two-column row */}
        <div className="flex gap-[20px] items-start">
          {/* Left column — avatar card */}
          <div className="w-[360px] shrink-0">
            <div className="bg-bg-surface border border-border-default rounded-[var(--radius-lg)] p-[20px] flex flex-col gap-[16px] items-center">
              <div className="relative size-[128px]">
                <div className="absolute inset-0 bg-accent-subtle border-2 border-accent-default rounded-full flex items-center justify-center overflow-hidden">
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt={iniciais} className="size-full object-cover" />
                  ) : (
                    <span className="text-[44px] font-bold text-accent-default">{iniciais || "?"}</span>
                  )}
                </div>
                <button
                  type="button"
                  aria-label="Alterar foto"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute size-[38px] left-[90px] top-[90px] bg-accent-default rounded-full flex items-center justify-center"
                  style={{ border: "3px solid var(--color-bg-surface)" }}
                >
                  <Camera size={18} className="text-text-on-accent" />
                </button>
              </div>

              <p className="text-[22px] font-bold text-text-primary">{user?.name}</p>
              {user?.nickname && (
                <p className="text-[15px] text-text-secondary">@{user.nickname}</p>
              )}

              {user?.preferredPosition && (
                <div className="flex gap-[8px] items-center">
                  <span className="bg-accent-default border border-accent-default rounded-full px-[12px] py-[8px] text-[13px] font-semibold text-text-on-accent">
                    {user.preferredPosition}
                  </span>
                  {user.preferredPosition !== "Goleiro" && (
                    <span className="bg-bg-raised border border-border-default rounded-full px-[12px] py-[8px] text-[13px] font-semibold text-text-primary">
                      Jogador de linha
                    </span>
                  )}
                </div>
              )}

              <Button
                variant="Secondary"
                size="Small"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
              >
                {isUploadingAvatar ? "Enviando..." : "Alterar foto"}
              </Button>

              {user?.avatarUrl && (
                <button
                  type="button"
                  onClick={handleDeleteAvatar}
                  disabled={isDeletingAvatar}
                  className="flex gap-[8px] items-center justify-center w-full disabled:opacity-40"
                >
                  <Trash2 size={16} className="text-status-danger" />
                  <span className="text-[13px] font-semibold text-status-danger">
                    {isDeletingAvatar ? "Removendo..." : "Remover foto"}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Right column */}
          <div className="flex-1 flex flex-col gap-[20px]">
            {/* Dados pessoais card */}
            <div className="bg-bg-surface border border-border-default rounded-[var(--radius-lg)] p-[20px] flex flex-col gap-[16px]">
              <p className="text-[17px] font-semibold text-text-primary">Dados pessoais</p>

              <div className="flex gap-[16px]">
                <Input
                  className="flex-1"
                  label="Nome"
                  value={dName}
                  onChange={(e) => setDName(e.target.value)}
                />
                <Input
                  className="flex-1"
                  label="Apelido"
                  value={dNickname}
                  onChange={(e) => setDNickname(e.target.value)}
                />
              </div>

              <div className="flex gap-[16px]">
                <Input
                  className="flex-1"
                  label="Celular"
                  value={dPhone}
                  onChange={(e) => setDPhone(formatPhone(e.target.value))}
                />
                <Input
                  className="flex-1 opacity-60"
                  label="E-mail"
                  value={user?.email ?? ""}
                  readOnly
                />
              </div>

              <div className="flex flex-col gap-[8px]">
                <p className="text-[13px] font-semibold text-text-secondary">Posição preferida</p>
                <div className="flex gap-[8px]">
                  {["Goleiro", "Defensor", "Meia", "Atacante"].map((pos) => (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => setDPosition(pos === dPosition ? "" : pos)}
                      className={
                        pos === dPosition
                          ? "bg-accent-default border border-accent-default rounded-full px-[12px] py-[8px] text-[13px] font-semibold text-text-on-accent"
                          : "bg-bg-raised border border-border-default rounded-full px-[12px] py-[8px] text-[13px] font-semibold text-text-primary"
                      }
                    >
                      {pos}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-[12px] justify-end">
                <Button variant="Ghost" size="Large" onClick={handleDesktopCancel}>
                  Cancelar
                </Button>
                <Button
                  variant="Primary"
                  size="Large"
                  onClick={handleDesktopSave}
                  disabled={isSaving}
                >
                  {isSaving ? "Salvando..." : "Salvar alterações"}
                </Button>
              </div>
            </div>

            {/* Contas conectadas card */}
            <div className="bg-bg-surface border border-border-default rounded-[var(--radius-lg)] px-[20px] py-[4px]">
              <p className="py-[12px] text-[17px] font-semibold text-text-primary">
                Contas conectadas
              </p>
              <div className="h-px bg-border-default" />

              <div className="flex gap-[12px] items-center py-[12px]">
                <div className="size-[32px] bg-bg-raised rounded-full flex items-center justify-center shrink-0">
                  <span className="text-[13px] font-semibold text-text-secondary">G</span>
                </div>
                <span className="flex-1 text-[15px] font-semibold text-text-primary">Google</span>
                {isConnected(user?.connections, "GOOGLE") ? (
                  <span className="bg-status-success-subtle px-[8px] py-[2px] rounded-full text-[13px] font-semibold text-status-success">
                    Conectado
                  </span>
                ) : (
                  <a
                    href={`${apiUrl}/auth/google?link=1`}
                    className="text-[13px] font-semibold text-accent-default"
                  >
                    Conectar
                  </a>
                )}
              </div>
              <div className="h-px bg-border-default" />

              <div className="flex gap-[12px] items-center py-[12px]">
                <div className="size-[32px] bg-bg-raised rounded-full flex items-center justify-center shrink-0">
                  <span className="text-[13px] font-semibold text-text-secondary">D</span>
                </div>
                <span className="flex-1 text-[15px] font-semibold text-text-primary">Discord</span>
                {isConnected(user?.connections, "DISCORD") ? (
                  <span className="bg-status-success-subtle px-[8px] py-[2px] rounded-full text-[13px] font-semibold text-status-success">
                    Conectado
                  </span>
                ) : (
                  <a
                    href={`${apiUrl}/auth/discord?link=1`}
                    className="text-[13px] font-semibold text-accent-default"
                  >
                    Conectar
                  </a>
                )}
              </div>
              <div className="h-px bg-border-default" />

              <div className="flex gap-[12px] items-center py-[12px]">
                <div className="size-[32px] bg-bg-raised rounded-full flex items-center justify-center shrink-0">
                  <Mail size={16} className="text-text-secondary" />
                </div>
                <span className="flex-1 text-[15px] font-semibold text-text-primary">E-mail e senha</span>
                <Link
                  href="/perfil/editar"
                  className="text-[13px] font-semibold text-accent-default"
                >
                  {user?.connections?.password ? "Alterar senha" : "Criar senha"}
                </Link>
              </div>
            </div>

            {/* Logout */}
            <Button variant="Danger" size="Large" className="w-full" onClick={handleLogout}>
              <LogOut size={18} />
              Sair da conta
            </Button>
          </div>
        </div>
      </div>

      {/* Shared file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleAvatarChange}
      />
    </div>
  );
}
