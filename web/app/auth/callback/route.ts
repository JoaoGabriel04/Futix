import { type NextRequest, NextResponse } from "next/server";

const COOKIE_OPTS = {
  httpOnly: true,
  secure: true,
  sameSite: "none" as const,
};

export async function GET(request: NextRequest): Promise<NextResponse> {
  const t = request.nextUrl.searchParams.get("t");
  if (!t) return NextResponse.redirect(new URL("/entrar", request.url));

  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
    const res = await fetch(`${apiUrl}/auth/exchange?t=${encodeURIComponent(t)}`);
    if (!res.ok) return NextResponse.redirect(new URL("/entrar", request.url));

    const { accessToken, refreshToken, isNew } = (await res.json()) as {
      accessToken: string;
      refreshToken: string;
      isNew: boolean;
    };

    const destination = isNew ? "/cadastro" : "/inicio";
    const response = NextResponse.redirect(new URL(destination, request.url));
    response.cookies.set("access_token", accessToken, { ...COOKIE_OPTS, maxAge: 900 });
    response.cookies.set("refresh_token", refreshToken, { ...COOKIE_OPTS, maxAge: 2_592_000 });
    return response;
  } catch {
    return NextResponse.redirect(new URL("/entrar", request.url));
  }
}
