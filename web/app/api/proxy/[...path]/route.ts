import { type NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

async function proxy(request: NextRequest, pathSegments: string[]): Promise<NextResponse> {
  const path = "/" + pathSegments.join("/");
  const target = `${API_URL}${path}${request.nextUrl.search}`;

  const accessToken = request.cookies.get("access_token")?.value;

  const headers = new Headers();
  const ct = request.headers.get("content-type");
  if (ct) headers.set("content-type", ct);
  if (accessToken) headers.set("cookie", `access_token=${accessToken}`);

  let body: BodyInit | undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    const buf = await request.arrayBuffer();
    if (buf.byteLength > 0) body = buf;
  }

  let apiRes: Response;
  try {
    apiRes = await fetch(target, { method: request.method, headers, body });
  } catch {
    return NextResponse.json(
      { error: { code: "NETWORK_ERROR", message: "Sem conexão com o servidor." } },
      { status: 502 },
    );
  }

  const resBody = await apiRes.arrayBuffer();
  const resHeaders = new Headers();
  const resCt = apiRes.headers.get("content-type");
  if (resCt) resHeaders.set("content-type", resCt);

  return new NextResponse(resBody.byteLength > 0 ? resBody : null, {
    status: apiRes.status,
    headers: resHeaders,
  });
}

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  return proxy(req, (await params).path);
}
export async function POST(req: NextRequest, { params }: Ctx) {
  return proxy(req, (await params).path);
}
export async function PUT(req: NextRequest, { params }: Ctx) {
  return proxy(req, (await params).path);
}
export async function PATCH(req: NextRequest, { params }: Ctx) {
  return proxy(req, (await params).path);
}
export async function DELETE(req: NextRequest, { params }: Ctx) {
  return proxy(req, (await params).path);
}
