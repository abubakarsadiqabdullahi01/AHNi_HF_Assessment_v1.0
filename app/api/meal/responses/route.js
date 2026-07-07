import { NextResponse } from "next/server";
import { getSql } from "../../../../lib/db";
import { adminAuth } from "../../../../lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function guard(req) {
  const state = adminAuth(req);
  if (state === "unset")
    return NextResponse.json({ ok: false, error: "Admin access is not configured (set ADMIN_TOKEN)." }, { status: 503 });
  if (state === "denied")
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  return null;
}

export async function GET(req) {
  const denied = guard(req);
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  try {
    const sql = getSql();
    if (id) {
      const rows = await sql`
        SELECT id, instrument, form_id, form_version, meta, answers,
               completion_pct, submitted_by, created_at
        FROM   meal_submission WHERE id = ${id}`;
      if (!rows.length) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
      return NextResponse.json({ ok: true, submission: rows[0] });
    }
    const rows = await sql`
      SELECT id, instrument, state, lga, facility, tier,
             meta->>'assessor'  AS assessor,
             assessment_date_text AS assessment_date,
             completion_pct, created_at
      FROM   meal_submission
      ORDER  BY created_at DESC
      LIMIT  1000`;
    return NextResponse.json({ ok: true, count: rows.length, submissions: rows });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err.message || err) }, { status: 500 });
  }
}

export async function DELETE(req) {
  const denied = guard(req);
  if (denied) return denied;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

  try {
    const sql = getSql();
    const rows = await sql`DELETE FROM meal_submission WHERE id = ${id} RETURNING id`;
    if (!rows.length) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true, id: rows[0].id });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err.message || err) }, { status: 500 });
  }
}
