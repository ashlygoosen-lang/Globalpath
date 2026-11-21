// In production the API serves this site, so calls go to the same origin by default.
// Set VITE_API_URL only when the API is hosted separately.
const configured = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "");
export const API_URL = configured ?? (import.meta.env.DEV ? "http://localhost:4000" : "");

const TOKEN_KEY = "globalpath-token";

export const session = {
  get token(): string | null { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set(token: string) { try { localStorage.setItem(TOKEN_KEY, token); } catch {} },
  clear() { try { localStorage.removeItem(TOKEN_KEY); } catch {} },
};

export class ApiError extends Error {
  status: number;
  fields: Record<string, string>;
  missing: string[];
  constructor(message: string, status: number, fields: Record<string, string> = {}, missing: string[] = []) {
    super(message);
    this.status = status;
    this.fields = fields;
    this.missing = missing;
  }
}

export async function api<T = any>(path: string, options: { method?: string; body?: unknown; auth?: boolean } = {}): Promise<T> {
  const headers: Record<string, string> = {};
  const isForm = options.body instanceof FormData;
  if (options.body !== undefined && !isForm) headers["Content-Type"] = "application/json";
  if (options.auth !== false && session.token) headers.Authorization = `Bearer ${session.token}`;
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api${path}`, {
      method: options.method || (options.body !== undefined ? "POST" : "GET"),
      headers,
      body: isForm ? (options.body as FormData) : options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError("We couldn't reach our server. Check your connection, or email hello@globalpath.co.za.", 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) session.clear();
    throw new ApiError(data.error || "Something went wrong. Please try again.", res.status, data.fields || {}, data.missing || []);
  }
  return data as T;
}

/** Opens a protected file (e.g. an uploaded document) in a new tab. */
export async function openProtectedFile(path: string) {
  const res = await fetch(`${API_URL}/api${path}`, { headers: { Authorization: `Bearer ${session.token}` } });
  if (!res.ok) throw new ApiError("That file could not be opened.", res.status);
  const url = URL.createObjectURL(await res.blob());
  window.open(url, "_blank", "noopener");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
