import ExcelJS from "exceljs";
import { getSql } from "../../../../lib/db";
import { adminAuth } from "../../../../lib/adminAuth";
import { INSTRUMENTS, EXTRAS, GROUPS, instrumentById, instrumentDictionary, ANNEX_C, ANNEX_D } from "../../../../lib/mealModel";

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
    // ---- Group rows into responses (one wizard submission = one response) ----
    const respKey = (r) => {
      const m = r.meta || {};
      return m.batch || `k|${m.level}|${m.state}|${m.lga}|${m.facility}|${m.assessor}`;
    };
    const respMap = new Map();
    for (const r of rows) {
      const k = respKey(r);
      if (!respMap.has(k)) respMap.set(k, []);
      respMap.get(k).push(r);
    }
    // order responses by earliest submission; assign R1, R2, … labels
    const responses = [...respMap.entries()]
      .map(([k, rs]) => ({ k, rs, first: Math.min(...rs.map((r) => new Date(r.created_at).getTime())) }))
      .sort((a, b) => a.first - b.first);
    const respLabel = new Map();
    responses.forEach((g, i) => respLabel.set(g.k, `R${i + 1}`));

    // Sheet 1: one row per RESPONSE
    const s1 = wb.addWorksheet("Responses", { views: [{ state: "frozen", ySplit: 1 }] });
    s1.columns = [
      { header: "Response", key: "resp", width: 10 },
      { header: "Level", key: "level", width: 12 },
      ...HEADER_COLS.map(([k, h]) => ({ header: h, key: k, width: 18 })),
      { header: "Instruments", key: "instruments", width: 18 },
      { header: "Submitted at", key: "created_at", width: 22 },
    ];
    for (const g of responses) {
      const m = g.rs[0].meta || {};
      const latest = Math.max(...g.rs.map((r) => new Date(r.created_at).getTime()));
      s1.addRow({
        resp: respLabel.get(g.k), level: m.level ?? "Ungrouped",
        ...Object.fromEntries(HEADER_COLS.map(([k]) => [k, m[k] ?? ""])),
        instruments: g.rs.map((r) => r.instrument).sort((a, b) => a - b).join(", "),
        created_at: new Date(latest).toISOString().replace("T", " ").slice(0, 19),
      });
    }
    styleHeader(s1.getRow(1));
    s1.autoFilter = { from: "A1", to: { row: 1, column: s1.columnCount } };

    // Answer sheets per LEVEL, organised into contiguous response blocks (R1, R2…)
    const levelOrder = [...GROUPS.map((g) => g.level), "Ungrouped"];
    for (const level of levelOrder) {
      const lvlResponses = responses.filter((g) => (g.rs[0].meta?.level ?? "Ungrouped") === level);
      if (!lvlResponses.length) continue;
      const ws = wb.addWorksheet(level.slice(0, 31), { views: [{ state: "frozen", ySplit: 1 }] });
      ws.columns = [
        { header: "Response", key: "resp", width: 9 },
        { header: "Assessor", key: "assessor", width: 16 },
        { header: "Facility", key: "facility", width: 16 },
        { header: "Instrument", key: "instrument", width: 11 },
        { header: "Field ID", key: "field", width: 18 },
        { header: "Question", key: "question", width: 50 },
        { header: "Answer", key: "value", width: 40 },
      ];
      for (const g of lvlResponses) {
        const label = respLabel.get(g.k);
        const m0 = g.rs[0].meta || {};
        const sorted = [...g.rs].sort((a, b) => a.instrument - b.instrument || Number(a.id) - Number(b.id));
        for (const r of sorted) {
          const answers = r.answers || {};
          Object.keys(answers).sort().forEach((k) => {
            const v = answers[k];
            ws.addRow({
              resp: label, assessor: m0.assessor ?? "", facility: m0.facility ?? "", instrument: r.instrument,
              field: k, question: labelFor(r.instrument, k),
              value: typeof v === "object" ? JSON.stringify(v) : String(v),
            });
          });
        }
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
