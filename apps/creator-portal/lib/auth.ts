/**
 * Wave 1 placeholder: Wave 2 will introduce a real JWT cookie session
 * with login/logout helpers. For now everything is open in dev mode.
 */
export function getDevUser() {
  return {
    id: "dev-creator-user",
    email: "athlete@example.com",
    role: "creator" as const
  };
}
