import { type NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const accessToken = request.cookies.get("access_token")?.value;
  if (!accessToken) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  try {
    const res = await fetch(`${API_URL}/auth/socket-token`, {
      headers: { cookie: `access_token=${accessToken}` },
    });
    if (!res.ok) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }
    const data = (await res.json()) as { token: string };
    return NextResponse.json({ token: data.token });
  } catch {
    return NextResponse.json({ error: "Erro ao obter token." }, { status: 502 });
  }
}
