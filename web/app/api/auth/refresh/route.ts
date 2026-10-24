import { type NextRequest, NextResponse } from "next/server";

const COOKIE_OPTS = {
  httpOnly: true,
  secure: true,
  sameSite: "none" as const,
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  const refreshToken = request.cookies.get("refresh_token")?.value;
  if (!refreshToken) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sessão expirada." } },
      { status: 401 },
    );
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
  const res = await fetch(`${apiUrl}/auth/refresh`, {
    method: "POST",
    headers: { Cookie: `refresh_token=${refreshToken}` },
  });

  if (!res.ok) {
    const response = NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sessão expirada." } },
      { status: 401 },
    );
    response.cookies.set("access_token", "", { ...COOKIE_OPTS, maxAge: 0 });
    response.cookies.set("refresh_token", "", { ...COOKIE_OPTS, maxAge: 0 });
    return response;
  }

  const { accessToken, refreshToken: newRefreshToken } = (await res.json()) as {
    accessToken: string;
    refreshToken: string;
  };

  const response = NextResponse.json({ ok: true });
  response.cookies.set("access_token", accessToken, { ...COOKIE_OPTS, maxAge: 900 });
  response.cookies.set("refresh_token", newRefreshToken, { ...COOKIE_OPTS, maxAge: 2_592_000 });
  return response;
}
