import "./meal.css";

export const metadata = {
  title: "AHNi MEAL Rapid Assessment Tool",
  description: "Monitoring, Evaluation, Accountability & Learning — rapid field assessment instruments",
};

export default function MealLayout({ children }) {
  return <div className="meal-root min-h-screen antialiased">{children}</div>;
}
