import { notFound } from "next/navigation";
import { groupByKey, instrumentById, GROUPS } from "../../../../lib/mealModel";
import LevelWizard from "../../../../components/meal/LevelWizard";

export function generateStaticParams() {
  return GROUPS.map((g) => ({ level: g.key }));
}

export default function LevelPage({ params }) {
  const g = groupByKey(params.level);
  if (!g) notFound();
  const level = {
    key: g.key,
    label: g.level,
    note: g.note,
    instruments: g.ids.map((id) => instrumentById(id)).filter(Boolean),
  };
  return <LevelWizard level={level} />;
}
