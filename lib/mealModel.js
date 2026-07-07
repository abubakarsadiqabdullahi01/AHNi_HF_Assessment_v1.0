// =====================================================================
// AHNi MEAL Rapid Assessment Tool — form model (v1.0, 07 JUL 2026)
// One submission per instrument. Each instrument shares the SITE HEADER
// then has a typed body. Field ids are stable and used as the keys in the
// exported `answers` object and by the Excel export dictionary.
// =====================================================================

export const FORM = {
  id: "ahni_meal_rapid_assessment",
  title: "MEAL Rapid Assessment Tool",
  programme: "AHNi — Monitoring, Evaluation, Accountability & Learning",
  version: "1.0",
};

// Shared site header shown at the top of every instrument.
export const HEADER = [
  { id: "state", label: "State", type: "select",
    options: ["", "Borno", "Adamawa", "Yobe", "Taraba", "Gombe", "Bauchi", "Other"], required: true },
  { id: "lga", label: "LGA", type: "text", required: true },
  { id: "facility", label: "Facility / office", type: "text", required: true },
  { id: "facility_code", label: "Facility code", type: "text" },
  { id: "tier", label: "Accessibility tier", type: "select",
    options: ["", "Tier 1", "Tier 2", "Tier 3"], required: true },
  { id: "modality", label: "Data modality", type: "select",
    options: ["", "In person", "Remote KII", "Proxy", "Third-party monitor"] },
  { id: "respondent_role", label: "Respondent role", type: "text" },
  { id: "date", label: "Date", type: "date", required: true },
  { id: "assessor", label: "Assessor", type: "text", required: true },
  { id: "supervisor_check", label: "Supervisor check", type: "text" },
];

export const REQUIRED_HEADER = HEADER.filter((f) => f.required).map((f) => f.id);

// Body item kinds for Q&A instruments (1,2,3,6):
//  radio     — pick one of `opts`
//  multi     — check any of `opts`
//  text      — free text (opts shown as hint)
//  percent   — one % per label in `parts`
//  count     — numeric/count entry
//  narrative — long free text
// Every Q&A item also stores an optional "-src" (source of verification).

