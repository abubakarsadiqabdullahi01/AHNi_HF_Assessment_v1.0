import { NextResponse } from "next/server";
import { getSql } from "../../../lib/db";
import { adminAuth } from "../../../lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function guard(req) {
  const state = adminAuth(req);
  if (state === "unset")
    return NextResponse.json(
      { ok: false, error: "Admin access is not configured (set ADMIN_TOKEN)." },
      { status: 503 }
    );
  if (state === "denied")
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  return null;
}

// Read-only listing of submissions for the admin view.
// Reachable only by direct URL — it is NOT linked from the questionnaire.
// Pass ?id=<n> to fetch a single submission with its full answers.
export async function GET(req) {
  const denied = guard(req);
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  try {
    const sql = getSql();

    if (id) {
      const rows = await sql`
        SELECT id, form_id, form_version, meta, answers,
               completion_pct, submitted_by, created_at
        FROM   hf_submission
        WHERE  id = ${id}`;
      if (!rows.length) {
        return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
      }
      return NextResponse.json({ ok: true, submission: rows[0] });
    }

    const rows = await sql`
      SELECT id,
             meta->>'state'    AS state,
             meta->>'assessor' AS assessor,
             meta->>'period'   AS period,
             assessment_date_text AS assessment_date,
             completion_pct,
             created_at
      FROM   hf_submission
      ORDER  BY created_at DESC
      LIMIT  500`;
    return NextResponse.json({ ok: true, count: rows.length, submissions: rows });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err.message || err) },
      { status: 500 }
    );
  }
}
