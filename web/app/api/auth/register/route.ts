import { type NextRequest, NextResponse } from "next/server";

const COOKIE_OPTS = {
  httpOnly: true,
  secure: true,
  sameSite: "none" as const,
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const res = await fetch(`${apiUrl}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data: unknown = await res.json();
    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }
    const { accessToken, refreshToken, user } = data as {
      accessToken: string;
      refreshToken: string;
      user: unknown;
    };
    const response = NextResponse.json({ user }, { status: 201 });
    response.cookies.set("access_token", accessToken, { ...COOKIE_OPTS, maxAge: 900 });
    response.cookies.set("refresh_token", refreshToken, { ...COOKIE_OPTS, maxAge: 2_592_000 });
    return response;
  } catch {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Ocorreu um erro." } },
      { status: 500 },
    );
  }
}
