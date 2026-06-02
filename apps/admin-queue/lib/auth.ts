/**
 * Wave 1 placeholder. Wave 2 introduces a real reviewer cookie session.
 */
export function getDevReviewer() {
  return {
    id: "admin-reviewer-1",
    email: "reviewer@example.com",
    role: "authenticator" as const
  };
}
