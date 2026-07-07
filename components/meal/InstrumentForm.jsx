"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { REQUIRED_HEADER, primaryIds } from "../../lib/mealModel";
import { SiteHeader, Body, deriveDqa } from "./body";
import { Button } from "../ui/button";

// Single-instrument form (used by /meal/[id]). The level wizard is the primary
// flow; this remains available for filling one instrument on its own.
export default function InstrumentForm({ inst }) {
  const P = `i${inst.id}`;
  const STORE_KEY = `meal_${P}`;

  const [meta, setMeta] = useState({});
  const [answers, setAnswers] = useState({});
  const [missing, setMissing] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(null);
  const [locked, setLocked] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    try {
      if (localStorage.getItem(`${STORE_KEY}_done`)) { setLocked(true); return; }
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) { const p = JSON.parse(raw); setMeta(p.meta || {}); setAnswers(p.answers || {}); }
    } catch {}
  }, [STORE_KEY]);

  useEffect(() => {
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ meta, answers })); } catch {}
  }, [STORE_KEY, meta, answers]);

  const setA = (id, val) => setAnswers((p) => { const n = { ...p }; if (val === "" || val == null) delete n[id]; else n[id] = val; return n; });
  const setM = (id, val) => setMeta((p) => { const n = { ...p }; if (val === "" || val == null) delete n[id]; else n[id] = val; return n; });

  const primaries = useMemo(() => primaryIds(inst), [inst]);
  const progress = useMemo(() => {
    if (!primaries.length) return 0;
    return Math.round((primaries.filter((id) => (answers[id] ?? "") !== "").length / primaries.length) * 100);
  }, [primaries, answers]);

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(""), 3000); };

  const submit = async () => {
    const miss = REQUIRED_HEADER.filter((id) => (meta[id] ?? "") === "");
    if (miss.length) { setMissing(miss); window.scrollTo({ top: 0, behavior: "smooth" }); showToast("Please complete the required site-header fields."); return; }
    setMissing([]); setSubmitting(true);
    try {
      const res = await fetch("/api/meal/submit", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instrument: inst.id, meta, answers: deriveDqa(inst, P, answers), completion_pct: progress }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setSubmitted({ id: data.id });
        setMeta({}); setAnswers({});
        try { localStorage.removeItem(STORE_KEY); localStorage.setItem(`${STORE_KEY}_done`, "1"); } catch {}
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else showToast(`Submit failed: ${data.error || res.status}`);
    } catch { showToast("Network error — is the server reachable?"); }
    finally { setSubmitting(false); }
  };

  if (submitted || locked) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-5 text-center">
        <CheckCircle2 className="h-16 w-16 text-primary" />
        <h1 className="mt-4 text-2xl font-bold">{submitted ? `Instrument ${inst.id} submitted` : "Already submitted"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {submitted ? `Saved to the AHNi MEAL database (record #${submitted.id}).`
                     : `You have already submitted Instrument ${inst.id} from this device. Each instrument can be submitted once.`}
        </p>
        <div className="mt-6"><Button variant="outline" asChild><Link href="/meal">Back to all instruments</Link></Button></div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-8">
      <Link href="/meal" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All instruments
      </Link>
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-wider text-primary">Instrument {inst.id}</p>
        <h1 className="mt-1 text-2xl font-bold">{inst.title}</h1>
        {inst.respondents && <p className="mt-1 text-sm text-muted-foreground">Respondents: {inst.respondents}</p>}
        {inst.note && <p className="mt-3 rounded-md bg-accent p-3 text-sm text-accent-foreground">{inst.note}</p>}
      </div>

      <div className="mb-6"><SiteHeader meta={meta} setM={setM} missing={missing} /></div>

      <Body inst={inst} answers={answers} setA={setA} />

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-t-4 border-t-primary bg-card p-5 shadow-sm">
        <div>
          <p className="text-2xl font-extrabold text-primary">{progress}%<span className="ml-1 text-xs font-medium uppercase text-muted-foreground">complete</span></p>
          <p className="text-sm text-muted-foreground">Review your entries, then submit this instrument.</p>
        </div>
        <Button size="lg" onClick={submit} disabled={submitting}>{submitting ? "Submitting…" : "Submit instrument"}</Button>
      </div>

      {toast && <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-md bg-foreground px-4 py-2 text-sm text-background shadow-lg">{toast}</div>}
    </div>
  );
}
