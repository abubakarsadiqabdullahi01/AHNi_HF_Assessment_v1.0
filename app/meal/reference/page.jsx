import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { REFERENCE } from "../../../lib/mealModel";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/card";

function RefTable({ block }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{block.title}</CardTitle>
        {block.intro && <CardDescription>{block.intro}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-secondary">
              <tr>{block.cols.map((c) => <th key={c} className="p-2 text-left font-semibold">{c}</th>)}</tr>
            </thead>
            <tbody>
              {block.rows.map((r, i) => (
                <tr key={i} className="border-t align-top">
                  {r.map((cell, j) => <td key={j} className={j === 0 ? "p-2 font-medium" : "p-2"}>{cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {block.footer && <p className="mt-3 text-xs text-muted-foreground">{block.footer}</p>}
      </CardContent>
    </Card>
  );
}

export default function ReferencePage() {
  return (
    <div className="mx-auto max-w-4xl px-5 py-8">
      <Link href="/meal" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All instruments
      </Link>
      <h1 className="mb-6 text-2xl font-bold">Reference guidance</h1>
      <div className="space-y-6">
        <RefTable block={REFERENCE.annexA} />
        <RefTable block={REFERENCE.annexB} />
      </div>
    </div>
  );
}
