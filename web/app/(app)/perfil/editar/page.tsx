"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../../../components/ui/Button";
import { Input } from "../../../../components/ui/Input";
import { apiFetch } from "../../../../lib/api";
import { useMe } from "../../../../hooks/useMe";

function formatPhone(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export default function EditarPerfilPage() {
  const router = useRouter();
  const { user, isLoading, mutate } = useMe();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [phone, setPhone] = useState("");
  const [position, setPosition] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isDeletingAvatar, setIsDeletingAvatar] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name ?? "");
      setNickname(user.nickname ?? "");
      setPhone(user.phone ?? "");
      setPosition(user.preferredPosition ?? "");
    }
  }, [user]);

  const iniciais = (user?.name ?? "")
    .split(" ").filter(Boolean).slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "").join("");

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

  async function handleSave() {
    setIsSaving(true);
    try {
      await apiFetch<unknown>("/me", {
        method: "PATCH",
        body: JSON.stringify({
          name,
          nickname: nickname || undefined,
          phone: phone || undefined,
          preferredPosition: position || undefined,
        }),
      });
      await mutate();
      toast.success("Perfil atualizado.");
      router.back();
    } catch {
      toast.error("Erro ao salvar. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) return <p className="text-text-muted p-[var(--space-lg)]">Carregando...</p>;

  return (
    <div className="flex flex-col min-h-full">
      <div className="flex flex-col gap-[var(--space-lg)] pt-[var(--space-lg)] pb-[var(--space-sm)] px-[var(--space-lg)] flex-1">
        <div className="flex gap-[var(--space-md)] items-center w-full">
          <button type="button" onClick={() => router.back()} aria-label="Voltar"
            className="shrink-0">
            <ArrowLeft size={22} className="text-text-primary" />
          </button>
          <div className="flex flex-col gap-[var(--space-xs)] flex-1 min-w-0">
            <p className="text-heading-h3 text-text-primary">Editar perfil</p>
            <p className="text-caption-regular text-text-secondary">
              Seus dados aparecem para os organizadores
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-[var(--space-md)] items-center w-full">
          <div className="relative size-[96px]">
            <div className="absolute inset-0 bg-accent-subtle border-2 border-accent-default rounded-full flex items-center justify-center overflow-hidden">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={iniciais} className="size-full object-cover" />
              ) : (
                <span className="text-[33px] font-bold text-accent-default">{iniciais || "?"}</span>
              )}
            </div>
            <button type="button" aria-label="Alterar foto"
              onClick={() => fileInputRef.current?.click()}
              className="absolute size-[34px] left-[62px] top-[62px] bg-accent-default rounded-full flex items-center justify-center"
              style={{ border: "3px solid var(--color-bg-app)" }}>
              <Camera size={16} className="text-text-on-accent" />
            </button>
          </div>

          <button type="button" onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingAvatar}
            className="text-body-strong text-accent-default disabled:opacity-40">
            {isUploadingAvatar ? "Enviando..." : "Alterar foto"}
          </button>
        </div>

        <Input label="Nome" value={name} onChange={(e) => setName(e.target.value)} />
        <Input label="Apelido" value={nickname} onChange={(e) => setNickname(e.target.value)} />
        <Input label="Celular" value={phone}
          onChange={(e) => setPhone(formatPhone(e.target.value))} />

        <div className="flex flex-col gap-[var(--space-sm)]">
          <p className="text-caption-strong text-text-secondary">
            Posição preferida
          </p>
          <div className="flex flex-wrap gap-[var(--space-sm)]">
            {["Goleiro", "Defensor", "Meia", "Atacante"].map((pos) => (
              <button key={pos} type="button"
                onClick={() => setPosition(pos === position ? "" : pos)}
                className={pos === position
                  ? "bg-accent-default border border-accent-default rounded-full px-[var(--space-md)] py-[var(--space-sm)] text-caption-strong text-text-on-accent"
                  : "bg-bg-raised border border-border-default rounded-full px-[var(--space-md)] py-[var(--space-sm)] text-caption-strong text-text-primary"
                }>
                {pos}
              </button>
            ))}
          </div>
        </div>

        <button type="button" onClick={handleDeleteAvatar}
          disabled={isDeletingAvatar || !user?.avatarUrl}
          className="flex gap-[var(--space-sm)] items-center disabled:opacity-40">
          <Trash2 size={16} className="text-status-danger" />
          <span className="text-caption-strong text-status-danger">
            {isDeletingAvatar ? "Removendo..." : "Remover foto"}
          </span>
        </button>
      </div>

      <div className="shrink-0 bg-bg-sidebar border-t border-border-default pt-[var(--space-md)] pb-[var(--space-2xl)] px-[var(--space-lg)] flex flex-col gap-[var(--space-sm)]">
        <Button variant="Primary" size="Large" className="w-full"
          onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Salvando..." : "Salvar alterações"}
        </Button>
        <Button variant="Ghost" size="Large" className="w-full"
          onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>

      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp"
        capture="user" className="hidden" onChange={handleAvatarChange} />
    </div>
  );
}
