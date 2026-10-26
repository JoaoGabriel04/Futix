import { Bell, Calendar, MapPin, ChevronRight, Users, Home, Shield, User, Check } from "lucide-react";
import Image from "next/image";

export function PhoneMock() {
  return (
    <div className="relative h-full w-full">
      {/* Phone frame */}
      <div className="absolute left-[45px] top-0 h-[560px] w-[300px] overflow-hidden rounded-[36px] border-4 border-border-strong bg-bg-app shadow-[0px_16px_40px_0px_rgba(0,0,0,0.55)] md:left-[100px] md:top-[10px] md:h-[700px] md:w-[400px] md:rounded-[48px]">
        <div className="flex h-full flex-col">
          {/* App Header */}
          <div className="flex shrink-0 items-center gap-3 border-b border-border-default bg-bg-surface px-4 pb-3 pt-12">
            <Image src="/logo-futix.webp" alt="" width={36} height={36} className="rounded-xl" />
            <span className="text-[17px] font-semibold leading-[22px] text-text-primary">Futix</span>
            <div className="flex-1" />
            <div className="flex size-10 items-center justify-center rounded-full border border-border-default bg-bg-raised">
              <Bell size={18} className="text-text-secondary" />
            </div>
            <div className="flex size-10 items-center justify-center rounded-full border border-border-default bg-accent-subtle">
              <span className="text-[13px] font-semibold text-accent-default">JG</span>
            </div>
          </div>

          {/* Content */}
          <div className="flex flex-1 flex-col gap-4 overflow-hidden p-4">
            {/* Greeting */}
            <div className="flex flex-col gap-1">
              <span className="text-[13px] leading-[18px] text-text-muted">Terça, 20 out</span>
              <span className="text-[22px] font-bold leading-[28px] text-text-primary">Fala, Gabriel</span>
            </div>

            {/* Próxima partida */}
            <div className="flex shrink-0 flex-col gap-3 rounded-[24px] bg-accent-default p-5">
              <span className="text-[11px] font-semibold uppercase leading-[14px] tracking-[0.6px] text-text-on-accent">
                Sua próxima partida
              </span>
              <span className="text-[22px] font-bold leading-[28px] text-text-on-accent">Racha de Sábado</span>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <Calendar size={16} className="text-text-on-accent" />
                  <span className="text-[13px] font-semibold leading-[18px] text-text-on-accent">Sáb, 25 out · 16:00</span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin size={16} className="text-text-on-accent" />
                  <span className="text-[13px] font-semibold leading-[18px] text-text-on-accent">Quadra do Centro</span>
                </div>
              </div>
              <div className="flex h-10 items-center justify-center gap-1 rounded-full bg-bg-app">
                <span className="text-[13px] font-semibold leading-[18px] text-text-primary">Ver sala</span>
                <ChevronRight size={16} className="text-text-primary" />
              </div>
            </div>

            {/* Salas abertas */}
            <div className="flex shrink-0 items-center">
              <span className="flex-1 text-[17px] font-semibold leading-[22px] text-text-primary">Salas abertas</span>
              <span className="text-[13px] font-semibold leading-[18px] text-accent-default">Ver todas</span>
            </div>

            {/* Match card 1 */}
            <div className="flex shrink-0 flex-col gap-3 rounded-2xl border border-border-default bg-bg-surface p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col gap-1">
                  <span className="text-[17px] font-semibold leading-[22px] text-text-primary">Racha de Quarta</span>
                  <span className="text-[13px] leading-[18px] text-text-muted">Qua, 29 out · 19:30</span>
                </div>
                <span className="shrink-0 rounded-full bg-status-info-subtle px-3 py-1 text-[13px] font-semibold leading-[18px] text-status-info">
                  Lista de espera
                </span>
              </div>
              <div className="flex items-center gap-5">
                <div className="flex items-center gap-1">
                  <MapPin size={16} className="text-text-secondary" />
                  <span className="text-[13px] leading-[18px] text-text-secondary">Campo do Bairro</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users size={16} className="text-text-secondary" />
                  <span className="text-[13px] leading-[18px] text-text-secondary">16/16 jogadores</span>
                </div>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-bg-raised">
                <div className="h-full w-full bg-accent-default" />
              </div>
            </div>

            {/* Match card 2 */}
            <div className="flex shrink-0 flex-col gap-3 rounded-2xl border border-border-default bg-bg-surface p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col gap-1">
                  <span className="text-[17px] font-semibold leading-[22px] text-text-primary">Racha de Domingo</span>
                  <span className="text-[13px] leading-[18px] text-text-muted">Dom, 26 out · 08:00</span>
                </div>
                <span className="shrink-0 rounded-full bg-status-warning-subtle px-3 py-1 text-[13px] font-semibold leading-[18px] text-status-warning">
                  Pendente
                </span>
              </div>
              <div className="flex items-center gap-5">
                <div className="flex items-center gap-1">
                  <MapPin size={16} className="text-text-secondary" />
                  <span className="text-[13px] leading-[18px] text-text-secondary">Quadra do Centro</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users size={16} className="text-text-secondary" />
                  <span className="text-[13px] leading-[18px] text-text-secondary">9/16 jogadores</span>
                </div>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-bg-raised">
                <div className="h-full w-[56%] bg-accent-default" />
              </div>
            </div>

            <div className="flex-1" />
          </div>

          {/* Tab Bar */}
          <div className="flex shrink-0 items-start border-t border-border-default bg-bg-sidebar pb-6 pt-2.5 px-2">
            {[
              { icon: Home, label: "Início", active: true },
              { icon: Calendar, label: "Partidas", active: false },
              { icon: Shield, label: "Gestão", active: false },
              { icon: User, label: "Perfil", active: false },
            ].map(({ icon: Icon, label, active }) => (
              <div key={label} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className={`flex h-8 w-14 items-center justify-center rounded-full ${active ? "bg-accent-subtle" : ""}`}
                >
                  <Icon size={22} className={active ? "text-accent-default" : "text-text-muted"} />
                </div>
                <span
                  className={`text-[10px] font-${active ? "semibold" : "normal"} leading-[13px] ${active ? "text-accent-default" : "text-text-muted"}`}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Float: Ao vivo */}
      <div className="absolute left-2 top-[455px] flex items-center gap-3 rounded-2xl border border-border-strong bg-bg-surface px-4 py-3 shadow-[0px_16px_40px_0px_rgba(0,0,0,0.55)] md:left-[-70px] md:top-[560px]">
        <div className="flex items-center gap-1 rounded-full bg-status-danger-subtle px-2 py-0.5">
          <div className="size-1.5 rounded-full bg-status-danger" />
          <span className="text-[13px] font-semibold leading-[18px] text-status-danger">Ao vivo</span>
        </div>
        <span className="text-[13px] font-semibold leading-[18px] text-text-secondary">Time 1</span>
        <span className="text-[22px] font-bold leading-[28px] text-accent-default">2</span>
        <span className="text-[13px] leading-[18px] text-text-muted">x</span>
        <span className="text-[22px] font-bold leading-[28px] text-text-primary">1</span>
        <span className="text-[13px] font-semibold leading-[18px] text-text-secondary">Time 2</span>
      </div>

      {/* Float: Pedido aprovado */}
      <div className="absolute left-[112px] top-[70px] flex items-center gap-3 rounded-2xl border border-border-strong bg-bg-surface px-4 py-3 shadow-[0px_16px_40px_0px_rgba(0,0,0,0.55)] md:left-[440px] md:top-[110px]">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-default">
          <Check size={16} className="text-text-on-accent" />
        </div>
        <div className="flex flex-col gap-1">
          <span className="whitespace-nowrap text-[13px] font-semibold leading-[18px] text-text-primary">Pedido aprovado</span>
          <span className="whitespace-nowrap text-[13px] leading-[18px] text-text-secondary">Rafael entrou como Linha</span>
        </div>
      </div>
    </div>
  );
}