export const INSTRUMENTS = [
  {
    id: "1", title: "State-level MEAL systems assessment", type: "qa",
    respondents: "SMOH HMIS/M&E officer, SPHCDA M&E, State Epidemiologist/DSNO focal, disease-program M&E (HIV, TB, malaria, MNCH).",
    time: "45–60 minutes",
    items: [
      { ref: "1.1", q: "Which routine and disease platforms are in use at state level?", kind: "multi", opts: ["LAMIS", "DHIS2/NHMIS", "EDCT", "e-TB", "SORMAS", "NDR", "Other"] },
      { ref: "1.2", q: "State reporting rate last quarter, by disease (enter % each)", kind: "percent", parts: ["HIV", "TB", "malaria", "MNCH"] },
      { ref: "1.3", q: "Is any data exchanged or reconciled across platforms?", kind: "radio", opts: ["None", "Manual export", "API/automated"] },
      { ref: "1.4", q: "Frequency and functioning of state data review / situation room", kind: "radio", opts: ["Weekly", "Monthly", "Quarterly", "None"] },
      { ref: "1.5", q: "Is an action tracker maintained, and what is the closure rate?", kind: "radio", opts: ["Yes", "No"], extra: { label: "Closure rate (%)", kind: "text" } },
      { ref: "1.6", q: "Has DQA been conducted? When, and using what method?", kind: "radio", opts: ["Yes", "No"], extra: { label: "Date / method", kind: "text" } },
      { ref: "1.7", q: "State hosting/server, connectivity, and power reliability", kind: "radio", opts: ["Adequate", "Partial", "Inadequate"] },
      { ref: "1.8", q: "MEAL staff with advanced-analytics skills (DHIS2, GIS, dashboards, AI/ML, cyber)", kind: "count" },
      { ref: "1.9", q: "Data-governance focal person and data-sharing SOP in place?", kind: "radio", opts: ["Yes", "No", "Partial"] },
      { ref: "1.10", q: "NDPA 2023 / cybersecurity measures in place?", kind: "radio", opts: ["Yes", "No", "Partial"] },
      { ref: "1.11", q: "Which MEAL functions are government-led vs partner-led?", kind: "narrative" },
      { ref: "1.12", q: "Can systems distinguish donor vs domestic financing?", kind: "radio", opts: ["Yes", "No", "Partial"] },
      { ref: "1.13", q: "Feedback provided to LGAs on their data?", kind: "radio", opts: ["Routine", "Occasional", "None"] },
      { ref: "1.14", q: "How has insecurity affected state data completeness?", kind: "narrative" },
    ],
  },
  {
    id: "2", title: "LGA M&E assessment", type: "qa",
    respondents: "LGA M&E Officer, DSNO.", time: "30–45 minutes",
    items: [
      { ref: "2.1", q: "Reporting completeness last 3 months (facilities reporting ÷ expected)", kind: "text", opts: ["Enter %"] },
      { ref: "2.2", q: "Reporting timeliness for the last 3 months (on-time ÷ expected)", kind: "text", opts: ["Enter %"] },
      { ref: "2.3", q: "Where is data entered into DHIS2?", kind: "radio", opts: ["Facility", "LGA", "State"] },
      { ref: "2.4", q: "Funds available for report collection from facilities?", kind: "radio", opts: ["Yes", "No"], extra: { label: "Source", kind: "text" } },
      { ref: "2.5", q: "Funds for data validation visits and transmission?", kind: "radio", opts: ["Yes", "No"] },
      { ref: "2.6", q: "Funds for review meetings and feedback?", kind: "radio", opts: ["Yes", "No"] },
      { ref: "2.7", q: "DHIS2 access problems (connectivity, power, transport)?", kind: "narrative" },
      { ref: "2.8", q: "Are updated micro-plans / denominators available?", kind: "radio", opts: ["Yes", "Partial", "No"] },
      { ref: "2.9", q: "Is data validated before entry, and feedback given to facilities?", kind: "radio", opts: ["Yes", "No"] },
      { ref: "2.10", q: "LGA review-meeting frequency and attendance", kind: "text" },
      { ref: "2.11", q: "Number of hard-to-reach or non-reporting facilities", kind: "count" },
      { ref: "2.12", q: "DSNO in post; IDSR / EWARS / 5W reporting functioning?", kind: "radio", opts: ["Yes", "No", "Partial"] },
      { ref: "2.13", q: "Security disruptions to LGA reporting in last 6 months", kind: "narrative" },
    ],
  },
  {
    id: "3", title: "Health facility MEAL and infrastructure assessment", type: "qa",
    respondents: "Officer-in-Charge, records/M&E focal person.", time: "30–40 minutes",
    items: [
      { ref: "3.1", q: "Facility type and support status", kind: "radio", opts: ["PHC", "Secondary Health Care", "Tertiary Health Care", "Donor Supported", "Non-Donor Supported"] },
      { ref: "3.2", q: "Registers available (HIV, TB, malaria, ANC, immunization, lab)?", kind: "radio", opts: ["All", "Some", "None"], extra: { label: "List gaps", kind: "text" } },
      { ref: "3.3", q: "Monthly summary form available; any stock-out in last 12 months?", kind: "radio", opts: ["Available", "Stock-out"], extra: { label: "When", kind: "text" } },
      { ref: "3.4", q: "Who compiles the monthly report?", kind: "radio", opts: ["Officer In Charge", "M&E", "CHW", "Other"] },
      { ref: "3.5", q: "Data recording/reporting training received in the last 12 months?", kind: "radio", opts: ["Yes", "No"] },
      { ref: "3.6", q: "Computer or tablet for data work?", kind: "radio", opts: ["Yes", "No"] },
      { ref: "3.7", q: "Internet connectivity; power availability?", kind: "radio", opts: ["Internet Y", "Internet N", "Power reliable", "Power intermittent", "Power none"] },
      { ref: "3.8", q: "How are reports transported to the LGA?", kind: "radio", opts: ["Transport", "Courier", "Phone/data", "N/A"] },
      { ref: "3.9", q: "Monthly report sent, and on time?", kind: "radio", opts: ["Yes on time", "Yes late", "No"] },
      { ref: "3.10", q: "Any analysis or QI at facility (e.g., dropout, coverage)?", kind: "radio", opts: ["Yes", "No"], extra: { label: "Type", kind: "text" } },
      { ref: "3.11", q: "QI team present; feedback received from LGA?", kind: "radio", opts: ["Yes", "No"] },
      { ref: "3.12", q: "Biometrics or EMR present (e.g., LAMIS/EDCT)?", kind: "radio", opts: ["Yes", "No"] },
    ],
  },
  {
    id: "4", title: "Facility data-quality assessment (DQA verification)", type: "dqa",
    note: "Recount the source register for each indicator and compare with the facility monthly summary and the DHIS2 value for two recent months. Enter the verification factor (recount ÷ reported). Mark accurate when the verification factor is within the agreed tolerance (±5–10%). Use aggregate counts only; record no patient identifiers.",
    indicators: [
      "HTS_TST (month 1)", "HTS_TST (month 2)", "TX_CURR (month 1)", "TX_CURR (month 2)",
      "TB notifications (m1)", "TB notifications (m2)", "Confirmed malaria (m1)", "Confirmed malaria (m2)",
      "ANC 1st visit (m1)", "ANC 4th visit (m1)", "Penta 3 (m1)", "PMTCT: ART for pregnant women (m1)",
    ],
    summary: [
      { key: "accuracy", label: "Overall accuracy", def: "Share of indicator-periods within tolerance" },
      { key: "completeness", label: "Completeness", def: "Expected data elements present in the summary" },
      { key: "timeliness", label: "Timeliness", def: "Report submitted by the due date (last 3 months)" },
      { key: "lab_tat", label: "Laboratory turnaround time", def: "Median days from sample to result (if applicable)" },
    ],
  },
  {
    id: "5", title: "Digital systems and interoperability inventory", type: "inventory",
    note: "Complete one row per platform, at the level (facility, LGA, or state) being assessed. This inventory builds the reconciliation and interoperability map called for in the situation analysis.",
    platforms: ["LAMIS", "DHIS2 / NHMIS", "EDCT", "e-TB Manager", "SORMAS", "NDR", "NDARS", "NADIS", "BAYCentral"],
    cols: [
      { key: "inuse", label: "In use? (Y/N)", kind: "yn" },
      { key: "level", label: "Level", kind: "select", opts: ["", "Facility", "LGA", "State"] },
      { key: "exchanges", label: "Exchanges data with (list)", kind: "text" },
      { key: "method", label: "Method", kind: "select", opts: ["", "Manual", "Export", "API", "None"] },
      { key: "owner", label: "Owner / issues", kind: "text" },
    ],
  },
  {
    id: "6", title: "FCV, access and reporting-continuity module", type: "qa",
    note: "Apply at the facility and LGA levels in fragile, conflict- or violence-affected areas. This module distinguishes data gaps caused by insecurity from data-quality failures, and captures the feasibility of remote and continuity mechanisms.",
    items: [
      { ref: "6.1", q: "Facility functionality status", kind: "radio", opts: ["Functional", "Partially", "Damaged", "Non-functional", "Closed"] },
      { ref: "6.2", q: "Accessibility tier for data collection", kind: "radio", opts: ["Tier 1", "Tier 2", "Tier 3"] },
      { ref: "6.3", q: "Modality used for this assessment", kind: "radio", opts: ["In person", "Remote KII", "Proxy", "Third-party monitor"] },
      { ref: "6.4", q: "Does the facility serve IDP or host-community populations?", kind: "radio", opts: ["Yes", "No"] },
      { ref: "6.5", q: "Are IDP/host caseloads captured and reported?", kind: "radio", opts: ["Yes", "Partial", "No"] },
      { ref: "6.6", q: "Security incidents affecting reporting, the last 6 months", kind: "text", opts: ["Count · type"] },
      { ref: "6.7", q: "Was reporting maintained during the last disruption (conflict/flood/displacement)?", kind: "radio", opts: ["Maintained", "Interrupted"] },
      { ref: "6.8", q: "Is there a catch-up mechanism for missed reports?", kind: "radio", opts: ["Yes", "No"] },
      { ref: "6.9", q: "Feasible alternative reporting channels", kind: "multi", opts: ["Phone", "Radio", "Courier", "Third-party", "None"] },
      { ref: "6.10", q: "Is EWARS / IDSR emergency reporting functioning here?", kind: "radio", opts: ["Yes", "No", "Partial"] },
      { ref: "6.11", q: "Data-safety practice in insecure areas (no GPS/photos; secure transmission)?", kind: "radio", opts: ["Yes", "No"] },
      { ref: "6.12", q: "Staff turnover or absence due to insecurity affecting MEAL?", kind: "radio", opts: ["Yes", "No"], extra: { label: "Describe", kind: "text" } },
    ],
  },
  {
    id: "7", title: "MEAL workforce capacity matrix", type: "workforce",
    note: "Complete per office (state or LGA) or aggregated for AHNi MEAL. Enter the number proficient, the number needed, and the training priority.",
    skills: [
      "DHIS2 configuration and analysis", "SQL / database administration", "Dashboards (Power BI / DHIS2)",
      "Programming (Python / R)", "GIS / geospatial", "API / systems integration",
      "AI / machine learning", "Cybersecurity / data protection", "DQA methods (WHO / PRISM)",
    ],
  },
  {
    id: "8", title: "Milestone-verification readiness checklist", type: "checklist",
    note: "Assess whether the system can verify milestone-triggering results from auditable evidence. Complete at state and AHNi MEAL level.",
    items: [
      { ref: "8.1", q: "Milestone indicators have documented, agreed-upon definitions." },
      { ref: "8.2", q: "Source documents are retained and retrievable per indicator." },
      { ref: "8.3", q: "A central evidence repository exists for milestone evidence." },
      { ref: "8.4", q: "An audit trail links reported results to source records." },
      { ref: "8.5", q: "Electronic verification against source is possible." },
      { ref: "8.6", q: "Independent (third-party or internal audit) verification is feasible." },
      { ref: "8.7", q: "A milestone-to-evidence map exists." },
      { ref: "8.8", q: "A sign-off / approval workflow governs reported results." },
    ],
  },
  {
    id: "9", title: "MEAL maturity scoring sheet", type: "maturity",
    note: "Score each dimension 1 to 5 (1 dependent, 2 supported, 3 co-managed, 4 government-led, 5 independent) and cite the evidence. These scores update Section 5 and Annex A of the situation analysis.",
    dimensions: [
      "Routine reporting systems", "Interoperability across platforms", "Data quality and verification",
      "Infrastructure and connectivity", "MEAL workforce and analytics", "Surveillance and preparedness MEAL",
      "Data governance and security", "Transition and country ownership",
    ],
  },
];

