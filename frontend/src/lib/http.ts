const RAW_API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
const API_BASE = RAW_API_BASE.replace(/\/+$/, "");

function authHeaders() {
  const token = localStorage.getItem("ayg_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function http<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      ...authHeaders(),
    },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (body as any)?.message ?? res.statusText ?? "Request failed";
    throw new Error(message);
  }
  return body as T;
}
