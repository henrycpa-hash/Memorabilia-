import { cookies } from "next/headers";

const base = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:4000";

const ACCESS_COOKIE = "cx_access";

async function bearerHeaders(): Promise<Record<string, string>> {
  const store = await cookies();
  const token = store.get(ACCESS_COOKIE)?.value;
  return token ? { authorization: `Bearer ${token}` } : {};
}

export async function authedGet<T>(path: string): Promise<T | null> {
  const res = await fetch(`${base}${path}`, {
    cache: "no-store",
    headers: await bearerHeaders()
  });
  if (!res.ok) return null;
  return (await res.json()) as T;
}

export async function publicGet<T>(path: string): Promise<T | null> {
  const res = await fetch(`${base}${path}`, { cache: "no-store" });
  if (!res.ok) return null;
  return (await res.json()) as T;
}

export async function clientPost<T>(path: string, body: unknown, token?: string): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`POST ${path} failed: ${res.status} :: ${text}`);
  }
  return (await res.json()) as T;
}

export const ACCESS_COOKIE_NAME = ACCESS_COOKIE;

/** Decode the signed-in user's id (JWT sub) from the session cookie, server-side. */
export async function currentUserId(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(ACCESS_COOKIE)?.value;
  if (!token) return null;
  try {
    return JSON.parse(Buffer.from(token.split(".")[1], "base64").toString()).sub as string;
  } catch {
    return null;
  }
}
