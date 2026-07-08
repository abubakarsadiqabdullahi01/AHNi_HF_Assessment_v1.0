"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { REQUIRED_HEADER, primaryIds } from "../../lib/mealModel";
import { SiteHeader, Body, deriveDqa } from "./body";
import { Button } from "../ui/button";

// level = { key, label, note, instruments: [inst, ...] }
export default function LevelWizard({ level }) {
  const insts = level.instruments;
  const STORE_KEY = `meal_level_${level.key}`;
  const totalSteps = insts.length + 2; // header + instruments + review

  const [meta, setMeta] = useState({});
  const [byInst, setByInst] = useState({}); // { instId: answers }
  const [step, setStep] = useState(0);
  const [missing, setMissing] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState(null); // [{id, ok, recordId, error}]
  const [locked, setLocked] = useState(false);
  const [succeeded, setSucceeded] = useState({}); // instId -> recordId
  const [toast, setToast] = useState("");

  useEffect(() => {
    try {
      if (localStorage.getItem(`${STORE_KEY}_done`)) { setLocked(true); return; }
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) { const p = JSON.parse(raw); setMeta(p.meta || {}); setByInst(p.byInst || {}); }
    } catch {}
  }, [STORE_KEY]);

  useEffect(() => {
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ meta, byInst })); } catch {}
  }, [STORE_KEY, meta, byInst]);

  const setM = (id, val) => setMeta((p) => { const n = { ...p }; if (val === "" || val == null) delete n[id]; else n[id] = val; return n; });
  const setA = (instId) => (id, val) =>
    setByInst((p) => {
      const cur = { ...(p[instId] || {}) };
      if (val === "" || val == null) delete cur[id]; else cur[id] = val;
      return { ...p, [instId]: cur };
    });

  const completion = (inst) => {
    const ids = primaryIds(inst); if (!ids.length) return 0;
    const a = byInst[inst.id] || {};
    return Math.round((ids.filter((id) => (a[id] ?? "") !== "").length / ids.length) * 100);
  };

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(""), 3000); };

  const goNext = () => {
    if (step === 0) {
      const miss = REQUIRED_HEADER.filter((id) => (meta[id] ?? "") === "");
      if (miss.length) { setMissing(miss); showToast("Complete the required site-header fields first."); return; }
      setMissing([]);
    }
    setStep((s) => Math.min(totalSteps - 1, s + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const goBack = () => { setStep((s) => Math.max(0, s - 1)); window.scrollTo({ top: 0, behavior: "smooth" }); };

  const submitAll = async () => {
    const miss = REQUIRED_HEADER.filter((id) => (meta[id] ?? "") === "");
    if (miss.length) { setMissing(miss); setStep(0); showToast("Complete the required site-header fields first."); return; }
    setSubmitting(true);
    const out = [];
    const nextSucceeded = { ...succeeded };
    // One batch id links all instruments submitted together as a single response.
    const batch = (typeof crypto !== "undefined" && crypto.randomUUID)
      ? crypto.randomUUID()
      : `b${Date.now()}${Math.round(Math.random() * 1e6)}`;
    for (const inst of insts) {
      if (nextSucceeded[inst.id]) { out.push({ id: inst.id, ok: true, recordId: nextSucceeded[inst.id] }); continue; }
      try {
        const P = `i${inst.id}`;
        const res = await fetch("/api/meal/submit", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ instrument: inst.id, meta: { ...meta, level: level.label, batch }, answers: deriveDqa(inst, P, byInst[inst.id] || {}), completion_pct: completion(inst) }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.ok) { nextSucceeded[inst.id] = data.id; out.push({ id: inst.id, ok: true, recordId: data.id }); }
        else out.push({ id: inst.id, ok: false, error: data.error || res.status });
      } catch { out.push({ id: inst.id, ok: false, error: "network error" }); }
    }
    setSucceeded(nextSucceeded);
    setResults(out);
    setSubmitting(false);
    if (out.every((r) => r.ok)) {
      try { localStorage.removeItem(STORE_KEY); localStorage.setItem(`${STORE_KEY}_done`, "1"); } catch {}
      setLocked(true);
    } else {
      showToast("Some instruments could not be submitted — see the summary.");
    }
  };

  if (locked && (!results || results.every((r) => r.ok))) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-5 text-center">
        <CheckCircle2 className="h-16 w-16 text-primary" />
        <h1 className="mt-4 text-2xl font-bold">{level.label} assessment submitted</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {results
            ? `Saved ${results.length} instrument${results.length === 1 ? "" : "s"} to the AHNi MEAL database.`
            : `You have already submitted the ${level.label} assessment from this device.`}
        </p>
        <div className="mt-6"><Button variant="outline" asChild><Link href="/meal">Back to all levels</Link></Button></div>
      </div>
    );
  }

  const onReview = step === totalSteps - 1;
  const curInst = step >= 1 && step <= insts.length ? insts[step - 1] : null;

  return (
    <div className="mx-auto max-w-4xl px-5 py-8">
      <Link href="/meal" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All levels
      </Link>

      {/* stepper */}
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-wider text-primary">{level.label} assessment</p>
        <h1 className="mt-1 text-2xl font-bold">
          {step === 0 ? "Site header" : onReview ? "Review & submit" : `Instrument ${curInst.id}: ${curInst.title}`}
        </h1>
        <div className="mt-3 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
            <div className="h-full bg-primary transition-all" style={{ width: `${(step / (totalSteps - 1)) * 100}%` }} />
          </div>
          <span className="text-xs font-medium text-muted-foreground">Step {step + 1} of {totalSteps}</span>
        </div>
      </div>

      {/* content */}
      {step === 0 && <SiteHeader meta={meta} setM={setM} missing={missing} />}

      {curInst && (
        <div>
          {curInst.respondents && <p className="mb-2 text-sm text-muted-foreground">Respondents: {curInst.respondents}</p>}
          {curInst.note && <p className="mb-4 rounded-md bg-accent p-3 text-sm text-accent-foreground">{curInst.note}</p>}
          <Body inst={curInst} answers={byInst[curInst.id] || {}} setA={setA(curInst.id)} />
        </div>
      )}

      {onReview && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">You are about to submit the following instruments for this site. Each is saved as its own record.</p>
          {insts.map((inst) => (
            <div key={inst.id} className="flex items-center justify-between rounded-lg border bg-card p-3">
              <div>
                <p className="text-sm font-semibold">Instrument {inst.id}: {inst.title}</p>
                <p className="text-xs text-muted-foreground">{completion(inst)}% complete{results && (results.find((r) => r.id === inst.id)?.ok ? " · submitted ✓" : results.find((r) => r.id === inst.id) ? " · failed" : "")}</p>
              </div>
              <span className="text-lg font-bold text-primary">{completion(inst)}%</span>
            </div>
          ))}
          {results && results.some((r) => !r.ok) && (
            <div className="rounded-md border border-destructive/40 bg-red-50 p-3 text-sm text-destructive">
              Some instruments failed: {results.filter((r) => !r.ok).map((r) => `Instr ${r.id} (${r.error})`).join("; ")}. Fix and press Submit again — already-saved ones won’t be duplicated.
            </div>
          )}
        </div>
      )}

      {/* nav */}
      <div className="mt-8 flex items-center justify-between gap-4 rounded-lg border border-t-4 border-t-primary bg-card p-4 shadow-sm">
        <Button variant="outline" onClick={goBack} disabled={step === 0}><ArrowLeft className="h-4 w-4" /> Back</Button>
        {onReview ? (
          <Button size="lg" onClick={submitAll} disabled={submitting}>{submitting ? "Submitting…" : "Submit all"}</Button>
        ) : (
          <Button onClick={goNext}>Next <ArrowRight className="h-4 w-4" /></Button>
        )}
      </div>

      {toast && <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-md bg-foreground px-4 py-2 text-sm text-background shadow-lg">{toast}</div>}
    </div>
  );
}
