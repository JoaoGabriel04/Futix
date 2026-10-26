import { type NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";
const PROVIDERS = ["google", "discord"] as const;
type Provider = (typeof PROVIDERS)[number];

export async function GET(request: NextRequest): Promise<NextResponse> {
  const provider = request.nextUrl.searchParams.get("provider") as Provider | null;
  if (!provider || !PROVIDERS.includes(provider)) {
    return NextResponse.json({ error: "Provedor inválido." }, { status: 400 });
  }

  const accessToken = request.cookies.get("access_token")?.value;
  if (!accessToken) {
    return NextResponse.redirect(new URL("/entrar", request.url));
  }

  // Obtém token de curta duração da Render para iniciar o link OAuth
  // sem expor o access_token na URL do redirecionamento.
  let linkToken: string;
  try {
    const res = await fetch(`${API_URL}/auth/link-token`, {
      headers: { cookie: `access_token=${accessToken}` },
    });
    if (!res.ok) {
      return NextResponse.redirect(new URL("/entrar", request.url));
    }
    ({ linkToken } = (await res.json()) as { linkToken: string });
  } catch {
    return NextResponse.redirect(new URL("/entrar", request.url));
  }

  const destination = `${API_URL}/auth/${provider}?link=1&t=${encodeURIComponent(linkToken)}`;
  return NextResponse.redirect(new URL(destination));
}
