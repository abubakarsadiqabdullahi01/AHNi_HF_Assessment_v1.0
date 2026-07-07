import { notFound } from "next/navigation";
import { instrumentById } from "../../../lib/mealModel";
import InstrumentForm from "../../../components/meal/InstrumentForm";

export function generateStaticParams() {
  return ["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((id) => ({ id }));
}

export default function InstrumentPage({ params }) {
  const inst = instrumentById(params.id);
  if (!inst) notFound();
  return <InstrumentForm inst={inst} />;
}
