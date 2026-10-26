"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Calendar, Hand, Hourglass, MapPin, Users } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "../../../../../components/ui/Badge";
import { Button } from "../../../../../components/ui/Button";
import { apiFetch } from "../../../../../lib/api";
import { useRoom } from "../../../../../hooks/useRoom";

interface PedidoPageClientProps {
  id: string;
}

function RoleChip({ playRole }: { playRole: string }) {
  const isGk = playRole === "GOALKEEPER";
  const Icon = isGk ? Hand : Users;
  const label = isGk ? "Goleiro" : "Linha";
  return (
    <span className="inline-flex items-center gap-[var(--space-xs)] bg-bg-raised px-[var(--space-sm)] py-[var(--space-xs)] rounded-full text-caption-regular text-text-secondary">
      <Icon size={12} aria-hidden />
      {label}
    </span>
  );
}

export function PedidoPageClient({ id }: PedidoPageClientProps) {
  const router = useRouter();
  const { room } = useRoom(id);
  const [cancelling, setCancelling] = useState(false);

  const playRole = room?.myMember?.playRole ?? "LINE";

  const organizer = room?.members.find((m) => m.role === "ORGANIZER");
  const organizerPhone = organizer?.user.phone ?? null;
  const whatsappHref = organizerPhone
    ? `https://wa.me/55${organizerPhone.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá! Acabei de enviar um pedido para entrar na sala "${room?.title ?? ""}".`)}`
    : "https://wa.me/";

  const dataHora = room
    ? format(new Date(room.startsAt), "EEE, d MMM '·' HH:mm", { locale: ptBR })
    : null;

  async function handleCancel() {
    if (!room?.myMember) return;
    setCancelling(true);
    try {
      await apiFetch(`/rooms/${id}/members/${room.myMember.id}`, { method: "DELETE" });
      router.push(`/salas/${id}`);
    } catch (e: unknown) {
      toast.error((e as { message?: string }).message ?? "Erro ao cancelar pedido.");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="flex flex-col h-full p-[var(--space-lg)]">

      {/* Header */}
      <div className="flex items-center gap-[var(--space-md)]">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-text-secondary hover:text-text-primary transition-colors"
          aria-label="Voltar"
        >
          <ArrowLeft size={20} />
        </button>
        <span className="text-heading-h3 text-text-primary">Sala</span>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col justify-center gap-[var(--space-lg)]">

        {/* Icon + badge + title + description */}
        <div className="flex flex-col items-center gap-[var(--space-md)] text-center">
          <div className="flex items-center justify-center size-24 rounded-full bg-accent-subtle">
            <Hourglass size={40} className="text-accent-default" aria-hidden />
          </div>

          <Badge status="Pendente" />

          <h1 className="text-heading-h2 text-text-primary">Pedido enviado</h1>

          <p className="text-body-regular text-text-secondary max-w-xs">
            O organizador vai avaliar sua entrada nesta sala. Você recebe um aviso assim que for aprovado.
          </p>
        </div>

        {/* Room info card */}
        {room && (
          <div className="bg-bg-surface border border-border-default rounded-[var(--radius-md)] p-[var(--space-lg)] flex flex-col gap-[var(--space-sm)]">
            <p className="text-body-strong text-text-primary">{room.title}</p>

            {dataHora && (
              <span className="flex items-center gap-[var(--space-xs)] text-caption-regular text-text-muted">
                <Calendar size={14} className="shrink-0" aria-hidden />
                {dataHora}
              </span>
            )}

            <span className="flex items-center gap-[var(--space-xs)] text-caption-regular text-text-muted">
              <MapPin size={14} className="shrink-0" aria-hidden />
              {room.location}
            </span>

            <div className="flex items-center gap-[var(--space-sm)] text-caption-regular text-text-muted">
              <span>Você entra como</span>
              <RoleChip playRole={playRole} />
            </div>
          </div>
        )}

        <div className="flex-1" />
      </div>

      {/* Buttons */}
      <div className="flex flex-col gap-[var(--space-md)]">
        <Button
          variant="Secondary"
          size="Large"
          className="w-full"
          onClick={() => window.open(whatsappHref, "_blank")}
        >
          Avisar organizador no WhatsApp
        </Button>

        <Button
          variant="Ghost"
          size="Large"
          className="w-full text-status-danger"
          onClick={handleCancel}
          disabled={cancelling}
        >
          {cancelling ? "Cancelando..." : "Cancelar pedido"}
        </Button>
      </div>
    </div>
  );
}
