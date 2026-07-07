"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { HEADER, REQUIRED_HEADER, slug, primaryIds } from "../../lib/mealModel";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";

/* ---------- small controls ---------- */

function Pill({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-sm transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-input bg-background hover:bg-accent hover:text-accent-foreground"
      )}
    >
      {children}
    </button>
  );
}

function NativeSelect({ value, onChange, options }) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {options.map((o) => (
        <option key={o} value={o}>{o === "" ? "Select…" : o}</option>
      ))}
    </select>
  );
}

/* ---------- main form ---------- */

export default function InstrumentForm({ inst }) {
  const P = `i${inst.id}`;
  const STORE_KEY = `meal_${P}`;

  const [meta, setMeta] = useState({});
  const [answers, setAnswers] = useState({});
  const [missing, setMissing] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(null);
  const [locked, setLocked] = useState(false); // already submitted from this device
  const [toast, setToast] = useState("");

  // load draft + one-submission lock
  useEffect(() => {
    try {
      if (localStorage.getItem(`${STORE_KEY}_done`)) { setLocked(true); return; }
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        setMeta(p.meta || {});
        setAnswers(p.answers || {});
      }
    } catch {}
  }, [STORE_KEY]);

  // autosave
  useEffect(() => {
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ meta, answers })); } catch {}
  }, [STORE_KEY, meta, answers]);

  const setA = (id, val) =>
    setAnswers((p) => {
      const n = { ...p };
      if (val === "" || val == null) delete n[id];
      else n[id] = val;
      return n;
    });
  const setM = (id, val) =>
    setMeta((p) => {
      const n = { ...p };
      if (val === "" || val == null) delete n[id];
      else n[id] = val;
      return n;
    });

  const primaries = useMemo(() => primaryIds(inst), [inst]);
  const progress = useMemo(() => {
    if (!primaries.length) return 0;
    const done = primaries.filter((id) => (answers[id] ?? "") !== "").length;
    return Math.round((done / primaries.length) * 100);
  }, [primaries, answers]);

  // DQA derived values (verification factor + accuracy)
  const withDerived = () => {
    if (inst.type !== "dqa") return answers;
    const out = { ...answers };
    inst.indicators.forEach((ind) => {
      const s = slug(ind);
      const rec = parseFloat(answers[`${P}-${s}-recount`]);
      const rep = parseFloat(answers[`${P}-${s}-summary`]);
      if (isFinite(rec) && isFinite(rep) && rep > 0) {
        const vf = rec / rep;
        out[`${P}-${s}-vf`] = vf.toFixed(2);
        out[`${P}-${s}-acc`] = Math.abs(vf - 1) <= 0.1 ? "Y" : "N";
      }
    });
    return out;
  };

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(""), 3000); };

  const submit = async () => {
    const miss = REQUIRED_HEADER.filter((id) => (meta[id] ?? "") === "");
    if (miss.length) {
      setMissing(miss);
      window.scrollTo({ top: 0, behavior: "smooth" });
      showToast("Please complete the required site-header fields.");
      return;
    }
    setMissing([]);
    setSubmitting(true);
    try {
      const res = await fetch("/api/meal/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instrument: inst.id, meta, answers: withDerived(), completion_pct: progress }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setSubmitted({ id: data.id });
        setMeta({}); setAnswers({});
        try { localStorage.removeItem(STORE_KEY); localStorage.setItem(`${STORE_KEY}_done`, "1"); } catch {}
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        showToast(`Submit failed: ${data.error || res.status}`);
      }
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
        <h1 className="mt-4 text-2xl font-bold">
          {submitted ? `Instrument ${inst.id} submitted` : "Already submitted"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {submitted
            ? `Saved to the AHNi MEAL database (record #${submitted.id}).`
            : `You have already submitted Instrument ${inst.id} from this device. Each instrument can be submitted once.`}
        </p>
        <div className="mt-6">
          <Button variant="outline" asChild><Link href="/meal">Back to all instruments</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-8">
      {/* header / breadcrumb */}
      <Link href="/meal" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All instruments
      </Link>
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-wider text-primary">Instrument {inst.id}</p>
        <h1 className="mt-1 text-2xl font-bold">{inst.title}</h1>
        {inst.respondents && <p className="mt-1 text-sm text-muted-foreground">Respondents: {inst.respondents}</p>}
        {inst.note && <p className="mt-3 rounded-md bg-accent p-3 text-sm text-accent-foreground">{inst.note}</p>}
      </div>

      {/* site header */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Site header</CardTitle>
          <CardDescription>
            <span className="text-primary">*</span> required before submitting.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {HEADER.map((f) => {
            const invalid = missing.includes(f.id) && (meta[f.id] ?? "") === "";
            return (
              <div key={f.id}>
                <label className="mb-1 block text-sm font-medium">
                  {f.label}{f.required && <span className="text-primary"> *</span>}
                </label>
                {f.type === "select" ? (
                  <NativeSelect value={meta[f.id]} onChange={(v) => setM(f.id, v)} options={f.options} />
                ) : (
                  <Input
                    type={f.type}
                    value={meta[f.id] ?? ""}
                    onChange={(e) => setM(f.id, e.target.value)}
                    className={invalid ? "border-destructive bg-red-50" : ""}
                  />
                )}
                {invalid && <p className="mt-1 text-xs font-semibold text-destructive">Required</p>}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* body */}
      <Body inst={inst} P={P} answers={answers} setA={setA} />

      {/* submit panel */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-t-4 border-t-primary bg-card p-5 shadow-sm">
        <div>
          <p className="text-2xl font-extrabold text-primary">{progress}%<span className="ml-1 text-xs font-medium uppercase text-muted-foreground">complete</span></p>
          <p className="text-sm text-muted-foreground">Review your entries, then submit this instrument.</p>
        </div>
        <Button size="lg" onClick={submit} disabled={submitting}>
          {submitting ? "Submitting…" : "Submit instrument"}
        </Button>
      </div>

      {toast && (
        <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-md bg-foreground px-4 py-2 text-sm text-background shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

/* ---------- body renderers ---------- */

function Body({ inst, P, answers, setA }) {
  if (inst.type === "qa") return <QaBody inst={inst} P={P} answers={answers} setA={setA} />;
  if (inst.type === "dqa") return <DqaBody inst={inst} P={P} answers={answers} setA={setA} />;
  if (inst.type === "inventory") return <InventoryBody inst={inst} P={P} answers={answers} setA={setA} />;
  if (inst.type === "workforce") return <WorkforceBody inst={inst} P={P} answers={answers} setA={setA} />;
  if (inst.type === "checklist") return <ChecklistBody inst={inst} P={P} answers={answers} setA={setA} />;
  if (inst.type === "maturity") return <MaturityBody inst={inst} P={P} answers={answers} setA={setA} />;
  return null;
}

function QaBody({ inst, P, answers, setA }) {
  return (
    <div className="space-y-4">
      {inst.items.map((it) => {
        const base = `${P}-${it.ref}`;
        return (
          <Card key={it.ref}>
            <CardContent className="pt-6">
              <p className="mb-3 text-sm font-semibold">
                <span className="text-primary">{it.ref}</span> {it.q}
              </p>

              {it.kind === "radio" && (
                <>
                  <div className="flex flex-wrap gap-2">
                    {it.opts.map((o) => (
                      <Pill key={o} active={answers[base] === o} onClick={() => setA(base, answers[base] === o ? "" : o)}>{o}</Pill>
                    ))}
                  </div>
                  {answers[base] === "Other" && (
                    <Input className="mt-2" placeholder="Please specify" value={answers[`${base}-other`] ?? ""} onChange={(e) => setA(`${base}-other`, e.target.value)} />
                  )}
                </>
              )}

              {it.kind === "multi" && (
                <>
                  <div className="flex flex-wrap gap-2">
                    {it.opts.map((o) => {
                      const set = new Set((answers[base] || "").split(",").filter(Boolean));
                      const on = set.has(o);
                      return (
                        <Pill key={o} active={on} onClick={() => { on ? set.delete(o) : set.add(o); setA(base, [...set].join(",")); }}>{o}</Pill>
                      );
                    })}
                  </div>
                  {(answers[base] || "").split(",").includes("Other") && (
                    <Input className="mt-2" placeholder="Please specify" value={answers[`${base}-other`] ?? ""} onChange={(e) => setA(`${base}-other`, e.target.value)} />
                  )}
                </>
              )}

              {it.kind === "text" && (
                <Input value={answers[base] ?? ""} placeholder={(it.opts && it.opts.join(" · ")) || ""} onChange={(e) => setA(base, e.target.value)} />
              )}
              {it.kind === "count" && (
                <Input type="number" value={answers[base] ?? ""} placeholder="Enter count" onChange={(e) => setA(base, e.target.value)} />
              )}
              {it.kind === "narrative" && (
                <Textarea value={answers[base] ?? ""} placeholder="Narrative…" onChange={(e) => setA(base, e.target.value)} />
              )}
              {it.kind === "percent" && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {it.parts.map((pt) => {
                    const id = `${base}-${slug(pt)}`;
                    return (
                      <div key={pt}>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">{pt} (%)</label>
                        <Input type="number" value={answers[id] ?? ""} onChange={(e) => setA(id, e.target.value)} />
                      </div>
                    );
                  })}
                </div>
              )}

              {it.extra && (
                <div className="mt-3">
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">{it.extra.label}</label>
                  <Input value={answers[`${base}-x`] ?? ""} onChange={(e) => setA(`${base}-x`, e.target.value)} />
                </div>
              )}

              <div className="mt-3">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Source of verification (optional)</label>
                <Input value={answers[`${base}-src`] ?? ""} onChange={(e) => setA(`${base}-src`, e.target.value)} />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function DqaBody({ inst, P, answers, setA }) {
  const vfOf = (s) => {
    const rec = parseFloat(answers[`${P}-${s}-recount`]);
    const rep = parseFloat(answers[`${P}-${s}-summary`]);
    if (isFinite(rec) && isFinite(rep) && rep > 0) return rec / rep;
    return null;
  };
  return (
    <div className="space-y-6">
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-secondary">
            <tr>
              {["Indicator (period)", "Register recount", "Monthly summary", "DHIS2 value", "VF (auto)", "Accurate?"].map((h) => (
                <th key={h} className="p-2 text-left font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {inst.indicators.map((ind) => {
              const s = slug(ind);
              const vf = vfOf(s);
              const acc = vf == null ? "—" : Math.abs(vf - 1) <= 0.1 ? "Y" : "N";
              return (
                <tr key={ind} className="border-t">
                  <td className="p-2 font-medium">{ind}</td>
                  {["recount", "summary", "dhis2"].map((c) => (
                    <td key={c} className="p-1.5">
                      <Input type="number" className="h-9" value={answers[`${P}-${s}-${c}`] ?? ""} onChange={(e) => setA(`${P}-${s}-${c}`, e.target.value)} />
                    </td>
                  ))}
                  <td className="p-2 tabular-nums">{vf == null ? "—" : vf.toFixed(2)}</td>
                  <td className={cn("p-2 font-bold", acc === "Y" && "text-green-700", acc === "N" && "text-destructive")}>{acc}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">VF = recount ÷ monthly summary. Accurate = within ±10%.</p>

      <Card>
        <CardHeader><CardTitle className="text-base">Summary measures</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {inst.summary.map((m) => (
            <div key={m.key} className="grid gap-2 sm:grid-cols-[1fr_200px] sm:items-center">
              <div>
                <p className="text-sm font-medium">{m.label}</p>
                <p className="text-xs text-muted-foreground">{m.def}</p>
              </div>
              <Input value={answers[`${P}-sum-${m.key}`] ?? ""} placeholder="Result" onChange={(e) => setA(`${P}-sum-${m.key}`, e.target.value)} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function InventoryBody({ inst, P, answers, setA }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[820px] text-sm">
        <thead className="bg-secondary">
          <tr>
            <th className="p-2 text-left font-semibold">Platform</th>
            {inst.cols.map((c) => <th key={c.key} className="p-2 text-left font-semibold">{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {inst.platforms.map((pf) => {
            const s = slug(pf);
            return (
              <tr key={pf} className="border-t align-top">
                <td className="p-2 font-medium">{pf}</td>
                {inst.cols.map((c) => {
                  const id = `${P}-${s}-${c.key}`;
                  return (
                    <td key={c.key} className="p-1.5">
                      {c.kind === "yn" ? (
                        <NativeSelect value={answers[id]} onChange={(v) => setA(id, v)} options={["", "Y", "N"]} />
                      ) : c.kind === "select" ? (
                        <NativeSelect value={answers[id]} onChange={(v) => setA(id, v)} options={c.opts} />
                      ) : (
                        <Input className="h-9" value={answers[id] ?? ""} onChange={(e) => setA(id, e.target.value)} />
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function WorkforceBody({ inst, P, answers, setA }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[560px] text-sm">
        <thead className="bg-secondary">
          <tr>
            <th className="p-2 text-left font-semibold">Skill area</th>
            <th className="p-2 text-left font-semibold"># proficient</th>
            <th className="p-2 text-left font-semibold"># needed</th>
            <th className="p-2 text-left font-semibold">Training priority</th>
          </tr>
        </thead>
        <tbody>
          {inst.skills.map((sk) => {
            const s = slug(sk);
            return (
              <tr key={sk} className="border-t">
                <td className="p-2 font-medium">{sk}</td>
                <td className="p-1.5"><Input type="number" className="h-9" value={answers[`${P}-${s}-prof`] ?? ""} onChange={(e) => setA(`${P}-${s}-prof`, e.target.value)} /></td>
                <td className="p-1.5"><Input type="number" className="h-9" value={answers[`${P}-${s}-need`] ?? ""} onChange={(e) => setA(`${P}-${s}-need`, e.target.value)} /></td>
                <td className="p-1.5"><NativeSelect value={answers[`${P}-${s}-prio`]} onChange={(v) => setA(`${P}-${s}-prio`, v)} options={["", "H", "M", "L"]} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ChecklistBody({ inst, P, answers, setA }) {
  return (
    <div className="space-y-3">
      {inst.items.map((it) => {
        const base = `${P}-${it.ref}`;
        return (
          <Card key={it.ref}>
            <CardContent className="pt-6">
              <p className="mb-3 text-sm font-medium"><span className="text-primary">{it.ref}</span> {it.q}</p>
              <div className="mb-3 flex flex-wrap gap-2">
                {["Yes", "No", "Partial"].map((o) => (
                  <Pill key={o} active={answers[base] === o} onClick={() => setA(base, answers[base] === o ? "" : o)}>{o}</Pill>
                ))}
              </div>
              <Input value={answers[`${base}-ev`] ?? ""} placeholder="Evidence / note" onChange={(e) => setA(`${base}-ev`, e.target.value)} />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function MaturityBody({ inst, P, answers, setA }) {
  return (
    <div className="space-y-3">
      {inst.dimensions.map((dm) => {
        const s = slug(dm);
        return (
          <Card key={dm}>
            <CardContent className="pt-6">
              <p className="mb-3 text-sm font-medium">{dm}</p>
              <div className="mb-3 flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Pill key={n} active={String(answers[`${P}-${s}-score`]) === String(n)} onClick={() => setA(`${P}-${s}-score`, answers[`${P}-${s}-score`] === String(n) ? "" : String(n))}>{n}</Pill>
                ))}
              </div>
              <Textarea value={answers[`${P}-${s}-ev`] ?? ""} placeholder="Evidence / justification" onChange={(e) => setA(`${P}-${s}-ev`, e.target.value)} />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
