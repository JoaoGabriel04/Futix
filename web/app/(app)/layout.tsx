import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppShellWithUser } from "../../components/layout/AppShellWithUser";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token");
  const refreshToken = cookieStore.get("refresh_token");
  if (!accessToken && !refreshToken) redirect("/entrar");
  return <AppShellWithUser>{children}</AppShellWithUser>;
}
