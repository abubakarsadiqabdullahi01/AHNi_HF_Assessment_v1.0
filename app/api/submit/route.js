import { NextResponse } from "next/server";
import { getSql } from "../../../lib/db";
import { REQUIRED_META } from "../../../lib/formModel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const meta = body?.meta ?? {};
  const answers = body?.answers ?? {};
  const completion = body?.completion_pct ?? null;

  if (!answers || typeof answers !== "object") {
    return NextResponse.json({ ok: false, error: "Missing answers object" }, { status: 400 });
  }

  // Reject submissions that omit the required identifying fields.
  const missing = REQUIRED_META.filter((id) => !meta || (meta[id] ?? "") === "");
  if (missing.length) {
    return NextResponse.json(
      { ok: false, error: `Missing required field(s): ${missing.join(", ")}` },
      { status: 400 }
    );
  }

  try {
    const sql = getSql();
    const rows = await sql`
      INSERT INTO hf_submission (form_id, form_version, meta, answers, completion_pct, submitted_by)
      VALUES (
        ${body?.form_id ?? "ahni_health_financing_situation_analysis"},
        ${body?.form_version ?? "1.0"},
        ${JSON.stringify(meta)}::jsonb,
        ${JSON.stringify(answers)}::jsonb,
        ${completion},
        ${meta?.assessor ?? null}
      )
      RETURNING id, created_at`;
    return NextResponse.json({ ok: true, id: rows[0].id, created_at: rows[0].created_at });
  } catch (err) {
    console.error("submit insert failed:", err);
    return NextResponse.json(
      { ok: false, error: "Database insert failed. Check DATABASE_URL and that the schema is created." },
      { status: 500 }
    );
  }
}
