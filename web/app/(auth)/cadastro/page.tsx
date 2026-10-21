"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { Avatar } from "../../../components/ui/Avatar";
import { apiFetch } from "../../../lib/api";
import { useMe } from "../../../hooks/useMe";

const formSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  apelido: z.string().optional(),
  celular: z.string().optional(),
  posicaoPreferida: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function CadastroPage() {
  const router = useRouter();
  const { user, mutate } = useMe();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: "",
      apelido: "",
      celular: "",
      posicaoPreferida: "",
    },
  });

  // Pre-fill form when user data loads
  useEffect(() => {
    if (user) {
      reset({
        nome: user.name ?? "",
        apelido: user.nickname ?? "",
        celular: user.phone ?? "",
        posicaoPreferida: user.preferredPosition ?? "",
      });
      if (user.avatarUrl) {
        setPreviewUrl(user.avatarUrl);
      }
    }
  }, [user, reset]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type and size
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Formato de imagem inválido. Use JPG, PNG ou WebP.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 2MB.");
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function onSubmit(data: FormData) {
    try {
      // Patch text fields
      await apiFetch<unknown>("/me", {
        method: "PATCH",
        body: JSON.stringify({
          name: data.nome,
          nickname: data.apelido || undefined,
          phone: data.celular || undefined,
          preferredPosition: data.posicaoPreferida || undefined,
        }),
      });

      // Upload avatar if selected
      if (selectedFile) {
        const formData = new FormData();
        formData.append("avatar", selectedFile);
        await apiFetch<unknown>("/me/avatar", {
          method: "POST",
          body: formData,
        });
      }

      await mutate();
      router.push("/inicio");
    } catch {
      toast.error("Erro ao salvar perfil. Tente novamente.");
    }
  }

  // Compute initials for avatar preview
  const nomeValue = user?.name ?? "";
  const iniciais = nomeValue
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="bg-bg-surface rounded-[var(--radius-lg)] p-[var(--space-3xl)] flex flex-col gap-[var(--space-xl)] w-full max-w-[390px]">
      <div className="flex flex-col gap-[var(--space-xs)]">
        <h1 className="text-display-h1 text-text-primary">Complete seu perfil</h1>
        <p className="text-body-regular text-text-secondary">
          Adicione suas informações para entrar no racha.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-[var(--space-lg)]">
        {/* Avatar upload */}
        <div className="flex flex-col gap-[var(--space-sm)]">
          <span className="text-caption-strong text-text-secondary">Foto</span>
          <div className="flex items-center gap-[var(--space-lg)]">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="focus:outline-none"
              aria-label="Selecionar foto de perfil"
            >
              <Avatar
                iniciais={iniciais || "?"}
                src={previewUrl ?? undefined}
                size="LG"
                className="cursor-pointer hover:opacity-80 transition-opacity"
              />
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-caption-strong text-accent-default underline"
            >
              {previewUrl ? "Trocar foto" : "Adicionar foto"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </div>

        <Input
          label="Nome completo"
          placeholder="Ex: João da Silva"
          aria-invalid={!!errors.nome}
          {...register("nome")}
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

        <Button
          type="submit"
          variant="Primary"
          size="Large"
          disabled={isSubmitting}
          className="w-full mt-[var(--space-sm)]"
        >
          {isSubmitting ? "Salvando..." : "Salvar e entrar"}
        </Button>
      </form>
    </div>
  );
}
