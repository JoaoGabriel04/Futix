"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Avatar } from "../../../components/ui/Avatar";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { apiFetch } from "../../../lib/api";
import { useMe } from "../../../hooks/useMe";

interface EditFormData {
  nome: string;
  apelido: string;
  celular: string;
  posicaoPreferida: string;
}

export default function PerfilPage() {
  const router = useRouter();
  const { user, isLoading, mutate } = useMe();
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function formatPhone(value: string): string {
    const d = value.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 2) return d.length ? `(${d}` : "";
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EditFormData>({
    defaultValues: {
      nome: "",
      apelido: "",
      celular: "",
      posicaoPreferida: "",
    },
  });

  const iniciais = (user?.name ?? "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  function handleEditClick() {
    reset({
      nome: user?.name ?? "",
      apelido: user?.nickname ?? "",
      celular: user?.phone ?? "",
      posicaoPreferida: user?.preferredPosition ?? "",
    });
    setIsEditing(true);
  }

  function handleCancelEdit() {
    setIsEditing(false);
  }

  async function onSubmit(data: EditFormData) {
    try {
      await apiFetch<unknown>("/me", {
        method: "PATCH",
        body: JSON.stringify({
          name: data.nome,
          nickname: data.apelido || undefined,
          phone: data.celular || undefined,
          preferredPosition: data.posicaoPreferida || undefined,
        }),
      });
      await mutate();
      setIsEditing(false);
      toast.success("Perfil atualizado.");
    } catch {
      toast.error("Erro ao atualizar perfil. Tente novamente.");
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Formato de imagem inválido. Use JPG, PNG ou WebP.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 2MB.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("avatar", file);
      await apiFetch<unknown>("/me/avatar", {
        method: "POST",
        body: formData,
      });
      await mutate();
      toast.success("Foto atualizada.");
    } catch {
      toast.error("Erro ao atualizar foto. Tente novamente.");
    }
  }

  async function handleLogout() {
    try {
      await apiFetch<unknown>("/auth/logout", { method: "POST" });
    } catch {
      // continue to clear cache and redirect even on error
    }
    await mutate(undefined, { revalidate: false });
    router.push("/entrar");
  }

  if (isLoading) {
    return (
      <p className="text-body-regular text-text-muted w-full max-w-xl mx-auto p-[var(--space-lg)] lg:p-[var(--space-3xl)]">Carregando...</p>
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto p-[var(--space-lg)] lg:p-[var(--space-3xl)] flex flex-col gap-[var(--space-xl)]">
      {/* Avatar + name + edit button */}
      <div className="flex flex-col gap-[var(--space-md)]">
        <div className="flex items-center gap-[var(--space-lg)]">
          <Avatar
            iniciais={iniciais || "?"}
            src={user?.avatarUrl ?? undefined}
            size="LG"
          />
          <div className="flex flex-col gap-[var(--space-xs)]">
            <span className="text-heading-h2 text-text-primary">{user?.name ?? "—"}</span>
            <span className="text-body-regular text-text-secondary">{user?.nickname ?? "—"}</span>
          </div>
        </div>

        {!isEditing && (
          <Button
            variant="Ghost"
            size="Small"
            type="button"
            onClick={() => fileInputRef.current?.click()}
          >
            Trocar foto
          </Button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleAvatarChange}
        />
      </div>

      {isEditing ? (
        /* Edit form */
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-[var(--space-lg)]">
          <Input
            label="Nome completo"
            placeholder="Ex: João da Silva"
            aria-invalid={!!errors.nome}
            {...register("nome", { required: "Nome é obrigatório" })}
          />
          {errors.nome && (
            <p className="text-caption-regular text-status-danger -mt-[var(--space-sm)]">
              {errors.nome.message}
            </p>
          )}

          <Input
            label="Apelido"
            placeholder="Ex: Joãozinho"
            {...register("apelido")}
          />

          <Input
            label="Celular"
            placeholder="Ex: (99) 99999-9999"
            {...register("celular")}
            onChange={(e) => {
              e.target.value = formatPhone(e.target.value);
              void setValue("celular", e.target.value, { shouldValidate: false });
            }}
          />

          <Input
            label="Posição preferida"
            placeholder="Ex: Meia, Atacante..."
            {...register("posicaoPreferida")}
          />

          <div className="flex flex-col gap-[var(--space-sm)]">
            <Button
              type="submit"
              variant="Primary"
              size="Large"
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? "Salvando..." : "Salvar"}
            </Button>
            <Button
              type="button"
              variant="Secondary"
              size="Large"
              onClick={handleCancelEdit}
              className="w-full"
            >
              Cancelar
            </Button>
          </div>
        </form>
      ) : (
        /* Display mode */
        <div className="flex flex-col gap-[var(--space-lg)]">
          {/* Fields */}
          <div className="flex flex-col gap-[var(--space-md)]">
            <div className="flex flex-col gap-[var(--space-xs)]">
              <span className="text-caption-regular text-text-muted">Apelido</span>
              <span className="text-body-regular text-text-primary">
                {user?.nickname ?? "—"}
              </span>
            </div>
            <div className="flex flex-col gap-[var(--space-xs)]">
              <span className="text-caption-regular text-text-muted">Celular</span>
              <span className="text-body-regular text-text-primary">
                {user?.phone ?? "—"}
              </span>
            </div>
            <div className="flex flex-col gap-[var(--space-xs)]">
              <span className="text-caption-regular text-text-muted">Posição preferida</span>
              <span className="text-body-regular text-text-primary">
                {user?.preferredPosition ?? "—"}
              </span>
            </div>
          </div>

          <Button
            variant="Secondary"
            size="Large"
            type="button"
            onClick={handleEditClick}
            className="w-full"
          >
            Editar perfil
          </Button>
        </div>
      )}

      {/* Logout — always at bottom */}
      <Button
        variant="Danger"
        size="Large"
        type="button"
        onClick={handleLogout}
        className="w-full"
      >
        Sair
      </Button>
    </div>
  );
}
