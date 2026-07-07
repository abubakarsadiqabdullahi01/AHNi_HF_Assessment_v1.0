import Link from "next/link";

// Branded top bar shown on every MEAL page (mirrors the Health Financing form).
export default function MealHeader() {
  return (
    <header className="sticky top-0 z-40 border-b-2 border-primary bg-[#1a1a1a] text-white shadow-sm">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-5 py-2.5">
        <Link href="/meal" className="inline-flex items-center rounded-md bg-white px-2.5 py-1.5 shadow">
          <img src="/ahni-logo.png" alt="AHNi — Achieving Health Nigeria Initiative" className="h-7 w-auto" />
        </Link>
        <span className="truncate text-[11px] uppercase tracking-wider text-white/70">
          Monitoring, Evaluation, Accountability &amp; Learning · Rapid Assessment
        </span>
      </div>
    </header>
  );
}
