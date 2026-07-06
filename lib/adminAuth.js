// Shared-secret gate for the admin-only endpoints (responses + export).
// Set ADMIN_TOKEN in the environment (Vercel → Settings → Environment
// Variables, or .env.local locally). The admin page collects the token and
// sends it as `Authorization: Bearer <token>` or `?token=<token>`.
//
// Returns one of: "ok" | "unset" | "denied".
//  - "unset"  → ADMIN_TOKEN is not configured; we fail closed (deny) so the
//               data is never exposed by accident.
//  - "denied" → token missing or wrong.
export function adminAuth(req) {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return "unset";

  const url = new URL(req.url);
  const fromQuery = url.searchParams.get("token");
  const header = req.headers.get("authorization") || "";
  const fromHeader = header.startsWith("Bearer ") ? header.slice(7) : "";
  const provided = fromHeader || fromQuery || "";

  return provided && provided === expected ? "ok" : "denied";
}
