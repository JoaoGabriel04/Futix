"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import * as RadixSwitch from "@radix-ui/react-switch";
import { Button } from "../../../../components/ui/Button";
import { Input } from "../../../../components/ui/Input";
import { apiFetch } from "../../../../lib/api";
import { useRooms } from "../../../../hooks/useRooms";

// Local form schema — startsAt is a raw datetime-local string;
// number fields come in as strings from inputs, coerced on submit.
const formSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  location: z.string().min(1, "Local é obrigatório"),
  startsAt: z.string().min(1, "Data e hora são obrigatórias"),
  lineSlots: z.coerce.number().int().min(2, "Mínimo 2 vagas de linha"),
  teamSize: z.coerce.number().int().min(1, "Mínimo 1 por time"),
  goalkeeperSlots: z.coerce.number().int().min(0, "Mínimo 0"),
  requireApproval: z.boolean(),
});

type FormData = z.infer<typeof formSchema>;

export default function CriarSalaPage() {
  const router = useRouter();
  const { mutate } = useRooms();
  const [selectedPlayRole, setSelectedPlayRole] = useState<"LINE" | "GOALKEEPER" | null>(null);
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
      lineSlots: 16,
      teamSize: 4,
      goalkeeperSlots: 2,
      requireApproval: true,
    },
  });

  async function onSubmit(data: FormData) {
    if (!selectedPlayRole) {
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
          lineSlots: Number(data.lineSlots),
          teamSize: Number(data.teamSize),
          goalkeeperSlots: Number(data.goalkeeperSlots),
          requireApproval: data.requireApproval,
          playRole: selectedPlayRole,
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
    <div className="bg-bg-surface rounded-[var(--radius-lg)] p-[var(--space-3xl)] flex flex-col gap-[var(--space-lg)] w-full max-w-[390px]">
      {/* Header row */}
      <div className="flex items-center gap-[var(--space-md)]">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-text-secondary hover:text-text-primary transition-colors"
          aria-label="Voltar"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-display-h1 text-text-primary">Criar sala</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-[var(--space-lg)]">
        {/* Title */}
        <div className="flex flex-col gap-[var(--space-sm)]">
          <Input
            label="Título"
            placeholder="Ex: Racha de quarta"
            aria-invalid={!!errors.title}
            {...register("title")}
          />
          {errors.title && (
            <p className="text-caption-regular text-status-danger">
              {errors.title.message}
            </p>
          )}
        </div>

        {/* Location */}
        <div className="flex flex-col gap-[var(--space-sm)]">
          <Input
            label="Local"
            placeholder="Ex: Quadra do Parque"
            aria-invalid={!!errors.location}
            {...register("location")}
          />
          {errors.location && (
            <p className="text-caption-regular text-status-danger">
              {errors.location.message}
            </p>
          )}
        </div>

        {/* Date & time */}
        <div className="flex flex-col gap-[var(--space-sm)]">
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
            <p className="text-caption-regular text-status-danger">
              {errors.startsAt.message}
            </p>
          )}
        </div>

        {/* Line slots */}
        <div className="flex flex-col gap-[var(--space-sm)]">
          <Input
            label="Vagas de linha"
            type="number"
            min={2}
            aria-invalid={!!errors.lineSlots}
            {...register("lineSlots")}
          />
          {errors.lineSlots && (
            <p className="text-caption-regular text-status-danger">
              {errors.lineSlots.message}
            </p>
          )}
        </div>

        {/* Team size */}
        <div className="flex flex-col gap-[var(--space-sm)]">
          <Input
            label="Jogadores por time"
            type="number"
            min={1}
            aria-invalid={!!errors.teamSize}
            {...register("teamSize")}
          />
          {errors.teamSize && (
            <p className="text-caption-regular text-status-danger">
              {errors.teamSize.message}
            </p>
          )}
        </div>

        {/* Goalkeeper slots */}
        <div className="flex flex-col gap-[var(--space-sm)]">
          <Input
            label="Vagas de goleiro"
            type="number"
            min={0}
            aria-invalid={!!errors.goalkeeperSlots}
            {...register("goalkeeperSlots")}
          />
          {errors.goalkeeperSlots && (
            <p className="text-caption-regular text-status-danger">
              {errors.goalkeeperSlots.message}
            </p>
          )}
        </div>

        {/* Require approval — Radix Switch */}
        <div className="flex items-center justify-between gap-[var(--space-lg)]">
          <div className="flex flex-col gap-[var(--space-xs)]">
            <span className="text-caption-strong text-text-primary">Aprovação obrigatória</span>
            <span className="text-caption-regular text-text-secondary">
              Novos jogadores precisam de aprovação para entrar
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

        {/* Play role toggle */}
        <div className="flex flex-col gap-[var(--space-sm)]">
          <span className="text-caption-strong text-text-secondary">Meu papel</span>
          <div className="flex gap-[var(--space-sm)]">
            <button
              type="button"
              onClick={() => {
                setSelectedPlayRole("LINE");
                setPlayRoleError(null);
              }}
              className={[
                "flex-1 h-[52px] rounded-md text-body-strong font-semibold transition-colors border",
                selectedPlayRole === "LINE"
                  ? "bg-accent-default text-text-on-accent border-accent-default"
                  : "bg-bg-raised text-text-primary border-border-default hover:border-accent-default",
              ].join(" ")}
            >
              Linha
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedPlayRole("GOALKEEPER");
                setPlayRoleError(null);
              }}
              className={[
                "flex-1 h-[52px] rounded-md text-body-strong font-semibold transition-colors border",
                selectedPlayRole === "GOALKEEPER"
                  ? "bg-accent-default text-text-on-accent border-accent-default"
                  : "bg-bg-raised text-text-primary border-border-default hover:border-accent-default",
              ].join(" ")}
            >
              Goleiro
            </button>
          </div>
          {playRoleError && (
            <p className="text-caption-regular text-status-danger">{playRoleError}</p>
          )}
        </div>

        {/* Submit */}
        <Button
          type="submit"
          variant="Primary"
          size="Large"
          disabled={isSubmitting}
          className="w-full mt-[var(--space-sm)]"
        >
          {isSubmitting ? "Criando..." : "Criar sala"}
        </Button>
      </form>
    </div>
  );
}
