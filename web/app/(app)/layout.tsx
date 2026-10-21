import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "../../components/layout/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token");
  if (!token) redirect("/entrar");
  return <AppShell>{children}</AppShell>;
}
