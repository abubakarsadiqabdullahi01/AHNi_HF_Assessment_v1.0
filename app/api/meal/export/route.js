import ExcelJS from "exceljs";
import { getSql } from "../../../../lib/db";
import { adminAuth } from "../../../../lib/adminAuth";
import { INSTRUMENTS, EXTRAS, instrumentById, instrumentDictionary, ANNEX_C, ANNEX_D } from "../../../../lib/mealModel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AHNI_RED = "FFC8102E";
const HEADER_COLS = [
  ["state", "State"], ["lga", "LGA"], ["facility", "Facility/office"], ["facility_code", "Facility code"],
  ["tier", "Tier"], ["modality", "Modality"], ["respondent_role", "Respondent role"],
  ["date", "Date"], ["assessor", "Assessor"], ["supervisor_check", "Supervisor check"],
];

function styleHeader(row) {
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: AHNI_RED } };
}

// Readable question for a MEAL field id, per instrument.
function labelFor(instrument, fieldId) {
  const inst = instrumentById(instrument);
  if (inst) {
    const d = instrumentDictionary(inst);
    if (d[fieldId]) return d[fieldId].question;
  }
  if (instrument === "annexC") {
    const m = fieldId.match(/^annexC-r(\d+)-(.+)$/);
    if (m) {
      const col = ANNEX_C.cols.find((c) => c.key === m[2]);
      return `Row ${Number(m[1]) + 1} — ${col ? col.label : m[2]}`;
    }
    if (fieldId === "annexC-rows") return "Row count";
  }
  if (instrument === "annexD") {
    let m = fieldId.match(/^annexD-(.+)-name$/);
    if (m) { const r = ANNEX_D.roster.find((x) => x.key === m[1]); return `Roster — ${r ? r.role : m[1]}`; }
    m = fieldId.match(/^annexD-chk-(\d+)$/);
    if (m) return `QA checklist — ${ANNEX_D.checklist[Number(m[1])] || m[1]}`;
  }
  return fieldId;
}

function titleFor(instrument) {
  return instrumentById(instrument)?.title || EXTRAS.find((e) => e.id === instrument)?.title || instrument;
}

export async function GET(req) {
  const state = adminAuth(req);
  if (state === "unset")
    return new Response(JSON.stringify({ ok: false, error: "Admin access is not configured (set ADMIN_TOKEN)." }), { status: 503, headers: { "Content-Type": "application/json" } });
  if (state === "denied")
    return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

  const idsParam = new URL(req.url).searchParams.get("ids");
  const ids = idsParam ? idsParam.split(",").map((s) => Number(s.trim())).filter((n) => Number.isInteger(n) && n > 0) : null;

  try {
    const sql = getSql();
    const rows = ids && ids.length
      ? await sql`SELECT id, instrument, meta, answers, completion_pct, created_at FROM meal_submission WHERE id = ANY(${ids}) ORDER BY instrument, created_at`
      : await sql`SELECT id, instrument, meta, answers, completion_pct, created_at FROM meal_submission ORDER BY instrument, created_at`;

    const wb = new ExcelJS.Workbook();
    wb.creator = "AHNi MEAL Rapid Assessment";
    wb.created = new Date();

    // Sheet 1: Submissions summary (all instruments)
    const s1 = wb.addWorksheet("Submissions", { views: [{ state: "frozen", ySplit: 1 }] });
    s1.columns = [
      { header: "ID", key: "id", width: 6 },
      { header: "Instrument", key: "instrument", width: 12 },
      ...HEADER_COLS.map(([k, h]) => ({ header: h, key: k, width: 18 })),
      { header: "Completion %", key: "completion", width: 12 },
      { header: "Submitted at", key: "created_at", width: 22 },
    ];
    for (const r of rows) {
      const m = r.meta || {};
      s1.addRow({
        id: Number(r.id), instrument: r.instrument,
        ...Object.fromEntries(HEADER_COLS.map(([k]) => [k, m[k] ?? ""])),
        completion: r.completion_pct != null ? Number(r.completion_pct) : "",
        created_at: r.created_at ? new Date(r.created_at).toISOString().replace("T", " ").slice(0, 19) : "",
      });
    }
    styleHeader(s1.getRow(1));
    s1.autoFilter = { from: "A1", to: { row: 1, column: s1.columnCount } };

    // One answer sheet per instrument that has data
    const order = [...INSTRUMENTS.map((i) => i.id), ...EXTRAS.map((e) => e.id)];
    for (const instId of order) {
      const instRows = rows.filter((r) => r.instrument === instId);
      if (!instRows.length) continue;
      const sheetName = (instrumentById(instId) ? `Inst ${instId}` : instId).slice(0, 31);
      const ws = wb.addWorksheet(sheetName, { views: [{ state: "frozen", ySplit: 1 }] });
      ws.columns = [
        { header: "Submission ID", key: "sid", width: 13 },
        { header: "State", key: "state", width: 14 },
        { header: "LGA", key: "lga", width: 14 },
        { header: "Facility", key: "facility", width: 18 },
        { header: "Field ID", key: "field", width: 22 },
        { header: "Question", key: "question", width: 55 },
        { header: "Answer", key: "value", width: 45 },
      ];
      for (const r of instRows) {
        const m = r.meta || {};
        const answers = r.answers || {};
        Object.keys(answers).sort().forEach((k) => {
          const v = answers[k];
          ws.addRow({
            sid: Number(r.id), state: m.state ?? "", lga: m.lga ?? "", facility: m.facility ?? "",
            field: k, question: labelFor(instId, k),
            value: typeof v === "object" ? JSON.stringify(v) : String(v),
          });
        });
      }
      styleHeader(ws.getRow(1));
      ws.getColumn("question").alignment = { wrapText: true, vertical: "top" };
      ws.getColumn("value").alignment = { wrapText: true, vertical: "top" };
      ws.autoFilter = { from: "A1", to: { row: 1, column: ws.columnCount } };
    }

    const buf = await wb.xlsx.writeBuffer();
    const stamp = new Date().toISOString().slice(0, 10);
    const scope = ids && ids.length ? (ids.length === 1 ? `record-${ids[0]}` : `${ids.length}-records`) : "all";
    return new Response(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="AHNi-MEAL-${scope}-${stamp}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err.message || err) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
