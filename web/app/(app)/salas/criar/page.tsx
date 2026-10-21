"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Hand, Users } from "lucide-react";
import * as RadixSwitch from "@radix-ui/react-switch";
import { Button } from "../../../../components/ui/Button";
import { Input } from "../../../../components/ui/Input";
import { StepperRow } from "../../../../components/domain/StepperRow";
import { RoleCard } from "../../../../components/domain/RoleCard";
import { apiFetch } from "../../../../lib/api";
import { useRooms } from "../../../../hooks/useRooms";

const formSchema = z.object({
  title: z.string().min(1, "Título é obrigatório."),
  location: z.string().min(1, "Local é obrigatório."),
  startsAt: z.string().min(1, "Data e hora são obrigatórias."),
  requireApproval: z.boolean(),
});

type FormData = z.infer<typeof formSchema>;

export default function CriarSalaPage() {
  const router = useRouter();
  const { mutate } = useRooms();

  const [lineSlots, setLineSlots] = useState(16);
  const [teamSize, setTeamSize] = useState(4);
  const [goalkeeperSlots, setGoalkeeperSlots] = useState(2);
  const [playRole, setPlayRole] = useState<"LINE" | "GOALKEEPER" | null>(null);
  const [playRoleError, setPlayRoleError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      location: "",
      startsAt: "",
      requireApproval: true,
    },
  });

  async function onSubmit(data: FormData) {
    if (!playRole) {
      setPlayRoleError("Selecione seu papel na partida.");
      return;
    }
    setPlayRoleError(null);

    try {
      await apiFetch<{ id: string }>("/rooms", {
        method: "POST",
        body: JSON.stringify({
          title: data.title,
          location: data.location,
          startsAt: new Date(data.startsAt).toISOString(),
          lineSlots,
          teamSize,
          goalkeeperSlots,
          requireApproval: data.requireApproval,
          playRole,
        }),
      });
      await mutate();
      router.push("/inicio");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao criar sala.";
      toast.error(message);
    }
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-[var(--space-md)] px-[var(--space-lg)] py-[var(--space-lg)] lg:px-[var(--space-3xl)] lg:pt-[var(--space-3xl)]">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-text-secondary hover:text-text-primary transition-colors"
          aria-label="Voltar"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-heading-h2 text-text-primary">Criar sala</h1>
      </div>

      <form
        id="form-criar-sala"
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-[var(--space-xl)] px-[var(--space-lg)] pb-[88px] lg:px-[var(--space-3xl)] lg:pb-[var(--space-3xl)]"
      >
        <div className="grid grid-cols-1 gap-[var(--space-xl)] lg:grid-cols-2 lg:gap-[var(--space-2xl)]">

          {/* ── Coluna esquerda: Informações ── */}
          <div className="flex flex-col gap-[var(--space-lg)]">
            <span className="text-overline text-text-muted hidden lg:block">INFORMAÇÕES</span>

            <div className="flex flex-col gap-[var(--space-xs)]">
              <Input
                label="Título"
                placeholder="Ex: Racha de quarta"
                aria-invalid={!!errors.title}
                {...register("title")}
              />
              {errors.title && (
                <p className="text-caption-regular text-status-danger">{errors.title.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-[var(--space-xs)]">
              <Input
                label="Local"
                placeholder="Ex: Quadra do Parque"
                aria-invalid={!!errors.location}
                {...register("location")}
              />
              {errors.location && (
                <p className="text-caption-regular text-status-danger">{errors.location.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-[var(--space-xs)]">
              <label
                htmlFor="input-starts-at"
                className="text-caption-strong text-text-secondary"
              >
                Data e hora
              </label>
              <input
                id="input-starts-at"
                type="datetime-local"
                aria-invalid={!!errors.startsAt}
                className="bg-bg-surface h-[52px] w-full px-[var(--space-lg)] rounded-md border border-border-default text-body-regular text-text-primary placeholder:text-text-muted outline-none focus:border-2 focus:border-accent-default"
                {...register("startsAt")}
              />
              {errors.startsAt && (
                <p className="text-caption-regular text-status-danger">{errors.startsAt.message}</p>
              )}
            </div>
          </div>

          {/* ── Coluna direita: Formato + Regras + Papel ── */}
          <div className="flex flex-col gap-[var(--space-lg)]">
            <span className="text-overline text-text-muted hidden lg:block">FORMATO DA PARTIDA</span>

            <StepperRow
              titulo="Vagas de linha"
              dica="Mínimo 2"
              value={lineSlots}
              min={2}
              max={99}
              onChange={setLineSlots}
            />
            <StepperRow
              titulo="Jogadores por time"
              value={teamSize}
              min={1}
              max={99}
              onChange={setTeamSize}
            />
            <StepperRow
              titulo="Vagas de goleiro"
              value={goalkeeperSlots}
              min={0}
              max={20}
              onChange={setGoalkeeperSlots}
            />

            <div className="h-px bg-border-default lg:hidden" />

            <span className="text-overline text-text-muted hidden lg:block">REGRAS</span>

            <div className="flex items-center justify-between gap-[var(--space-lg)]">
              <div className="flex flex-col gap-[var(--space-xs)]">
                <span className="text-body-strong text-text-primary">Aprovação obrigatória</span>
                <span className="text-caption-regular text-text-secondary">
                  Novos jogadores precisam de aprovação
                </span>
              </div>
              <Controller
                control={control}
                name="requireApproval"
                render={({ field }) => (
                  <RadixSwitch.Root
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className="relative inline-flex h-[28px] w-[48px] shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent bg-border-default transition-colors data-[state=checked]:bg-accent-default focus:outline-none focus:ring-2 focus:ring-accent-default focus:ring-offset-2"
                    aria-label="Aprovação obrigatória"
                  >
                    <RadixSwitch.Thumb className="pointer-events-none block h-[20px] w-[20px] translate-x-[2px] rounded-full bg-white shadow-md transition-transform data-[state=checked]:translate-x-[22px]" />
                  </RadixSwitch.Root>
                )}
              />
            </div>

            <div className="h-px bg-border-default lg:hidden" />

            <span className="text-caption-strong text-text-secondary lg:hidden">Meu papel</span>
            <span className="text-overline text-text-muted hidden lg:block">MEU PAPEL</span>

            <div className="grid grid-cols-2 gap-[var(--space-md)]">
              <RoleCard
                icon={Users}
                label="Jogador de linha"
                selected={playRole === "LINE"}
                onClick={() => {
                  setPlayRole("LINE");
                  setPlayRoleError(null);
                }}
              />
              <RoleCard
                icon={Hand}
                label="Goleiro"
                selected={playRole === "GOALKEEPER"}
                onClick={() => {
                  setPlayRole("GOALKEEPER");
                  setPlayRoleError(null);
                }}
              />
            </div>
            {playRoleError && (
              <p className="text-caption-regular text-status-danger">{playRoleError}</p>
            )}
          </div>
        </div>

        {/* Desktop: botões no rodapé do formulário */}
        <div className="hidden lg:flex justify-end gap-[var(--space-md)] pt-[var(--space-md)] border-t border-border-default">
          <Button variant="Secondary" size="Large" type="button" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button variant="Primary" size="Large" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Criando..." : "Criar sala"}
          </Button>
        </div>
      </form>

      {/* Mobile: botão fixo acima da TabBar */}
      <div className="lg:hidden fixed bottom-[84px] inset-x-0 bg-bg-app border-t border-border-default px-[var(--space-lg)] py-[var(--space-lg)]">
        <Button
          variant="Primary"
          size="Large"
          type="submit"
          form="form-criar-sala"
          disabled={isSubmitting}
          className="w-full"
        >
          {isSubmitting ? "Criando..." : "Criar sala"}
        </Button>
      </div>
    </>
  );
}
