import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppShellWithUser } from "../../components/layout/AppShellWithUser";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token");
  if (!token) redirect("/entrar");
  return <AppShellWithUser>{children}</AppShellWithUser>;
}
