"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Camera } from "lucide-react";
import { Button } from "../../../../components/ui/Button";
import { Input } from "../../../../components/ui/Input";
import { Avatar } from "../../../../components/ui/Avatar";
import { apiFetch } from "../../../../lib/api";
import { useMe } from "../../../../hooks/useMe";

const POSITIONS = [
  { value: "GOALKEEPER", label: "Goleiro" },
  { value: "DEFENDER", label: "Defensor" },
  { value: "MIDFIELDER", label: "Meia" },
  { value: "FORWARD", label: "Atacante" },
] as const;

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
    watch,
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

  const selectedPosition = watch("posicaoPreferida");

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
      await apiFetch<unknown>("/me", {
        method: "PATCH",
        body: JSON.stringify({
          name: data.nome,
          nickname: data.apelido || undefined,
          phone: data.celular || undefined,
          preferredPosition: data.posicaoPreferida || undefined,
        }),
      });
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

  const nomeValue = user?.name ?? "";
  const iniciais = nomeValue
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="min-h-screen flex flex-col bg-bg-app">

      {/* Nav header */}
      <div className="flex items-center gap-[var(--space-md)] p-[var(--space-lg)]">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-text-secondary hover:text-text-primary transition-colors"
          aria-label="Voltar"
        >
          <ArrowLeft size={20} />
        </button>
        <span className="text-heading-h3 text-text-primary">Complete seu perfil</span>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex-1 flex flex-col"
      >
        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-[var(--space-lg)] flex flex-col gap-[var(--space-lg)]">

          {/* Avatar */}
          <div className="flex items-start gap-[var(--space-lg)]">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Selecionar foto de perfil"
              className="shrink-0 focus:outline-none"
            >
              {previewUrl ? (
                <Avatar
                  iniciais={iniciais || "?"}
                  src={previewUrl}
                  size="LG"
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                />
              ) : (
                <span className="flex items-center justify-center size-[88px] rounded-full border-2 border-dashed border-border-default bg-bg-raised hover:opacity-80 transition-opacity cursor-pointer">
                  <Camera size={24} className="text-text-muted" aria-hidden />
                </span>
              )}
            </button>
            <div className="flex flex-col gap-[var(--space-xs)] pt-[var(--space-xs)]">
              <span className="text-body-strong text-text-primary">Foto de perfil</span>
              <p className="text-caption-regular text-text-muted">
                Opcional. Aparece nas listas e nos times. Sem foto, usamos suas iniciais.
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-caption-strong text-accent-default text-left"
              >
                {previewUrl ? "Trocar foto" : "Escolher foto"}
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Nome */}
          <div className="flex flex-col gap-[var(--space-xs)]">
            <Input
              label="Nome completo"
              placeholder="Seu nome"
              aria-invalid={!!errors.nome}
              {...register("nome")}
            />
            {errors.nome && (
              <p className="text-caption-regular text-status-danger">
                {errors.nome.message}
              </p>
            )}
          </div>

          {/* Apelido */}
          <Input
            label="Apelido nas listas"
            placeholder="Como o pessoal te chama"
            {...register("apelido")}
          />

          {/* Celular */}
          <Input
            label="Celular (WhatsApp)"
            placeholder="(99) 99999-9999"
            {...register("celular")}
            onChange={(e) => {
              e.target.value = formatPhone(e.target.value);
              void setValue("celular", e.target.value, { shouldValidate: false });
            }}
          />

          {/* Posição preferida — chip selector */}
          <div className="flex flex-col gap-[var(--space-sm)]">
            <span className="text-caption-strong text-text-secondary">Posição preferida</span>
            <div className="flex gap-[var(--space-sm)] flex-wrap">
              {POSITIONS.map((pos) => (
                <button
                  key={pos.value}
                  type="button"
                  onClick={() =>
                    setValue(
                      "posicaoPreferida",
                      selectedPosition === pos.value ? "" : pos.value,
                      { shouldValidate: false },
                    )
                  }
                  className={[
                    "px-[var(--space-md)] py-[var(--space-sm)] rounded-full text-caption-strong transition-colors",
                    selectedPosition === pos.value
                      ? "bg-accent-default text-text-on-accent"
                      : "bg-bg-raised text-text-secondary border border-border-default hover:border-border-strong",
                  ].join(" ")}
                >
                  {pos.label}
                </button>
              ))}
            </div>
          </div>

          {/* Disclaimer */}
          <p className="text-caption-regular text-text-muted pb-[var(--space-lg)]">
            Sua conta é liberada na hora. A aprovação do organizador só acontece quando
            você pede vaga em uma sala.
          </p>
        </div>

        {/* Footer */}
        <div className="px-[var(--space-lg)] py-[var(--space-lg)]">
          <Button
            type="submit"
            variant="Primary"
            size="Large"
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? "Salvando..." : "Criar conta"}
          </Button>
        </div>
      </form>
    </div>
  );
}
