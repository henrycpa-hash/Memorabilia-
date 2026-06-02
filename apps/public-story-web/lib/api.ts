const base = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:4000";

export async function publicGet<T>(path: string): Promise<T | null> {
  const res = await fetch(`${base}${path}`, { cache: "no-store" });
  if (!res.ok) return null;
  return (await res.json()) as T;
}
