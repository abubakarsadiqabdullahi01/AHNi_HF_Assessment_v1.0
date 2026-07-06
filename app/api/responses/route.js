import { NextResponse } from "next/server";
import { getSql } from "../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Read-only listing of submissions for the admin view.
// Reachable only by direct URL — it is NOT linked from the questionnaire.
// Pass ?id=<n> to fetch a single submission with its full answers.
export async function GET(req) {
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
