"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { META, SECTIONS, BIN_OPTS, LIKERT, normItem, repIds, REQUIRED_META } from "../lib/formModel";

const STORE_KEY = "ahni_hf_form_v1";
const SUBMIT_URL = "/api/submit";

/* ------------------------------------------------------------------ */
/* Small field components — each holds its own local state and         */
/* commits changes up to the shared store.                             */
/* ------------------------------------------------------------------ */

function TextArea({ id, initial, commit, ph, className }) {
  const [v, setV] = useState(initial ?? "");
  return (
    <textarea
      className={className}
      value={v}
      placeholder={ph}
      onChange={(e) => { setV(e.target.value); commit(id, e.target.value); }}
    />
  );
}

function TextInput({ id, initial, commit, ph, type = "text" }) {
  const [v, setV] = useState(initial ?? "");
  return (
    <input
      type={type}
      value={v}
      placeholder={ph}
      onChange={(e) => { setV(e.target.value); commit(id, e.target.value); }}
    />
  );
}

function BinField({ base, item, initR, initN, commit }) {
  const [sel, setSel] = useState(initR ?? "");
  return (
    <>
      <div className="radios">
        {BIN_OPTS.map((o) => (
          <label key={o}>
            <input
              type="radio"
              name={`${base}-r`}
              value={o}
              checked={sel === o}
              onChange={() => { setSel(o); commit(`${base}-r`, o); }}
            />
            {o}
          </label>
        ))}
      </div>
      <TextArea id={`${base}-n`} initial={initN} commit={commit} ph="Notes / evidence (optional)" />
    </>
  );
}

function QaLikert({ base, scale, store, commit }) {
  const cls = ["l1", "l2", "l3", "l4", "l5"];
  const [sel, setSel] = useState(store.answers[`${base}-lk`] ?? "");
  return (
    <>
      <div className="likert">
        {scale.map((o, idx) => (
          <label className={cls[idx] || ""} key={o}>
            <input type="radio" name={`${base}-lk`} value={o} checked={sel === o}
              onChange={() => { setSel(o); commit(`${base}-lk`, o); }} />
            {o}
          </label>
        ))}
      </div>
      <TextArea id={`${base}-n`} initial={store.answers[`${base}-n`]} commit={commit} ph="Explanation" />
    </>
  );
}

function SubFields({ base, num, n, ph, store, commit }) {
  const rows = [];
  for (let k = 1; k <= n; k++) {
    const id = `${base}-s${k}`;
    rows.push(
      <div className="subrow" key={k}>
        <span className="subn">{num}.{k}</span>
        <TextInput id={id} initial={store.answers[id]} commit={commit} ph={`${ph} ${k}`} />
      </div>
    );
  }
  return <div className="subfields">{rows}</div>;
}

