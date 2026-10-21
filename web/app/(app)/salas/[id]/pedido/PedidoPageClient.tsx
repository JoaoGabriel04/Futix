"use client";

import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";
import { Button } from "../../../../../components/ui/Button";

interface PedidoPageClientProps {
  id: string;
}

export function PedidoPageClient({ id }: PedidoPageClientProps) {
  const router = useRouter();

  return (
    <div className="w-full max-w-2xl mx-auto p-[var(--space-lg)] lg:p-[var(--space-3xl)] flex flex-col items-center gap-[var(--space-xl)] text-center">
      {/* Icon */}
      <div className="flex items-center justify-center size-20 rounded-full bg-status-warning-subtle">
        <Clock size={36} className="text-status-warning" aria-hidden />
      </div>

      {/* Title */}
      <h1 className="text-heading-h2 text-text-primary">Pedido enviado!</h1>

      {/* Description */}
      <p className="text-body-regular text-text-secondary max-w-sm">
        Sua solicitação foi enviada ao organizador. Você será notificado quando for aprovado.
      </p>

      {/* Back button */}
      <Button
        variant="Secondary"
        size="Large"
        onClick={() => router.push(`/salas/${id}`)}
      >
        Voltar para a sala
      </Button>
    </div>
  );
}
