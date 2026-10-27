import { type NextRequest, NextResponse } from "next/server";

// Rotas de auth: bloqueadas para quem já está autenticado
const AUTH_PATHS = ["/entrar", "/cadastro"];
const PUBLIC_PATHS = ["/ui", "/auth/callback", "/api/auth", "/api/proxy"];

const COOKIE_OPTS = {
  httpOnly: true,
  secure: true,
  sameSite: "none" as const,
};

async function tryRefresh(
  req: NextRequest,
): Promise<{ accessToken: string; refreshToken: string } | null> {
  const refreshToken = req.cookies.get("refresh_token")?.value;
  if (!refreshToken) return null;

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
  try {
    const res = await fetch(`${apiUrl}/auth/refresh`, {
      method: "POST",
      headers: { Cookie: `refresh_token=${refreshToken}` },
    });
    if (!res.ok) return null;
    return res.json() as Promise<{ accessToken: string; refreshToken: string }>;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === "/") {
    if (req.cookies.get("access_token")) {
      const url = req.nextUrl.clone();
      url.pathname = "/inicio";
      return NextResponse.redirect(url);
    }
    // Sem access_token na landing: tenta refresh silencioso para redirecionar ao início
    const tokens = await tryRefresh(req);
    if (tokens) {
      const url = req.nextUrl.clone();
      url.pathname = "/inicio";
      const response = NextResponse.redirect(url);
      response.cookies.set("access_token", tokens.accessToken, { ...COOKIE_OPTS, maxAge: 900 });
      response.cookies.set("refresh_token", tokens.refreshToken, {
        ...COOKIE_OPTS,
        maxAge: 2_592_000,
      });
      return response;
    }
    return NextResponse.next();
  }

  // Páginas de auth: redireciona para /inicio se já autenticado
  const isAuthPage = AUTH_PATHS.some((p) => pathname.startsWith(p));
  if (isAuthPage) {
    if (req.cookies.get("access_token")) {
      const url = req.nextUrl.clone();
      url.pathname = "/inicio";
      return NextResponse.redirect(url);
    }
    const tokens = await tryRefresh(req);
    if (tokens) {
      const url = req.nextUrl.clone();
      url.pathname = "/inicio";
      const response = NextResponse.redirect(url);
      response.cookies.set("access_token", tokens.accessToken, { ...COOKIE_OPTS, maxAge: 900 });
      response.cookies.set("refresh_token", tokens.refreshToken, {
        ...COOKIE_OPTS,
        maxAge: 2_592_000,
      });
      return response;
    }
    return NextResponse.next();
  }

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  if (isPublic) return NextResponse.next();

  if (req.cookies.get("access_token")) return NextResponse.next();

  // Sem access_token em rota protegida: tenta refresh antes de redirecionar
  const tokens = await tryRefresh(req);
  if (tokens) {
    const response = NextResponse.next();
    response.cookies.set("access_token", tokens.accessToken, { ...COOKIE_OPTS, maxAge: 900 });
    response.cookies.set("refresh_token", tokens.refreshToken, {
      ...COOKIE_OPTS,
      maxAge: 2_592_000,
    });
    return response;
  }

  const url = req.nextUrl.clone();
  url.pathname = "/entrar";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico|gif)$).*)"],
};