// Annex C — sampling & field-planning worksheet (repeatable rows).
export const ANNEX_C = {
  title: "Annex C: Sampling and field-planning worksheet",
  note: "One row per selected LGA. Complete before fieldwork; adjust for access and time.",
  cols: [
    { key: "state", label: "State", kind: "text" },
    { key: "lga", label: "LGA", kind: "text" },
    { key: "tier", label: "Tier", kind: "select", opts: ["", "Tier 1", "Tier 2", "Tier 3"] },
    { key: "target", label: "Facilities target", kind: "text" },
    { key: "idp", label: "IDP-serving?", kind: "select", opts: ["", "Yes", "No"] },
    { key: "notes", label: "Notes / modality", kind: "text" },
  ],
};

// Annex D — field team roster + daily QA checklist.
export const ANNEX_D = {
  title: "Annex D: Field team roster and daily QA checklist",
  roster: [
    { key: "state_lead", role: "State lead", resp: "Coordination, permissions, security liaison" },
    { key: "assessor1", role: "Assessor 1", resp: "State and LGA instruments" },
    { key: "assessor2", role: "Assessor 2", resp: "Facility and FCV instruments" },
    { key: "dq_lead", role: "Data-quality lead", resp: "DQA verification, validation, back-checks" },
  ],
  checklist: [
    "All submissions synced and backed up (with paper backups reconciled)",
    "Site tier and modality recorded for every site, including remote/proxy",
    "DQA cross-checked against the source registers for a sample",
    "Range and consistency validation run; flags resolved or noted",
    "No GPS, photos or identifiers captured in Tier 2/3 areas",
    "Consent recorded for every interview",
    "Security and safeguarding issues logged and referred",
    "Daily debrief held; inconsistencies and access changes recorded",
  ],
};

