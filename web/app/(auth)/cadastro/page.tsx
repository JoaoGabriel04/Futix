import { redirect } from "next/navigation";

// Temporary redirect — T7 will replace this file with the "Criar conta" page.
export default function CadastroRedirect() {
  redirect("/cadastro/perfil");
}
