import { NextResponse } from "next/server";

export async function POST(): Promise<NextResponse> {
  const response = NextResponse.json({ ok: true });
  response.cookies.set("access_token", "", { httpOnly: true, secure: true, sameSite: "none", maxAge: 0 });
  response.cookies.set("refresh_token", "", { httpOnly: true, secure: true, sameSite: "none", maxAge: 0 });
  return response;
}
