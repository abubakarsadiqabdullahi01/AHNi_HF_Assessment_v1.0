import ExcelJS from "exceljs";
import { getSql } from "../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AHNI_RED = "FFC8102E";

// Meta fields, in the order they appear on the form (lib/formModel.js META).
const META_COLS = [
  { key: "state", header: "State" },
  { key: "lgas", header: "LGA(s) covered" },
  { key: "assessor", header: "Assessor" },
  { key: "role", header: "Designation / role" },
  { key: "org", header: "Organisation" },
  { key: "period", header: "Reporting period" },
  { key: "date", header: "Assessment date" },
  { key: "sources", header: "Data sources" },
  { key: "partners", header: "Respondents / offices" },
];

function styleHeader(row) {
  row.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: AHNI_RED } };
  row.alignment = { vertical: "middle", horizontal: "left" };
  row.height = 20;
}

// GET /api/export  → downloads a formatted .xlsx of every submission.
export async function GET() {
  try {
    const sql = getSql();
    const rows = await sql`
      SELECT id, form_id, form_version, meta, answers,
             completion_pct, submitted_by, created_at
      FROM   hf_submission
      ORDER  BY created_at DESC`;

    const wb = new ExcelJS.Workbook();
    wb.creator = "AHNi Health Financing Assessment";
    wb.created = new Date();

    /* ---- Sheet 1: Submissions summary ---- */
    const s1 = wb.addWorksheet("Submissions", {
      views: [{ state: "frozen", ySplit: 1 }],
    });
    s1.columns = [
      { header: "ID", key: "id", width: 6 },
      ...META_COLS.map((c) => ({ header: c.header, key: c.key, width: 20 })),
      { header: "Completion %", key: "completion", width: 13 },
      { header: "Submitted at", key: "created_at", width: 22 },
    ];
    for (const r of rows) {
      const m = r.meta || {};
      s1.addRow({
        id: Number(r.id),
        ...Object.fromEntries(META_COLS.map((c) => [c.key, m[c.key] ?? ""])),
        completion: r.completion_pct != null ? Number(r.completion_pct) : "",
        created_at: r.created_at ? new Date(r.created_at).toISOString().replace("T", " ").slice(0, 19) : "",
      });
    }
    styleHeader(s1.getRow(1));
    s1.autoFilter = { from: "A1", to: { row: 1, column: s1.columnCount } };

    /* ---- Sheet 2: Answers (one row per answered field) ---- */
    const s2 = wb.addWorksheet("Answers", {
      views: [{ state: "frozen", ySplit: 1 }],
    });
    s2.columns = [
      { header: "Submission ID", key: "sid", width: 14 },
      { header: "State", key: "state", width: 16 },
      { header: "Assessor", key: "assessor", width: 20 },
      { header: "Field ID", key: "field", width: 16 },
      { header: "Answer", key: "value", width: 70 },
    ];
    for (const r of rows) {
      const m = r.meta || {};
      const answers = r.answers || {};
      const keys = Object.keys(answers).sort((a, b) => a.localeCompare(b));
      for (const k of keys) {
        const v = answers[k];
        s2.addRow({
          sid: Number(r.id),
          state: m.state ?? "",
          assessor: m.assessor ?? "",
          field: k,
          value: typeof v === "object" ? JSON.stringify(v) : String(v),
        });
      }
    }
    styleHeader(s2.getRow(1));
    s2.getColumn("value").alignment = { wrapText: true, vertical: "top" };
    s2.autoFilter = { from: "A1", to: { row: 1, column: s2.columnCount } };

    const buf = await wb.xlsx.writeBuffer();
    const stamp = new Date().toISOString().slice(0, 10);
    return new Response(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="AHNi-HealthFinancing-Responses-${stamp}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: String(err.message || err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
