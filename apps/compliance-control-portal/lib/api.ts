import { cookies } from "next/headers";

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:4000";

export async function authedGet<T>(path: string): Promise<T | null> {
  const jar = cookies();
  const token = jar.get("cx_access")?.value;
  if (!token) return null;
  try {
    const res = await fetch(`${GATEWAY_URL}${path}`, {
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store"
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function publicGet<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${GATEWAY_URL}${path}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}
