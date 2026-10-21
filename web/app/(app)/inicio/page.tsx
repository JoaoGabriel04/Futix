"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "../../../components/ui/Button";
import { MatchCard } from "../../../components/domain/MatchCard";
import { useRooms } from "../../../hooks/useRooms";
import type { RoomSummary } from "../../../hooks/useRooms";

function statusToBadge(
  r: RoomSummary,
): "Confirmado" | "Pendente" | "Espera" | "Recusado" | "Organizador" | undefined {
  if (r.myRole === "ORGANIZER" || r.myRole === "CO_ORGANIZER") return "Organizador";
  if (r.myStatus === "CONFIRMED") return "Confirmado";
  if (r.myStatus === "PENDING") return "Pendente";
  if (r.myStatus === "WAITLIST") return "Espera";
  if (r.myStatus === "REJECTED") return "Recusado";
  return undefined;
}

function totalSlots(r: RoomSummary): number {
  return r.lineSlots + r.goalkeeperSlots;
}

function totalConfirmed(r: RoomSummary): number {
  return r.confirmedLine + r.confirmedGoalkeepers;
}

export default function InicioPage() {
  const router = useRouter();
  const { rooms, isLoading } = useRooms();

  if (isLoading) {
    return (
      <p className="text-body-regular text-text-muted p-[var(--space-lg)]">Carregando...</p>
    );
  }

  return (
    <div className="p-[var(--space-lg)] flex flex-col gap-[var(--space-lg)]">
      {/* Header */}
      <div className="flex items-center justify-between gap-[var(--space-md)]">
        <h1 className="text-heading-h2 text-text-primary">Início</h1>
        <Button
          variant="Primary"
          size="Small"
          type="button"
          onClick={() => router.push("/salas/criar")}
        >
          Criar sala
        </Button>
      </div>

      {rooms.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center gap-[var(--space-lg)] py-[var(--space-3xl)]">
          <p className="text-body-regular text-text-muted">Nenhuma partida por aqui.</p>
          <Button
            variant="Primary"
            size="Large"
            type="button"
            onClick={() => router.push("/salas/criar")}
          >
            Criar sala
          </Button>
        </div>
      ) : (
        /* Room list */
        <div className="flex flex-col gap-[var(--space-lg)]">
          {rooms.map((r) => {
            const quando = format(new Date(r.startsAt), "d 'de' MMMM, HH:mm", { locale: ptBR });
            const total = totalSlots(r);
            const confirmed = totalConfirmed(r);
            const progressValue = total > 0 ? Math.round((confirmed / total) * 100) : 0;
            const vagas = `${confirmed}/${total} vagas`;

            const badgeStatus = statusToBadge(r);
            return (
              <Link key={r.id} href={`/salas/${r.id}`} className="block">
                <MatchCard
                  titulo={r.title}
                  quando={quando}
                  local={r.location}
                  vagas={vagas}
                  {...(badgeStatus !== undefined && { status: badgeStatus })}
                  progressValue={progressValue}
                />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
