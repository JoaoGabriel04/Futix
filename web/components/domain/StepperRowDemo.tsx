"use client";

import { useState } from "react";
import { StepperRow } from "./StepperRow";

export function StepperRowDemo() {
  const [linhaTime, setLinhaTime] = useState(4);
  const [vagas, setVagas] = useState(16);
  const [goleiros, setGoleiros] = useState(2);

  return (
    <div className="space-y-[var(--space-md)]">
      <StepperRow
        titulo="Jogadores de linha por time"
        dica="Times de até 5 jogadores"
        value={linhaTime}
        min={2}
        max={8}
        onChange={setLinhaTime}
      />
      <StepperRow
        titulo="Vagas de linha"
        dica="Total de jogadores de linha"
        value={vagas}
        min={4}
        max={32}
        onChange={setVagas}
      />
      <StepperRow
        titulo="Vagas de goleiro"
        value={goleiros}
        min={0}
        max={4}
        onChange={setGoleiros}
      />
    </div>
  );
}
