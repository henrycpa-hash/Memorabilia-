export function bearer(token?: string): Record<string, string> {
  return token ? { authorization: `Bearer ${token}` } : {};
}

export function passthroughAuth(headers: Record<string, string | string[] | undefined>): Record<string, string> {
  const auth = headers.authorization;
  if (typeof auth === "string") return { authorization: auth };
  return {};
}
