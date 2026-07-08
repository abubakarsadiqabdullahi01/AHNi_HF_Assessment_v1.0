"use client";

// Admin response viewer — reachable only by navigating directly to /admin.
// Not linked from either questionnaire. Read-only + delete + Excel export,
// gated by ADMIN_TOKEN. Switches between the Health Financing and MEAL datasets.

import { useCallback, useEffect, useMemo, useState } from "react";

const TOKEN_KEY = "ahni_admin_token";

const DATASETS = {
  hf: { label: "Health Financing", list: "/api/responses", export: "/api/export" },
  meal: { label: "MEAL", list: "/api/meal/responses", export: "/api/meal/export" },
};

// Columns per dataset: [header, accessor(row)]
const COLUMNS = {
  hf: [
    ["State", (r) => r.state], ["Assessor", (r) => r.assessor], ["Period", (r) => r.period],
    ["Assessment date", (r) => r.assessment_date], ["Complete", (r) => (r.completion_pct != null ? `${r.completion_pct}%` : "—")],
  ],
  meal: [
    ["Level", (r) => r.level], ["Instrument", (r) => r.instrument], ["State", (r) => r.state],
    ["LGA", (r) => r.lga], ["Facility", (r) => r.facility], ["Tier", (r) => r.tier], ["Assessor", (r) => r.assessor],
  ],
};

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [authed, setAuthed] = useState(false);
  const [tokenInput, setTokenInput] = useState("");
  const [dataset, setDataset] = useState("hf");
  const [list, setList] = useState(null);
  const [err, setErr] = useState("");
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [mealFilter, setMealFilter] = useState(""); // level filter (States/LGA/Facilities)

  const load = useCallback(async (tok, ds) => {
    setErr("");
    try {
      const res = await fetch(DATASETS[ds].list, { cache: "no-store", headers: { Authorization: `Bearer ${tok}` } });
      if (res.status === 401) { setAuthed(false); setErr("Incorrect access token."); return false; }
      const data = await res.json();
      if (data.ok) { setList(data.submissions); setAuthed(true); return true; }
      setErr(data.error || "Failed to load");
      return false;
    } catch {
      setErr("Network error — is the server/database reachable?");
      return false;
    }
  }, []);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? sessionStorage.getItem(TOKEN_KEY) : "";
    if (saved) { setToken(saved); load(saved, "hf").then((ok) => { if (!ok) sessionStorage.removeItem(TOKEN_KEY); }); }
  }, [load]);

  const switchDataset = (ds) => {
    if (ds === dataset) return;
    setDataset(ds); setList(null); setDetail(null); setSelected(new Set()); setMealFilter("");
    load(token, ds);
  };

  const signIn = async (e) => {
    e.preventDefault();
    const t = tokenInput.trim();
    if (!t) return;
    const ok = await load(t, dataset);
    if (ok) { setToken(t); try { sessionStorage.setItem(TOKEN_KEY, t); } catch {} setTokenInput(""); }
  };

  const signOut = () => {
    try { sessionStorage.removeItem(TOKEN_KEY); } catch {}
    setToken(""); setAuthed(false); setList(null); setDetail(null); setErr("");
  };

  const open = async (id) => {
    setLoadingDetail(true); setDetail(null);
    try {
      const res = await fetch(`${DATASETS[dataset].list}?id=${id}`, { cache: "no-store", headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.ok) setDetail(data.submission); else setErr(data.error || "Failed to load submission");
    } catch { setErr("Network error loading submission"); }
    finally { setLoadingDetail(false); }
  };

  const remove = async (id) => {
    if (!confirm(`Delete submission #${id}? This cannot be undone.`)) return;
    setErr("");
    try {
      const res = await fetch(`${DATASETS[dataset].list}?id=${id}`, { method: "DELETE", cache: "no-store", headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setList((prev) => (prev || []).filter((r) => String(r.id) !== String(id)));
        setSelected((prev) => { const n = new Set(prev); n.delete(String(id)); return n; });
        if (detail && String(detail.id) === String(id)) setDetail(null);
      } else setErr(data.error || `Delete failed (${res.status})`);
    } catch { setErr("Network error while deleting"); }
  };

  const exportXlsx = async (ids) => {
    setErr("");
    try {
      const qs = ids && ids.length ? `?ids=${ids.join(",")}` : "";
      const res = await fetch(`${DATASETS[dataset].export}${qs}`, { cache: "no-store", headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) { const data = await res.json().catch(() => ({})); setErr(data.error || `Export failed (${res.status})`); return; }
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") || "";
      const m = cd.match(/filename="?([^"]+)"?/);
      const name = m ? m[1] : `AHNi-${dataset}-export.xlsx`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = name;
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch { setErr("Network error while exporting"); }
  };

  const visible = useMemo(() => {
    if (!list) return [];
    if (dataset === "meal" && mealFilter) return list.filter((r) => (r.level || "Ungrouped") === mealFilter);
    return list;
  }, [list, dataset, mealFilter]);

  const levelsInList = useMemo(() => {
    if (dataset !== "meal" || !list) return [];
    return [...new Set(list.map((r) => r.level || "Ungrouped"))].sort();
  }, [list, dataset]);

  const toggleRow = (id) => setSelected((p) => { const n = new Set(p); const k = String(id); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const toggleAll = () => setSelected((p) => {
    const ids = visible.map((r) => String(r.id));
    const all = ids.length > 0 && ids.every((id) => p.has(id));
    return all ? new Set() : new Set(ids);
  });

  const fmt = (t) => (t ? new Date(t).toLocaleString() : "—");
  const cols = COLUMNS[dataset];

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

  return (
    <div style={S.page}>
      <div style={S.head}>
        <div>
          <div style={S.eyebrow}>AHNi · Assessments</div>
          <h1 style={S.h1}>Submitted responses</h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={S.btn} onClick={() => load(token, dataset)}>Refresh</button>
          <button style={{ ...S.btn, ...S.primary }} onClick={() => exportXlsx(selected.size ? [...selected] : null)}>
            {selected.size ? `Export selected (${selected.size})` : "Export all"}
          </button>
          <button style={S.btn} onClick={signOut}>Sign out</button>
        </div>
      </div>

      {/* dataset toggle */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {Object.entries(DATASETS).map(([key, d]) => (
          <button key={key} onClick={() => switchDataset(key)}
            style={{ ...S.tab, ...(dataset === key ? S.tabActive : {}) }}>
            {d.label}
          </button>
        ))}
        {dataset === "meal" && levelsInList.length > 0 && (
          <select value={mealFilter} onChange={(e) => setMealFilter(e.target.value)} style={{ ...S.input, marginLeft: "auto", padding: "6px 10px" }}>
            <option value="">All levels</option>
            {levelsInList.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        )}
      </div>

      {err && <div style={S.err}>{err}</div>}
      {!list && !err && <p style={S.muted}>Loading…</p>}
      {list && <p style={S.muted}>{visible.length} submission{visible.length === 1 ? "" : "s"}</p>}

      {list && visible.length > 0 && (
        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>
                  <input type="checkbox" aria-label="Select all" checked={visible.length > 0 && visible.every((r) => selected.has(String(r.id)))} onChange={toggleAll} />
                </th>
                <th style={S.th}>#</th>
                {cols.map(([h]) => <th key={h} style={S.th}>{h}</th>)}
                <th style={S.th}>Submitted</th>
                <th style={S.th}></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id} style={S.tr}>
                  <td style={S.td}><input type="checkbox" checked={selected.has(String(r.id))} onChange={() => toggleRow(r.id)} /></td>
                  <td style={S.td}>{r.id}</td>
                  {cols.map(([h, acc]) => <td key={h} style={S.td}>{acc(r) || "—"}</td>)}
                  <td style={S.td}>{fmt(r.created_at)}</td>
                  <td style={S.td}>
                    <div style={{ display: "flex", gap: 12 }}>
                      <button style={S.link} onClick={() => open(r.id)}>View</button>
                      <button style={S.link} onClick={() => exportXlsx([r.id])}>Export</button>
                      <button style={{ ...S.link, ...S.danger }} onClick={() => remove(r.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {loadingDetail && <p style={S.muted}>Loading submission…</p>}

      {detail && (
        <div style={S.modalBg} onClick={() => setDetail(null)}>
          <div style={S.modal} onClick={(e) => e.stopPropagation()}>
            <div style={S.modalHead}>
              <h2 style={S.h2}>Submission #{detail.id}{detail.instrument ? ` · Instrument ${detail.instrument}` : ""}</h2>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={{ ...S.btn, ...S.primary }} onClick={() => exportXlsx([detail.id])}>Export</button>
                <button style={{ ...S.btn, ...S.dangerBtn }} onClick={() => remove(detail.id)}>Delete</button>
                <button style={S.btn} onClick={() => setDetail(null)}>Close</button>
              </div>
            </div>

            <h3 style={S.h3}>Metadata</h3>
            <div style={S.kvGrid}>
              {Object.entries(detail.meta || {}).map(([k, v]) => (
                <div key={k} style={S.kvRow}><span style={S.kvKey}>{k}</span><span style={S.kvVal}>{String(v)}</span></div>
              ))}
              {(!detail.meta || Object.keys(detail.meta).length === 0) && <span style={S.muted}>No metadata</span>}
            </div>

            <h3 style={S.h3}>Answers ({Object.keys(detail.answers || {}).length} fields)</h3>
            <div style={S.tableWrap}>
              <table style={S.table}>
                <thead><tr><th style={S.th}>Field ID</th><th style={S.th}>Value</th></tr></thead>
                <tbody>
                  {Object.entries(detail.answers || {}).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => (
                    <tr key={k} style={S.tr}>
                      <td style={{ ...S.td, fontFamily: "monospace", whiteSpace: "nowrap" }}>{k}</td>
                      <td style={S.td}>{typeof v === "object" ? JSON.stringify(v) : String(v)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
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
  h2: { margin: 0, fontSize: 18 },
  h3: { margin: "18px 0 8px", fontSize: 14, color: "#374151" },
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
  modalBg: { position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 24, overflowY: "auto", zIndex: 50 },
  modal: { background: "#fff", borderRadius: 12, padding: "20px 22px", maxWidth: 900, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,.3)" },
  modalHead: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 },
  kvGrid: { display: "flex", flexDirection: "column", gap: 4 },
  kvRow: { display: "flex", gap: 10, fontSize: 13 },
  kvKey: { minWidth: 130, color: "#6b7280", fontWeight: 600 },
  kvVal: { flex: 1 },
};