// Annex A & B — read-only reference content shown for guidance.
export const REFERENCE = {
  annexA: {
    title: "Annex A: Evidence-to-instrument mapping",
    intro: "Each situation-analysis question is mapped to the instrument that captures it.",
    rows: [
      ["Reporting rates by state/LGA/facility/disease and root causes", "1, 2, 3", "Section 6"],
      ["Client pathway measurable once reconciled", "3, 5", "Section 5.1 / Obj 1"],
      ["Facility data-quality profile (accuracy/completeness/timeliness)", "4", "Section 6, Annex B"],
      ["Adamawa and Taraba HMIS accuracy figures", "4", "Annex B, Section 7"],
      ["Milestone-verification readiness", "8", "Cross-cutting"],
      ["Interoperability status across platforms", "5", "Section 5.2, Obj 2"],
      ["Infrastructure inventory and server capacity", "3, 1", "Section 4.3, 5"],
      ["Bauchi automation baseline", "1, 5", "Section 7.5"],
      ["MEAL workforce advanced analytics capacity", "7", "Section 4.6, 5"],
      ["LGA M&E operational-funding gaps", "2", "Section 6, 8"],
      ["Performance-review structures functioning", "1, 2", "Cross-cutting"],
      ["Cybersecurity / vulnerability posture", "1, 8", "Cross-cutting"],
      ["Government MEAL maturity by dimension", "9", "Section 5, Annex A"],
      ["Donor vs domestic financing distinguishable", "1", "Section 4.8, Obj 4"],
      ["Surveillance / continuity under FCV", "6", "Section 4.4, Obj 3"],
    ],
    cols: ["Situation-analysis question / part", "Instrument", "Updates"],
  },
  annexB: {
    title: "Annex B: Facility accessibility and security-tier definitions",
    rows: [
      ["Tier 1", "Fully accessible; routine movement possible", "In-person assessment (all instruments)"],
      ["Tier 2", "Partially accessible or hard-to-reach; access variable or requires clearance", "In person where security permits; otherwise remote KII plus document review"],
      ["Tier 3", "Inaccessible for direct visits due to insecurity", "Remote KII by phone/radio; LGA-held proxy data; third-party monitor; HeRAMS / 5W records"],
    ],
    cols: ["Tier", "Definition", "Data-collection modality"],
    footer: "Every selected site is tagged with its tier and the modality used, so coverage and any gaps caused by insecurity rather than by data quality are transparent.",
  },
};

