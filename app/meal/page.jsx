import Link from "next/link";
import { GROUPS, instrumentById } from "../../lib/mealModel";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";

// MEAL landing — instruments grouped by administrative level. This is the public fill link.
export default function MealHome() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <header className="mb-8">
        <p className="text-xs font-bold uppercase tracking-wider text-primary">
          AHNi · Monitoring, Evaluation, Accountability &amp; Learning
        </p>
        <h1 className="mt-1 text-2xl font-bold text-foreground">MEAL Rapid Assessment Tool</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Choose your level, then open the instrument that matches your role. Each instrument is
          submitted separately with its own site header.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button variant="outline" asChild><Link href="/meal/annexC">Annex C · Sampling worksheet</Link></Button>
          <Button variant="outline" asChild><Link href="/meal/annexD">Annex D · Roster &amp; daily QA</Link></Button>
          <Button variant="ghost" asChild><Link href="/meal/reference">Reference (Annex A &amp; B)</Link></Button>
        </div>
      </header>

      <div className="space-y-8">
        {GROUPS.map((g) => (
          <section key={g.level}>
            <div className="mb-3 flex items-baseline gap-3">
              <h2 className="text-lg font-bold text-foreground">{g.level}</h2>
              <span className="text-sm text-muted-foreground">{g.note}</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {g.ids.map((id) => {
                const inst = instrumentById(id);
                if (!inst) return null;
                return (
                  <Card key={id} className="flex flex-col">
                    <CardHeader>
                      <p className="text-xs font-bold text-primary">Instrument {inst.id}</p>
                      <CardTitle className="text-base leading-snug">{inst.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="mt-auto">
                      <Button asChild className="w-full"><Link href={`/meal/${inst.id}`}>Open instrument</Link></Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
