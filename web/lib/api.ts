// Base fetch wrapper with credentials
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "";

  const isFormData = init?.body instanceof FormData;

  const res = await fetch(`${base}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      error?: { code?: string; message?: string };
    };
    const err = new Error(
      body.error?.message ?? "Erro desconhecido",
    ) as Error & { code: string | undefined; status: number };
    err.code = body.error?.code;
    err.status = res.status;
    throw err;
  }

  return res.json() as Promise<T>;
}
