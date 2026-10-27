// Promise compartilhada: múltiplos 401 simultâneos disparam apenas um refresh.
// "refreshed"   → novo access_token obtido, repetir a request
// "expired"     → refresh_token inválido/expirado, deslogar
// "unavailable" → servidor offline ou erro de rede, NÃO deslogar
type RefreshOutcome = "refreshed" | "expired" | "unavailable";
let refreshPromise: Promise<RefreshOutcome> | null = null;

function doRefresh(): Promise<RefreshOutcome> {
  if (!refreshPromise) {
    refreshPromise = fetch("/api/auth/refresh", { method: "POST" })
      .then((r): RefreshOutcome => {
        if (r.ok) return "refreshed";
        if (r.status >= 500) return "unavailable";
        return "expired";
      })
      .catch((): RefreshOutcome => "unavailable")
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

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

// Base fetch wrapper with automatic token refresh on 401.
// All requests are proxied through /api/proxy so the Next.js server can
// forward the httpOnly access_token cookie to the Express API.
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const isFormData = init?.body instanceof FormData;

  let res: Response;
  try {
    res = await fetch(`/api/proxy${path}`, {
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

  if (res.status === 401) {
    const outcome = await doRefresh();
    if (outcome === "refreshed") {
      return apiFetch<T>(path, init);
    }
    if (outcome === "expired") {
      if (typeof window !== "undefined") {
        window.location.href = "/entrar";
      }
      throw new Error("Sessão expirada. Faça login novamente.");
    }
    // "unavailable": servidor offline ou rede caiu — não deslogar
    throw new Error("Serviço temporariamente indisponível. Tente novamente em instantes.");
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
