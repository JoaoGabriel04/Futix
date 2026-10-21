// Base fetch wrapper with credentials and automatic token refresh on 401.
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

  // On 401, try to refresh the session once then retry the original request.
  // Guard against infinite loop by never refreshing the refresh endpoint itself.
  if (res.status === 401 && path !== "/auth/refresh") {
    const refreshRes = await fetch(`${base}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });

    if (refreshRes.ok) {
      return apiFetch<T>(path, init);
    }

    if (typeof window !== "undefined") {
      window.location.href = "/entrar";
    }
    throw new Error("Sessão expirada. Faça login novamente.");
  }

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
