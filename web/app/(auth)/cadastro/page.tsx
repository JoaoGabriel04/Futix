import type { Metadata } from "next";
import { CadastroClient } from "./CadastroClient";

export const metadata: Metadata = {
  title: "Criar conta | Futix",
  description: "Crie sua conta Futix e organize o próximo racha.",
};

export default function CadastroPage() {
  return <CadastroClient />;
}
