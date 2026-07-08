"use client";

// Admin viewer — direct-URL, token-gated. Switches between Health Financing and
// MEAL. MEAL rows submitted together (one wizard "Submit all") are grouped into
// a single response; View opens a full-screen readable page (questions +
// answers, no field ids).

import { useCallback, useEffect, useMemo, useState } from "react";
import { META as HF_META, fieldDictionary } from "../../lib/formModel";
import { HEADER as MEAL_HEADER, instrumentById, instrumentDictionary } from "../../lib/mealModel";

const TOKEN_KEY = "ahni_admin_token";
const HF_DICT = fieldDictionary();

const DATASETS = {
  hf: { label: "Health Financing", list: "/api/responses", export: "/api/export" },
  meal: { label: "MEAL", list: "/api/meal/responses", export: "/api/meal/export" },
};

const HF_META_LABEL = Object.fromEntries(HF_META.map((f) => [f.id, f.label]));
const MEAL_META_LABEL = { ...Object.fromEntries(MEAL_HEADER.map((f) => [f.id, f.label])), level: "Level" };

// dictionary of question labels for a submission's answers
const answerRows = (dataset, sub) => {
  const dict = dataset === "meal" ? instrumentDictionary(instrumentById(sub.instrument) || { id: sub.instrument, type: "" }) : HF_DICT;
  return Object.entries(sub.answers || {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => ({ q: dict[k]?.question || k, a: typeof v === "object" ? JSON.stringify(v) : String(v) }));
};

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [authed, setAuthed] = useState(false);
  const [tokenInput, setTokenInput] = useState("");
  const [dataset, setDataset] = useState("hf");
  const [list, setList] = useState(null);
  const [err, setErr] = useState("");
  const [viewing, setViewing] = useState(null); // { rep, subs }
  const [loadingView, setLoadingView] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [mealFilter, setMealFilter] = useState("");

  const load = useCallback(async (tok, ds) => {
    setErr("");
    try {
      const res = await fetch(DATASETS[ds].list, { cache: "no-store", headers: { Authorization: `Bearer ${tok}` } });
      if (res.status === 401) { setAuthed(false); setErr("Incorrect access token."); return false; }
      const data = await res.json();
      if (data.ok) { setList(data.submissions); setAuthed(true); return true; }
      setErr(data.error || "Failed to load"); return false;
    } catch { setErr("Network error — is the server/database reachable?"); return false; }
  }, []);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? sessionStorage.getItem(TOKEN_KEY) : "";
    if (saved) { setToken(saved); load(saved, "hf").then((ok) => { if (!ok) sessionStorage.removeItem(TOKEN_KEY); }); }
  }, [load]);

  const switchDataset = (ds) => {
    if (ds === dataset) return;
    setDataset(ds); setList(null); setViewing(null); setSelected(new Set()); setMealFilter("");
    load(token, ds);
  };

  const signIn = async (e) => {
    e.preventDefault();
    const t = tokenInput.trim(); if (!t) return;
    const ok = await load(t, dataset);
    if (ok) { setToken(t); try { sessionStorage.setItem(TOKEN_KEY, t); } catch {} setTokenInput(""); }
  };
  const signOut = () => { try { sessionStorage.removeItem(TOKEN_KEY); } catch {} setToken(""); setAuthed(false); setList(null); setViewing(null); setErr(""); };

  const visible = useMemo(() => {
    if (!list) return [];
    if (dataset === "meal" && mealFilter) return list.filter((r) => (r.level || "Ungrouped") === mealFilter);
    return list;
  }, [list, dataset, mealFilter]);

  const levelsInList = useMemo(() => {
    if (dataset !== "meal" || !list) return [];
    return [...new Set(list.map((r) => r.level || "Ungrouped"))].sort();
  }, [list, dataset]);

  // Group into responses. HF: one row = one response. MEAL: group by batch
  // (fallback composite key for older rows submitted before batch ids).
  const responses = useMemo(() => {
    if (dataset === "hf") return visible.map((r) => ({ key: `hf${r.id}`, rows: [r] }));
    const map = new Map();
    for (const r of visible) {
      const key = r.batch || `k|${r.level}|${r.state}|${r.lga}|${r.facility}|${r.assessor}`;
      if (!map.has(key)) map.set(key, { key, rows: [] });
      map.get(key).rows.push(r);
    }
    return [...map.values()].sort((a, b) => new Date(latest(b)) - new Date(latest(a)));
  }, [visible, dataset]);

  const latest = (g) => g.rows.reduce((m, r) => (new Date(r.created_at) > new Date(m) ? r.created_at : m), g.rows[0].created_at);
  const idsOf = (g) => g.rows.map((r) => r.id);
  const allVisibleIds = useMemo(() => responses.flatMap(idsOf), [responses]);

  const openGroup = async (g) => {
    setLoadingView(true); setViewing({ rep: g.rows[0], subs: null, g });
    try {
      const subs = [];
      for (const id of idsOf(g)) {
        const res = await fetch(`${DATASETS[dataset].list}?id=${id}`, { cache: "no-store", headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (data.ok) subs.push(data.submission);
      }
      subs.sort((a, b) => String(a.instrument || "").localeCompare(String(b.instrument || "")));
      setViewing({ rep: g.rows[0], subs, g });
    } catch { setErr("Network error loading response"); setViewing(null); }
    finally { setLoadingView(false); }
  };

  const removeGroup = async (g) => {
    const ids = idsOf(g);
    if (!confirm(`Delete this response (${ids.length} record${ids.length === 1 ? "" : "s"})? This cannot be undone.`)) return;
    setErr("");
    try {
      for (const id of ids) {
        await fetch(`${DATASETS[dataset].list}?id=${id}`, { method: "DELETE", cache: "no-store", headers: { Authorization: `Bearer ${token}` } });
      }
      setList((prev) => (prev || []).filter((r) => !ids.includes(r.id)));
      setSelected((prev) => { const n = new Set(prev); ids.forEach((id) => n.delete(String(id))); return n; });
      if (viewing) setViewing(null);
    } catch { setErr("Network error while deleting"); }
  };

  const exportXlsx = async (ids) => {
    setErr("");
    try {
      const qs = ids && ids.length ? `?ids=${ids.join(",")}` : "";
      const res = await fetch(`${DATASETS[dataset].export}${qs}`, { cache: "no-store", headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setErr(d.error || `Export failed (${res.status})`); return; }
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") || "";
      const m = cd.match(/filename="?([^"]+)"?/);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = m ? m[1] : `AHNi-${dataset}.xlsx`;
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch { setErr("Network error while exporting"); }
  };

  const toggleGroup = (g) => setSelected((p) => {
    const ids = idsOf(g).map(String); const n = new Set(p);
    const all = ids.every((id) => n.has(id));
    ids.forEach((id) => (all ? n.delete(id) : n.add(id)));
    return n;
  });
  const toggleAll = () => setSelected((p) => {
    const ids = allVisibleIds.map(String);
    const all = ids.length > 0 && ids.every((id) => p.has(id));
    return all ? new Set() : new Set(ids);
  });
  const groupSelected = (g) => idsOf(g).every((id) => selected.has(String(id)));

  const fmt = (t) => (t ? new Date(t).toLocaleString() : "—");

  /* ---- login ---- */
  if (!authed) {
    return (
      <div style={S.page}>
        <div style={{ maxWidth: 380, margin: "12vh auto 0" }}>
          <div style={S.eyebrow}>AHNi · Assessments</div>
          <h1 style={S.h1}>Admin access</h1>
          <p style={S.muted}>Enter the access token to view submitted responses.</p>
          <form onSubmit={signIn} style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            <input type="password" autoFocus value={tokenInput} onChange={(e) => setTokenInput(e.target.value)} placeholder="Access token" style={S.input} />
            <button type="submit" style={{ ...S.btn, ...S.primary }}>Enter</button>
          </form>
          {err && <div style={S.err}>{err}</div>}
        </div>
      </div>
    );
  }

  /* ---- full-screen response view ---- */
  if (viewing) {
    const { rep, subs, g } = viewing;
    const meta = subs && subs[0] ? subs[0].meta : rep;
    const metaLabel = dataset === "meal" ? MEAL_META_LABEL : HF_META_LABEL;
    return (
      <div style={S.page}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <button style={S.btn} onClick={() => setViewing(null)}>← Back to list</button>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ ...S.btn, ...S.primary }} onClick={() => exportXlsx(idsOf(g))}>Export this response</button>
            <button style={{ ...S.btn, ...S.dangerBtn }} onClick={() => removeGroup(g)}>Delete</button>
          </div>
        </div>

        <div style={S.eyebrow}>{dataset === "meal" ? `${rep.level || "Response"} assessment` : "Health Financing response"}</div>
        <h1 style={S.h1}>
          {dataset === "meal" ? `${rep.facility || "—"} · ${rep.lga || ""} ${rep.state || ""}` : `${rep.state || "—"} · ${rep.assessor || ""}`}
        </h1>
        <p style={S.muted}>Submitted {fmt(latest(g))}{dataset === "meal" ? ` · ${g.rows.length} instrument(s)` : ""}</p>

        {/* site header / metadata */}
        <div style={S.section}>
          <h3 style={S.h3}>Site details</h3>
          <div style={S.metaGrid}>
            {Object.entries(meta || {}).filter(([k]) => k !== "batch").map(([k, v]) => (
              <div key={k} style={S.metaItem}>
                <span style={S.metaKey}>{metaLabel[k] || k}</span>
                <span style={S.metaVal}>{String(v)}</span>
              </div>
            ))}
          </div>
        </div>

        {loadingView && <p style={S.muted}>Loading full response…</p>}

        {subs && subs.map((sub) => {
          const rows = answerRows(dataset, sub);
          const inst = dataset === "meal" ? instrumentById(sub.instrument) : null;
          return (
            <div key={sub.id} style={S.section}>
              <h3 style={S.h3}>
                {dataset === "meal" ? `Instrument ${sub.instrument}${inst ? " — " + inst.title : ""}` : "Responses"}
                <span style={{ ...S.muted, fontWeight: 400, marginLeft: 8 }}>({rows.length} answered)</span>
              </h3>
              {rows.length === 0 ? (
                <p style={S.muted}>No answers recorded.</p>
              ) : (
                <table style={S.qaTable}>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} style={S.tr}>
                        <td style={S.qCell}>{r.q}</td>
                        <td style={S.aCell}>{r.a}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  /* ---- list ---- */
  const isMeal = dataset === "meal";
  const headers = isMeal
    ? ["Level", "State", "LGA", "Facility", "Assessor", "Instruments"]
    : ["#", "State", "Assessor", "Period", "Assessment date", "Complete"];

  const cells = (g) => {
    const r = g.rows[0];
    if (!isMeal) return [r.id, r.state, r.assessor, r.period, r.assessment_date, r.completion_pct != null ? `${r.completion_pct}%` : "—"];
    const nums = g.rows.map((x) => x.instrument).sort((a, b) => a - b).join(", ");
    return [r.level || "Ungrouped", r.state, r.lga, r.facility, r.assessor, `${g.rows.length} (${nums})`];
  };

  return (
    <div style={S.page}>
      <div style={S.head}>
        <div><div style={S.eyebrow}>AHNi · Assessments</div><h1 style={S.h1}>Submitted responses</h1></div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={S.btn} onClick={() => load(token, dataset)}>Refresh</button>
          <button style={{ ...S.btn, ...S.primary }} onClick={() => exportXlsx(selected.size ? [...selected] : null)}>
            {selected.size ? `Export selected (${selected.size})` : "Export all"}
          </button>
          <button style={S.btn} onClick={signOut}>Sign out</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 14, alignItems: "center" }}>
        {Object.entries(DATASETS).map(([key, d]) => (
          <button key={key} onClick={() => switchDataset(key)} style={{ ...S.tab, ...(dataset === key ? S.tabActive : {}) }}>{d.label}</button>
        ))}
        {isMeal && levelsInList.length > 0 && (
          <select value={mealFilter} onChange={(e) => setMealFilter(e.target.value)} style={{ ...S.input, marginLeft: "auto", padding: "6px 10px" }}>
            <option value="">All levels</option>
            {levelsInList.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        )}
      </div>

      {err && <div style={S.err}>{err}</div>}
      {!list && !err && <p style={S.muted}>Loading…</p>}
      {list && <p style={S.muted}>{responses.length} response{responses.length === 1 ? "" : "s"}{isMeal ? ` · ${visible.length} records` : ""}</p>}

      {list && responses.length > 0 && (
        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}><input type="checkbox" checked={allVisibleIds.length > 0 && allVisibleIds.every((id) => selected.has(String(id)))} onChange={toggleAll} /></th>
                {headers.map((h) => <th key={h} style={S.th}>{h}</th>)}
                <th style={S.th}>Submitted</th>
                <th style={S.th}></th>
              </tr>
            </thead>
            <tbody>
              {responses.map((g) => (
                <tr key={g.key} style={S.tr}>
                  <td style={S.td}><input type="checkbox" checked={groupSelected(g)} onChange={() => toggleGroup(g)} /></td>
                  {cells(g).map((c, i) => <td key={i} style={S.td}>{c || "—"}</td>)}
                  <td style={S.td}>{fmt(latest(g))}</td>
                  <td style={S.td}>
                    <div style={{ display: "flex", gap: 12 }}>
                      <button style={S.link} onClick={() => openGroup(g)}>View</button>
                      <button style={S.link} onClick={() => exportXlsx(idsOf(g))}>Export</button>
                      <button style={{ ...S.link, ...S.danger }} onClick={() => removeGroup(g)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const RED = "#C8102E";
const S = {
  page: { maxWidth: 1100, margin: "0 auto", padding: "28px 20px 80px", fontFamily: "system-ui, sans-serif", color: "#1a1a1a" },
  head: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, marginBottom: 18, borderBottom: "1px solid #e5e7eb", paddingBottom: 14 },
  eyebrow: { fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", color: RED, fontWeight: 700 },
  h1: { margin: "4px 0 0", fontSize: 24 },
  h3: { margin: "0 0 10px", fontSize: 15, color: "#111", fontWeight: 700 },
  muted: { color: "#6b7280", fontSize: 13 },
  err: { background: "#FEF2F2", border: "1px solid #FCA5A5", color: "#991B1B", padding: "10px 12px", borderRadius: 8, margin: "10px 0", fontSize: 13 },
  btn: { background: "#fff", border: "1px solid #d1d5db", borderRadius: 7, padding: "7px 14px", fontSize: 13, cursor: "pointer" },
  primary: { background: RED, borderColor: RED, color: "#fff", fontWeight: 600 },
  tab: { background: "#fff", border: "1px solid #d1d5db", borderRadius: 999, padding: "6px 16px", fontSize: 13, cursor: "pointer", fontWeight: 600, color: "#374151" },
  tabActive: { background: RED, borderColor: RED, color: "#fff" },
  input: { border: "1px solid #d1d5db", borderRadius: 7, padding: "9px 12px", fontSize: 14 },
  link: { background: "none", border: "none", color: RED, fontWeight: 600, cursor: "pointer", fontSize: 13, padding: 0 },
  danger: { color: "#B00020" },
  dangerBtn: { color: "#B00020", borderColor: "#F1B0B7" },
  tableWrap: { overflowX: "auto", border: "1px solid #e5e7eb", borderRadius: 8, marginTop: 8 },
  table: { borderCollapse: "collapse", width: "100%", fontSize: 13 },
  th: { textAlign: "left", padding: "8px 10px", background: "#F7F8F9", borderBottom: "1px solid #e5e7eb", fontWeight: 700, whiteSpace: "nowrap" },
  tr: { borderBottom: "1px solid #f0f1f3" },
  td: { padding: "8px 10px", verticalAlign: "top" },
  section: { marginTop: 22, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "16px 18px" },
  metaGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "8px 18px" },
  metaItem: { display: "flex", flexDirection: "column" },
  metaKey: { fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: ".04em", fontWeight: 600 },
  metaVal: { fontSize: 14 },
  qaTable: { borderCollapse: "collapse", width: "100%", fontSize: 13 },
  qCell: { padding: "8px 10px", width: "55%", verticalAlign: "top", borderBottom: "1px solid #f0f1f3", color: "#374151" },
  aCell: { padding: "8px 10px", verticalAlign: "top", borderBottom: "1px solid #f0f1f3", fontWeight: 600 },
};
