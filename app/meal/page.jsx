import Link from "next/link";
import { ArrowRight } from "lucide-react";
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
          Choose your level. You’ll enter the site details once, then step through that level’s
          instruments and submit them together at the end.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button variant="outline" asChild><Link href="/meal/annexC">Annex C · Sampling worksheet</Link></Button>
          <Button variant="outline" asChild><Link href="/meal/annexD">Annex D · Roster &amp; daily QA</Link></Button>
          <Button variant="ghost" asChild><Link href="/meal/reference">Reference (Annex A &amp; B)</Link></Button>
        </div>
      </header>

      <div className="grid gap-5 md:grid-cols-3">
        {GROUPS.map((g) => (
          <Card key={g.key} className="flex flex-col">
            <CardHeader>
              <CardTitle className="text-xl">{g.level}</CardTitle>
              <p className="text-sm text-muted-foreground">{g.note}</p>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col">
              <ul className="mb-5 space-y-1.5 text-sm">
                {g.ids.map((id) => {
                  const inst = instrumentById(id);
                  return (
                    <li key={id} className="flex gap-2">
                      <span className="font-semibold text-primary">Instrument {id}</span>
                      <span className="text-muted-foreground">{inst?.title}</span>
                    </li>
                  );
                })}
              </ul>
              <Button asChild className="mt-auto w-full">
                <Link href={`/meal/level/${g.key}`}>Start {g.level} assessment <ArrowRight className="h-4 w-4" /></Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