/* ------------------------------------------------------------------ */
/* Field-id helpers                                                    */
/* ------------------------------------------------------------------ */

export function instrumentById(id) {
  return INSTRUMENTS.find((i) => i.id === String(id)) || null;
}

// Annex C/D behave like extra "instruments" for storage & the picker.
export const EXTRAS = [
  { id: "annexC", title: ANNEX_C.title, kind: "annexC" },
  { id: "annexD", title: ANNEX_D.title, kind: "annexD" },
];

export function targetById(id) {
  return instrumentById(id) || EXTRAS.find((e) => e.id === String(id)) || null;
}

// Landing-page grouping by administrative level. An instrument may appear in
// more than one group (it links to the same /meal/<id> form either way).
export const GROUPS = [
  { key: "states", level: "States", note: "State-level instruments, completed together in one pass.", ids: ["1", "5", "7", "8", "9"] },
  { key: "lga", level: "LGA", note: "LGA-level instruments, completed together in one pass.", ids: ["2", "7", "9"] },
  { key: "facilities", level: "Facilities", note: "Facility-level instruments (Instrument 6 for FCV / insecure areas).", ids: ["3", "4", "6", "9"] },
];

export function groupByKey(key) {
  return GROUPS.find((g) => g.key === String(key)) || null;
}

