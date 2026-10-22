const STATUS_MESSAGES: Record<number, string> = {
  400: "Dados inválidos. Verifique as informações e tente novamente.",
  403: "Você não tem permissão para realizar esta ação.",
  404: "Recurso não encontrado.",
  409: "Conflito: a operação não pôde ser concluída.",
  429: "Muitas tentativas. Aguarde um momento e tente novamente.",
  500: "Erro interno no servidor. Tente novamente em instantes.",
  502: "Serviço temporariamente indisponível.",
  503: "Serviço temporariamente indisponível.",
};

// Base fetch wrapper with credentials and automatic token refresh on 401.
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "";

  const isFormData = init?.body instanceof FormData;

  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...init?.headers,
      },
    });
  } catch {
    throw new Error("Sem conexão com o servidor. Verifique sua internet e tente novamente.");
  }

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
      message?: string;
    };
    const message =
      body.error?.message ??
      body.message ??
      STATUS_MESSAGES[res.status] ??
      "Erro inesperado. Tente novamente.";
    const err = new Error(message) as Error & { code: string | undefined; status: number };
    err.code = body.error?.code;
    err.status = res.status;
    throw err;
  }

  if (res.status === 204) {
    return null as T;
  }
  return res.json() as Promise<T>;
}
