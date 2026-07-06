import { NextResponse } from "next/server";
import { getSql } from "../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sql = getSql();
    const rows = await sql`SELECT count(*)::int AS submissions FROM hf_submission`;
    return NextResponse.json({ ok: true, db: "connected", submissions: rows[0].submissions });
  } catch (err) {
    return NextResponse.json(
      { ok: false, db: "unreachable", error: String(err.message || err) },
      { status: 500 }
    );
  }
}