function BudgetTable({ base, store, commit }) {
  const yrs = [0, 1, 2];
  const [labels, setLabels] = useState(yrs.map((y) => store.answers[`${base}-y${y}-label`] ?? ""));
  const [stateB, setStateB] = useState(yrs.map((y) => store.answers[`${base}-state-y${y}`] ?? ""));
  const [healthB, setHealthB] = useState(yrs.map((y) => store.answers[`${base}-health-y${y}`] ?? ""));
  const [released, setReleased] = useState(yrs.map((y) => store.answers[`${base}-released-y${y}`] ?? ""));
  const [prog, setProg] = useState(yrs.map((y) => store.answers[`${base}-progareas-y${y}`] ?? ""));

  const upd = (setter, arr, y, val, key) => {
    const next = [...arr]; next[y] = val; setter(next);
    commit(`${base}-${key}-y${y}`, val);
  };
  const pct = (y) => {
    const s = parseFloat(stateB[y]), h = parseFloat(healthB[y]);
    return isFinite(s) && isFinite(h) && s > 0 ? (h / s * 100).toFixed(1) + "%" : "—";
  };
  const pctRel = (y) => {
    const h = parseFloat(healthB[y]), r = parseFloat(released[y]);
    return isFinite(h) && isFinite(r) && h > 0 ? (r / h * 100).toFixed(1) + "%" : "—";
  };

  return (
    <>
      <div className="mtx-scroll">
        <table className="mtx budget">
          <thead>
            <tr>
              <th>Metric</th>
              {yrs.map((y) => (
                <th key={y}>
                  <input className="yrlbl" type="text" value={labels[y]} placeholder={`Year ${y + 1}`}
                    onChange={(e) => { const n = [...labels]; n[y] = e.target.value; setLabels(n); commit(`${base}-y${y}-label`, e.target.value); }} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr><td className="src">Total State Budget (₦)</td>
              {yrs.map((y) => <td key={y}><input type="number" value={stateB[y]} onChange={(e) => upd(setStateB, stateB, y, e.target.value, "state")} /></td>)}</tr>
            <tr><td className="src">Total Health Budget (₦)</td>
              {yrs.map((y) => <td key={y}><input type="number" value={healthB[y]} onChange={(e) => upd(setHealthB, healthB, y, e.target.value, "health")} /></td>)}</tr>
            <tr><td className="src">Total Health Budget Released (₦)</td>
              {yrs.map((y) => <td key={y}><input type="number" value={released[y]} onChange={(e) => upd(setReleased, released, y, e.target.value, "released")} /></td>)}</tr>
            <tr><td className="src">% Budget allocation to health <small>(auto)</small></td>
              {yrs.map((y) => <td key={y}><output className="pct">{pct(y)}</output></td>)}</tr>
            <tr><td className="src">% Health budget released <small>(auto)</small></td>
              {yrs.map((y) => <td key={y}><output className="pct">{pctRel(y)}</output></td>)}</tr>
            <tr><td className="src">Health programme areas receiving direct State funding</td>
              {yrs.map((y) => <td key={y}><input type="text" value={prog[y]} placeholder="…" onChange={(e) => upd(setProg, prog, y, e.target.value, "progareas")} /></td>)}</tr>
          </tbody>
        </table>
      </div>
      <p className="mtx-help">Enter a value per financial year. % allocation is calculated automatically as Health Budget ÷ State Budget × 100.</p>
    </>
  );
}

function MatrixTable({ sec, store, commit }) {
  const init = {};
  sec.sources.forEach((_, si) => sec.cols.forEach((c) => { init[`${si}-${c.key}`] = store.answers[`${sec.id}-s${si}-${c.key}`] ?? ""; }));
  const [cells, setCells] = useState(init);
  const set = (si, key, val) => {
    setCells((p) => ({ ...p, [`${si}-${key}`]: val }));
    commit(`${sec.id}-s${si}-${key}`, val);
  };
  const cell = (si, c) => {
    const v = cells[`${si}-${c.key}`] ?? "";
    if (c.w === "area") return <textarea value={v} onChange={(e) => set(si, c.key, e.target.value)} />;
    if (c.w === "yn") return <select value={v} onChange={(e) => set(si, c.key, e.target.value)}><option value="">–</option><option>Yes</option><option>No</option></select>;
    if (c.w === "hml") return <select value={v} onChange={(e) => set(si, c.key, e.target.value)}><option value="">–</option><option>High</option><option>Medium</option><option>Low</option></select>;
    return <input type={c.w === "num" ? "number" : "text"} value={v} onChange={(e) => set(si, c.key, e.target.value)} />;
  };
  return (
    <>
      <div className="mtx-scroll">
        <table className="mtx">
          <thead><tr><th>Financing source</th>{sec.cols.map((c) => <th key={c.key}>{c.label}</th>)}</tr></thead>
          <tbody>
            {sec.sources.map((src, si) => (
              <tr key={si}><td className="src">{src}</td>{sec.cols.map((c) => <td key={c.key}>{cell(si, c)}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mtx-help">Scroll horizontally to see all columns. Leave a cell blank if not applicable.</p>
    </>
  );
}

function LikertRow({ base, label, store, commit }) {
  const [sel, setSel] = useState(store.answers[`${base}-st`] ?? "");
  return (
    <div className="row">
      <label>{label}</label>
      <div className="likert">
        {LIKERT.map(([o, cls]) => (
          <label className={cls} key={o}>
            <input type="radio" name={`${base}-st`} value={o} checked={sel === o}
              onChange={() => { setSel(o); commit(`${base}-st`, o); }} />
            {o}
          </label>
        ))}
      </div>
      <TextArea id={`${base}-n`} initial={store.answers[`${base}-n`]} commit={commit} ph="Qualitative note — describe the situation & gaps" className="dz-note" />
    </div>
  );
}

function CheckItem({ base, index, opp, store, commit }) {
  const [sel, setSel] = useState(store.answers[`${base}-s`] ?? "");
  const seg = [["Strong", "s-strong"], ["Some", "s-some"], ["None", "s-none"]];
  return (
    <div className="chk">
      <div className="opp"><span className="qn">{index + 1}.</span><span>{opp}</span></div>
      <div className="ctrl">
        <div className="segbtns">
          {seg.map(([o, cls]) => (
            <label className={cls} key={o}>
              <input type="radio" name={`${base}-s`} value={o} checked={sel === o}
                onChange={() => { setSel(o); commit(`${base}-s`, o); }} />
              {o}
            </label>
          ))}
        </div>
        <TextArea id={`${base}-n`} initial={store.answers[`${base}-n`]} commit={commit} ph="Evidence / specifics" />
      </div>
    </div>
  );
}

function MetaField({ f, store, commitMeta, invalid }) {
  const [v, setV] = useState(store.meta[f.id] ?? f.value ?? "");
  useEffect(() => { if (f.value && store.meta[f.id] === undefined) commitMeta(f.id, f.value); }, []); // eslint-disable-line
  const on = (e) => { setV(e.target.value); commitMeta(f.id, e.target.value); };
  const showErr = invalid && (v ?? "") === "";
  return (
    <div className={`field${showErr ? " field-error" : ""}`}>
      <label>{f.label}{f.required && <span className="req">*</span>}</label>
      {f.type === "select" ? (
        <select value={v} onChange={on}>
          {f.options.map((o) => <option key={o} value={o}>{o ? o : "Select…"}</option>)}
        </select>
      ) : (
        <input type={f.type} value={v} placeholder={f.ph || ""} onChange={on} />
      )}
      {showErr && <span className="req-msg">Required</span>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Section renderer                                                    */
/* ------------------------------------------------------------------ */

function Section({ sec, store, commit }) {
  const count =
    sec.type === "qa" ? `${sec.items.length} questions`
    : sec.type === "matrix" ? `${sec.sources.length} sources`
    : sec.type === "disease" ? `${sec.diseases.length} areas`
    : `${sec.items.length} opportunities`;

  let body = null;
  if (sec.type === "qa") {
    body = sec.items.map((raw, i) => {
      const it = normItem(raw);
      const base = `${sec.id}-${i + 1}`, num = `${sec.id}${i + 1}`;
      let inner;
      if (it.kind === "bin") inner = <BinField base={base} item={it} initR={store.answers[`${base}-r`]} initN={store.answers[`${base}-n`]} commit={commit} />;
      else if (it.kind === "sub") inner = <SubFields base={base} num={num} n={it.n || 5} ph={it.ph || "Response"} store={store} commit={commit} />;
      else if (it.kind === "likert") inner = <QaLikert base={base} scale={it.scale || []} store={store} commit={commit} />;
      else if (it.kind === "budget") inner = <BudgetTable base={base} store={store} commit={commit} />;
      else inner = <TextArea id={base} initial={store.answers[base]} commit={commit} ph="Enter response…" />;
      return (
        <div className="qa" key={base}>
          <div className="q"><span className="qn">{num}.</span><span>{it.q}</span></div>
          {it.help && <div className="help">{it.help}</div>}
          {inner}
        </div>
      );
    });
  } else if (sec.type === "matrix") {
    body = <MatrixTable sec={sec} store={store} commit={commit} />;
  } else if (sec.type === "disease") {
    body = (
      <div className="dz-grid">
        {sec.diseases.map((d, di) => (
          <div className="dz" key={di}>
            <h3>{d.name}</h3>
            <div className="dz-inner">
              {d.items.map((it, ii) => <LikertRow key={ii} base={`${sec.id}-d${di}-${ii}`} label={it} store={store} commit={commit} />)}
            </div>
          </div>
        ))}
      </div>
    );
  } else if (sec.type === "checklist") {
    body = sec.items.map((opp, i) => <CheckItem key={i} base={`${sec.id}-${i}`} index={i} opp={opp} store={store} commit={commit} />);
  }

  return (
    <section className="section" id={`sec-${sec.id}`}>
      <div className="sec-head"><span className="tag">{sec.id}</span><h2>{sec.title}</h2><span className="count">{count}</span></div>
      <div className="sec-body">
        {sec.note && <div className="sec-note">{sec.note}</div>}
        {body}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Main form                                                           */
/* ------------------------------------------------------------------ */

export default function AssessmentForm() {
  const store = useRef({ meta: {}, answers: {} });
  const [formKey, setFormKey] = useState(0);
  const [progress, setProgress] = useState(0);
  const [doneSecs, setDoneSecs] = useState({});
  const [toast, setToast] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(null); // { id } after a successful submit
  const [missingMeta, setMissingMeta] = useState([]); // required meta ids left empty
  const fileRef = useRef(null);
  const toastTimer = useRef(null);
  const debounce = useRef(null);

  const recompute = useCallback(() => {
    let total = 0, done = 0; const ds = {};
    repIds().forEach(({ sec, ids }) => {
      let sd = 0;
      ids.forEach((id) => { total++; if ((store.current.answers[id] ?? "") !== "") { done++; sd++; } });
      ds[sec] = sd > 0 && sd === ids.length;
    });
    setProgress(total ? Math.round((done / total) * 100) : 0);
    setDoneSecs(ds);
  }, []);

  const persist = useCallback(() => {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(store.current)); } catch {}
  }, []);

  const commit = useCallback((id, val) => {
    if (val === "" || val == null) delete store.current.answers[id];
    else store.current.answers[id] = val;
    persist();
    clearTimeout(debounce.current);
    debounce.current = setTimeout(recompute, 250);
  }, [persist, recompute]);

  const commitMeta = useCallback((id, val) => {
    if (val === "") delete store.current.meta[id];
    else store.current.meta[id] = val;
    persist();
  }, [persist]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) { const p = JSON.parse(raw); store.current = { meta: p.meta || {}, answers: p.answers || {} }; }
    } catch {}
    recompute();
    setFormKey((k) => k + 1);
  }, [recompute]);

  const showToast = (msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2600);
  };

  const fileStamp = () => {
    const st = (store.current.meta.state || "state").replace(/\s+/g, "-");
    return `AHNi-HealthFinancing-${st}-${new Date().toISOString().slice(0, 10)}`;
  };

  const saveDraft = () => {
    const blob = new Blob([JSON.stringify(store.current, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = fileStamp() + ".json";
    document.body.appendChild(a); a.click(); a.remove();
    showToast("Draft saved to your device");
  };

  const loadDraft = (e) => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const p = JSON.parse(r.result);
        store.current = { meta: p.meta || {}, answers: p.answers || {} };
        persist(); recompute(); setFormKey((k) => k + 1);
        showToast("Draft loaded");
      } catch { showToast("Could not read that file"); }
      e.target.value = "";
    };
    r.readAsText(f);
  };

  const resetAll = () => {
    if (!confirm("Clear all answers on this form? Save a draft first if needed.")) return;
    store.current = { meta: {}, answers: {} };
    persist(); recompute(); setFormKey((k) => k + 1);
    showToast("Form cleared");
  };

  const submit = async () => {
    // Block submit until required identifying fields are filled.
    const missing = REQUIRED_META.filter((id) => (store.current.meta[id] ?? "") === "");
    if (missing.length) {
      setMissingMeta(missing);
      const labels = missing.map((id) => META.find((m) => m.id === id)?.label || id);
      showToast(`Please fill required field${missing.length > 1 ? "s" : ""}: ${labels.join(", ")}`);
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setMissingMeta([]);
    setSubmitting(true);
    try {
      const payload = {
        form_id: "ahni_health_financing_situation_analysis",
        form_version: "1.0",
        meta: store.current.meta,
        answers: store.current.answers,
        completion_pct: progress,
      };
      const res = await fetch(SUBMIT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        // Success: clear the form + saved draft and show the confirmation screen.
        store.current = { meta: {}, answers: {} };
        persist();
        recompute();
        setFormKey((k) => k + 1);
        setSubmitted({ id: data.id });
        if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        showToast(`Submit failed: ${data.error || res.status}`);
      }
    } catch {
      showToast("Network error — is the server/database reachable?");
    } finally {
      setSubmitting(false);
    }
  };

  const startNewForm = () => {
    setSubmitted(null);
    store.current = { meta: {}, answers: {} };
    persist();
    recompute();
    setFormKey((k) => k + 1);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (submitted) {
    return (
      <>
        <div className="topbar">
          <div className="brand">
            <span className="logochip"><img className="logo-img" src="/ahni-logo.png" alt="AHNi — Achieving Health Nigeria Initiative" /></span>
            <span className="sub">Prevention, Care &amp; Treatment · GHSD Transition Assessment</span>
          </div>
        </div>
        <div className="donewrap">
          <div className="donecard">
            <div className="donecheck">✓</div>
            <h1>Response submitted</h1>
            <p>Thank you — your assessment has been saved to the AHNi database{submitted.id ? <> (record <strong>#{submitted.id}</strong>)</> : null}.</p>
            <button className="btn primary big" onClick={startNewForm}>Fill another form</button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="topbar">
        <div className="brand">
          <span className="logochip"><img className="logo-img" src="/ahni-logo.png" alt="AHNi — Achieving Health Nigeria Initiative" /></span>
          <span className="sub">Prevention, Care &amp; Treatment · GHSD Transition Assessment</span>
        </div>
        <div className="actions">
          <button className="btn" onClick={() => fileRef.current?.click()}>Load draft</button>
          <button className="btn" onClick={saveDraft}>Save draft</button>
          <button className="btn" onClick={() => window.print()}>Print / PDF</button>
          <button className="btn primary" onClick={submit} disabled={submitting}>{submitting ? "Submitting…" : "Submit"}</button>
          <button className="btn" onClick={resetAll} title="Clear all answers">Reset</button>
        </div>
      </div>
      <input ref={fileRef} type="file" accept="application/json" style={{ display: "none" }} onChange={loadDraft} />

      <div className="wrap">
        <aside className="nav">
          <div className="progwrap">
            <div className="lbl">Completion</div>
            <div className="num">{progress}<span>%</span></div>
            <div className="track"><i style={{ width: progress + "%" }} /></div>
          </div>
          <ul className="navlist">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a href={`#sec-${s.id}`} className={doneSecs[s.id] ? "done" : ""}>
                  <span className="k">{s.id}</span><span>{s.title}</span>
                </a>
              </li>
            ))}
          </ul>
        </aside>

        <main>
          <div className="printhead"><img src="/ahni-logo.png" alt="AHNi" /><span>Achieving Health Nigeria Initiative · Prevention, Care &amp; Treatment</span></div>
          <div className="titleblock">
            <div className="eyebrow">State Situation Analysis</div>
            <h1>Health Financing &amp; Domestic Resource Mobilization Assessment</h1>
            <p>Rapid data-capture tool for the Global Health Service Delivery (GHSD) transition agenda — financing evidence across HIV, TB, malaria and MNCH. Complete each section, then save a draft, export to PDF, or submit to the database.</p>
          </div>

          <div key={formKey}>
            <div className="card">
              <p className="req-legend"><span className="req">*</span>Required — these fields must be filled before you can submit.</p>
              <div className="meta-grid">
                {META.map((f) => <MetaField key={f.id} f={f} store={store.current} commitMeta={commitMeta} invalid={missingMeta.includes(f.id)} />)}
              </div>
            </div>
            {SECTIONS.map((s) => <Section key={s.id} sec={s} store={store.current} commit={commit} />)}
          </div>

          <p className="footnote">AHNi · Prevention, Care &amp; Treatment — drafts autosave in this browser. Submit sends your responses to the AHNi database.</p>
        </main>
      </div>

      <div id="toast" className={toast ? "show" : ""}>{toast}</div>
    </>
  );
}
