"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Plus, Trash2 } from "lucide-react";
import { ANNEX_C, ANNEX_D } from "../../lib/mealModel";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

function NativeSelect({ value, onChange, options }) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {options.map((o) => <option key={o} value={o}>{o === "" ? "—" : o}</option>)}
    </select>
  );
}

// which = "annexC" | "annexD"
export default function AnnexForm({ which }) {
  const isC = which === "annexC";
  const model = isC ? ANNEX_C : ANNEX_D;
  const STORE_KEY = `meal_${which}`;

  const [meta, setMeta] = useState({});
  const [answers, setAnswers] = useState({});
  const [rows, setRows] = useState(isC ? 3 : 0);
  const [missing, setMissing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(null);
  const [locked, setLocked] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    try {
      if (localStorage.getItem(`${STORE_KEY}_done`)) { setLocked(true); return; }
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        setMeta(p.meta || {});
        setAnswers(p.answers || {});
        if (isC && p.rows) setRows(p.rows);
      }
    } catch {}
  }, [STORE_KEY, isC]);

  useEffect(() => {
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ meta, answers, rows })); } catch {}
  }, [STORE_KEY, meta, answers, rows]);

  const setA = (id, val) =>
    setAnswers((p) => { const n = { ...p }; if (val === "" || val == null) delete n[id]; else n[id] = val; return n; });
  const setM = (id, val) =>
    setMeta((p) => { const n = { ...p }; if (val === "" || val == null) delete n[id]; else n[id] = val; return n; });

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(""), 3000); };

  const submit = async () => {
    if ((meta.assessor ?? "") === "") { setMissing(true); showToast("Assessor is required."); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    setMissing(false);
    setSubmitting(true);
    try {
      const payload = { ...answers };
      if (isC) payload["annexC-rows"] = String(rows);
      const res = await fetch("/api/meal/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instrument: which, meta, answers: payload }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setSubmitted({ id: data.id });
        setMeta({}); setAnswers({}); setRows(isC ? 3 : 0);
        try { localStorage.removeItem(STORE_KEY); localStorage.setItem(`${STORE_KEY}_done`, "1"); } catch {}
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else showToast(`Submit failed: ${data.error || res.status}`);
    } catch {
      showToast("Network error — is the server reachable?");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted || locked) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-5 text-center">
        <CheckCircle2 className="h-16 w-16 text-primary" />
        <h1 className="mt-4 text-2xl font-bold">{submitted ? "Submitted" : "Already submitted"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {submitted
            ? `Saved to the AHNi MEAL database (record #${submitted.id}).`
            : "You have already submitted this from this device. It can be submitted once."}
        </p>
        <div className="mt-6">
          <Button variant="outline" asChild><Link href="/meal">Back to all instruments</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-8">
      <Link href="/meal" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All instruments
      </Link>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{model.title}</h1>
        {model.note && <p className="mt-2 rounded-md bg-accent p-3 text-sm text-accent-foreground">{model.note}</p>}
      </div>

      {/* light header */}
      <Card className="mb-6">
        <CardHeader><CardTitle className="text-base">Prepared by</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Assessor <span className="text-primary">*</span></label>
            <Input value={meta.assessor ?? ""} onChange={(e) => setM("assessor", e.target.value)} className={missing && !meta.assessor ? "border-destructive bg-red-50" : ""} />
            {missing && !meta.assessor && <p className="mt-1 text-xs font-semibold text-destructive">Required</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Date</label>
            <Input type="date" value={meta.date ?? ""} onChange={(e) => setM("date", e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {isC ? (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-secondary">
                <tr>
                  <th className="p-2 text-left font-semibold">#</th>
                  {ANNEX_C.cols.map((c) => <th key={c.key} className="p-2 text-left font-semibold">{c.label}</th>)}
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: rows }).map((_, i) => (
                  <tr key={i} className="border-t align-top">
                    <td className="p-2 text-muted-foreground">{i + 1}</td>
                    {ANNEX_C.cols.map((c) => {
                      const id = `annexC-r${i}-${c.key}`;
                      return (
                        <td key={c.key} className="p-1.5">
                          {c.kind === "select"
                            ? <NativeSelect value={answers[id]} onChange={(v) => setA(id, v)} options={c.opts} />
                            : <Input className="h-9" value={answers[id] ?? ""} onChange={(e) => setA(id, e.target.value)} />}
                        </td>
                      );
                    })}
                    <td className="p-1.5">
                      <button type="button" onClick={() => setRows((r) => Math.max(1, r - 1))} className="text-muted-foreground hover:text-destructive" title="Remove last row (if this one)">
                        {i === rows - 1 ? <Trash2 className="h-4 w-4" /> : null}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button variant="outline" size="sm" onClick={() => setRows((r) => r + 1)}><Plus className="h-4 w-4" /> Add row</Button>
        </div>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Team roster</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {ANNEX_D.roster.map((r) => (
                <div key={r.key} className="grid gap-2 sm:grid-cols-[180px_1fr]">
                  <div>
                    <p className="text-sm font-medium">{r.role}</p>
                    <p className="text-xs text-muted-foreground">{r.resp}</p>
                  </div>
                  <Input placeholder="Name / contact" value={answers[`annexD-${r.key}-name`] ?? ""} onChange={(e) => setA(`annexD-${r.key}-name`, e.target.value)} />
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Daily QA checklist</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {ANNEX_D.checklist.map((c, i) => {
                const id = `annexD-chk-${i}`;
                const on = answers[id] === "Y";
                return (
                  <label key={i} className="flex cursor-pointer items-start gap-3 rounded-md border p-2.5 hover:bg-accent">
                    <input type="checkbox" checked={on} onChange={() => setA(id, on ? "" : "Y")} className="mt-0.5 h-4 w-4" />
                    <span className="text-sm">{c}</span>
                  </label>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}

      <div className="mt-8 flex justify-end rounded-lg border border-t-4 border-t-primary bg-card p-5 shadow-sm">
        <Button size="lg" onClick={submit} disabled={submitting}>{submitting ? "Submitting…" : "Submit"}</Button>
      </div>

      {toast && <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-md bg-foreground px-4 py-2 text-sm text-background shadow-lg">{toast}</div>}
    </div>
  );
}
