type ApiOptions = RequestInit;

let legacyTokenCleared = false;

export async function apiFetch<T>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  if (typeof window !== "undefined" && !legacyTokenCleared) {
    try {
      localStorage.removeItem("leadflow_token");
    } catch {
      // The BFF session does not depend on browser storage.
    }
    legacyTokenCleared = true;
  }

  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(path, {
    ...options,
    headers,
    credentials: "same-origin",
    cache: "no-store",
  });

  if (!response.ok) {
    let detail = "Request failed";

    try {
      const body = await response.json();
      detail = body.detail ?? detail;
    } catch {
      // Ignore invalid error responses.
    }

    if (
      response.status === 401 &&
      typeof window !== "undefined" &&
      window.location.pathname !== "/login"
    ) {
      window.location.replace("/login");
    }

    throw new Error(detail);
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}
