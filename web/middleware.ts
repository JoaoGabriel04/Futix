import { type NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/entrar", "/cadastro", "/ui", "/auth/callback", "/api/auth"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === "/") {
    if (req.cookies.get("access_token")) {
      const url = req.nextUrl.clone();
      url.pathname = "/inicio";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  if (isPublic) return NextResponse.next();

  const token = req.cookies.get("access_token");
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/entrar";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico|gif)$).*)"],
};