// Fields required before submitting: full site header for instruments 1–9,
// just the assessor for the annexes (they are planning/roster sheets).
export function requiredFor(id) {
  return instrumentById(id) ? REQUIRED_HEADER : ["assessor"];
}

// Return { id -> { question, group } } for one instrument's answer fields.
export function instrumentDictionary(inst) {
  const d = {};
  const P = `i${inst.id}`;
  const put = (id, question, group) => { d[id] = { question, group: group || inst.title }; };

  if (inst.type === "qa") {
    inst.items.forEach((it) => {
      put(`${P}-${it.ref}`, `${it.ref} ${it.q}`);
      if (it.opts && it.opts.includes("Other")) put(`${P}-${it.ref}-other`, `${it.ref} ${it.q} — Other (specify)`);
      if (it.extra) put(`${P}-${it.ref}-x`, `${it.ref} ${it.q} — ${it.extra.label}`);
      if (it.kind === "percent") it.parts.forEach((p) => put(`${P}-${it.ref}-${slug(p)}`, `${it.ref} ${it.q} — ${p} (%)`));
      put(`${P}-${it.ref}-src`, `${it.ref} ${it.q} — source of verification`);
    });
  } else if (inst.type === "dqa") {
    inst.indicators.forEach((ind) => {
      const s = slug(ind);
      put(`${P}-${s}-recount`, `${ind} — register recount`);
      put(`${P}-${s}-summary`, `${ind} — monthly summary`);
      put(`${P}-${s}-dhis2`, `${ind} — DHIS2 value`);
      put(`${P}-${s}-vf`, `${ind} — verification factor (recount ÷ reported)`);
      put(`${P}-${s}-acc`, `${ind} — accurate? (Y/N)`);
    });
    inst.summary.forEach((m) => put(`${P}-sum-${m.key}`, `Summary — ${m.label}`));
  } else if (inst.type === "inventory") {
    inst.platforms.forEach((pf) => {
      inst.cols.forEach((c) => put(`${P}-${slug(pf)}-${c.key}`, `${pf} — ${c.label}`));
    });
  } else if (inst.type === "workforce") {
    inst.skills.forEach((sk) => {
      put(`${P}-${slug(sk)}-prof`, `${sk} — # proficient`);
      put(`${P}-${slug(sk)}-need`, `${sk} — # needed`);
      put(`${P}-${slug(sk)}-prio`, `${sk} — training priority (H/M/L)`);
    });
  } else if (inst.type === "checklist") {
    inst.items.forEach((it) => {
      put(`${P}-${it.ref}`, `${it.ref} ${it.q}`);
      put(`${P}-${it.ref}-ev`, `${it.ref} ${it.q} — evidence / note`);
    });
  } else if (inst.type === "maturity") {
    inst.dimensions.forEach((dm) => {
      put(`${P}-${slug(dm)}-score`, `${dm} — score (1–5)`);
      put(`${P}-${slug(dm)}-ev`, `${dm} — evidence / justification`);
    });
  }
  return d;
}

// Primary field ids per instrument — one representative field per row/item,
// used for the completion meter.
export function primaryIds(inst) {
  const P = `i${inst.id}`;
  if (inst.type === "qa") return inst.items.map((it) => `${P}-${it.ref}`);
  if (inst.type === "dqa") return inst.indicators.map((ind) => `${P}-${slug(ind)}-recount`);
  if (inst.type === "inventory") return inst.platforms.map((pf) => `${P}-${slug(pf)}-inuse`);
  if (inst.type === "workforce") return inst.skills.map((sk) => `${P}-${slug(sk)}-prof`);
  if (inst.type === "checklist") return inst.items.map((it) => `${P}-${it.ref}`);
  if (inst.type === "maturity") return inst.dimensions.map((dm) => `${P}-${slug(dm)}-score`);
  return [];
}

// slugify a label into a stable field-id fragment.
export function slug(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}
