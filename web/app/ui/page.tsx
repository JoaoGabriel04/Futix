import { notFound } from "next/navigation";
import { ApprovalCard } from "../../components/domain/ApprovalCard";
import { MatchCard } from "../../components/domain/MatchCard";
import { PlayerRow } from "../../components/domain/PlayerRow";
import { StepperRowDemo } from "../../components/domain/StepperRowDemo";
import { TabBar } from "../../components/layout/TabBar";
import { Avatar } from "../../components/ui/Avatar";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Progress } from "../../components/ui/Progress";
import { RoleChip } from "../../components/ui/RoleChip";

// Rota de desenvolvimento: não exposta em produção
export default function UIShowcase() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <div className="min-h-screen bg-bg-app px-[var(--space-lg)] py-[var(--space-3xl)] max-w-2xl mx-auto space-y-[var(--space-3xl)]">
      <h1 className="text-display-h1 text-text-primary">Biblioteca de Componentes</h1>

      {/* ─── Button ─────────────────────────────────────────── */}
      <section className="space-y-[var(--space-lg)]">
        <h2 className="text-heading-h2 text-text-primary">Button</h2>
        <div className="flex flex-wrap gap-[var(--space-md)]">
          <Button variant="Primary" size="Large">Primário Grande</Button>
          <Button variant="Primary" size="Small">Primário Pequeno</Button>
        </div>
        <div className="flex flex-wrap gap-[var(--space-md)]">
          <Button variant="Secondary" size="Large">Secundário Grande</Button>
          <Button variant="Secondary" size="Small">Secundário Pequeno</Button>
        </div>
        <div className="flex flex-wrap gap-[var(--space-md)]">
          <Button variant="Ghost" size="Large">Ghost Grande</Button>
          <Button variant="Ghost" size="Small">Ghost Pequeno</Button>
        </div>
        <div className="flex flex-wrap gap-[var(--space-md)]">
          <Button variant="Danger" size="Large">Danger Grande</Button>
          <Button variant="Danger" size="Small">Danger Pequeno</Button>
        </div>
        <div className="flex flex-wrap gap-[var(--space-md)]">
          <Button variant="Primary" size="Large" disabled>Desabilitado</Button>
        </div>
      </section>

      {/* ─── Badge ──────────────────────────────────────────── */}
      <section className="space-y-[var(--space-lg)]">
        <h2 className="text-heading-h2 text-text-primary">Badge</h2>
        <div className="flex flex-wrap gap-[var(--space-md)]">
          <Badge status="Confirmado" />
          <Badge status="Pendente" />
          <Badge status="Espera" />
          <Badge status="Recusado" />
          <Badge status="Organizador" />
        </div>
      </section>

      {/* ─── Avatar ─────────────────────────────────────────── */}
      <section className="space-y-[var(--space-lg)]">
        <h2 className="text-heading-h2 text-text-primary">Avatar</h2>
        <div className="flex gap-[var(--space-lg)] items-center">
          <Avatar iniciais="JG" size="MD" />
          <Avatar iniciais="JG" size="LG" />
          <Avatar iniciais="CS" size="MD" />
          <Avatar iniciais="RM" size="LG" />
        </div>
      </section>

      {/* ─── Input ──────────────────────────────────────────── */}
      <section className="space-y-[var(--space-lg)]">
        <h2 className="text-heading-h2 text-text-primary">Input</h2>
        <Input label="Nome" placeholder="Digite seu nome" />
        <Input label="Localização" placeholder="Ex: Quadra do Centro" />
        <Input placeholder="Sem label" />
      </section>

      {/* ─── Progress ───────────────────────────────────────── */}
      <section className="space-y-[var(--space-lg)]">
        <h2 className="text-heading-h2 text-text-primary">Progress</h2>
        <div className="space-y-[var(--space-md)]">
          <p className="text-caption-regular text-text-muted">Baixo (25%)</p>
          <Progress value={25} />
          <p className="text-caption-regular text-text-muted">Médio (56%)</p>
          <Progress value={56} />
          <p className="text-caption-regular text-text-muted">Alto (75%)</p>
          <Progress value={75} />
          <p className="text-caption-regular text-text-muted">Cheio (100%)</p>
          <Progress value={100} />
        </div>
      </section>

      {/* ─── RoleChip ───────────────────────────────────────── */}
      <section className="space-y-[var(--space-lg)]">
        <h2 className="text-heading-h2 text-text-primary">Role Chip</h2>
        <div className="flex gap-[var(--space-md)]">
          <RoleChip funcao="Linha" />
          <RoleChip funcao="Goleiro" />
        </div>
      </section>

      {/* ─── Match Card ─────────────────────────────────────── */}
      <section className="space-y-[var(--space-lg)]">
        <h2 className="text-heading-h2 text-text-primary">Match Card</h2>
        <MatchCard
          titulo="Racha de Sábado"
          quando="Sáb, 25 out · 16:00"
          local="Quadra do Centro"
          vagas="12/16 jogadores"
          status="Confirmado"
          progressValue={75}
        />
        <MatchCard
          titulo="Racha de Quarta"
          quando="Qua, 29 out · 19:00"
          local="Quadra da Escola"
          vagas="6/16 jogadores"
          status="Pendente"
          progressValue={37}
        />
        <MatchCard
          titulo="Racha Fechado"
          quando="Dom, 2 nov · 10:00"
          local="Campo Society"
          vagas="16/16 jogadores"
          progressValue={100}
        />
      </section>

      {/* ─── Player Row ─────────────────────────────────────── */}
      <section className="space-y-[var(--space-lg)]">
        <h2 className="text-heading-h2 text-text-primary">Player Row</h2>
        <div className="bg-bg-surface rounded-lg divide-y divide-border-default">
          <div className="px-[var(--space-lg)]">
            <PlayerRow nome="Carlos Souza" posicao="Meia" status="Confirmado" />
          </div>
          <div className="px-[var(--space-lg)]">
            <PlayerRow nome="Rafael Mendes" posicao="Atacante" status="Pendente" />
          </div>
          <div className="px-[var(--space-lg)]">
            <PlayerRow nome="Lucas Oliveira" posicao="Zagueiro" status="Espera" />
          </div>
          <div className="px-[var(--space-lg)]">
            <PlayerRow nome="Pedro Lima" posicao="Goleiro" status="Recusado" />
          </div>
        </div>
      </section>

      {/* ─── Approval Card ──────────────────────────────────── */}
      <section className="space-y-[var(--space-lg)]">
        <h2 className="text-heading-h2 text-text-primary">Approval Card</h2>
        <ApprovalCard
          member={{
            id: "m1",
            userId: "u1",
            role: "PLAYER",
            status: "PENDING",
            playRole: "LINE",
            waitlistPosition: null,
            user: { name: "Rafael Mendes", nickname: "Rafa", avatarUrl: null, preferredPosition: "Meia" },
          }}
          onApprove={() => undefined}
          onReject={() => undefined}
        />
        <ApprovalCard
          member={{
            id: "m2",
            userId: "u2",
            role: "PLAYER",
            status: "WAITLIST",
            playRole: "GOALKEEPER",
            waitlistPosition: 2,
            user: { name: "Fernando Costa", nickname: null, avatarUrl: null, preferredPosition: null },
          }}
        />
      </section>

      {/* ─── Stepper Row ────────────────────────────────────── */}
      <section className="space-y-[var(--space-lg)]">
        <h2 className="text-heading-h2 text-text-primary">Stepper Row</h2>
        <StepperRowDemo />
      </section>

      {/* ─── Tab Bar ────────────────────────────────────────── */}
      <section className="space-y-[var(--space-lg)]">
        <h2 className="text-heading-h2 text-text-primary">Tab Bar</h2>
        <p className="text-caption-regular text-text-muted">
          A TabBar real usa usePathname — abaixo uma prévia estática do container.
        </p>
        <div className="rounded-lg overflow-hidden border border-border-default w-[390px]">
          <TabBar />
        </div>
      </section>

      <div className="h-[var(--space-3xl)]" />
    </div>
  );
}
