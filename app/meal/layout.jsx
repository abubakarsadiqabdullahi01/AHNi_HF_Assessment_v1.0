import "./meal.css";
import MealHeader from "../../components/meal/MealHeader";

export const metadata = {
  title: "AHNi MEAL Rapid Assessment Tool",
  description: "Monitoring, Evaluation, Accountability & Learning — rapid field assessment instruments",
};

export default function MealLayout({ children }) {
  return (
    <div className="meal-root min-h-screen antialiased">
      <MealHeader />
      {children}
    </div>
  );
}
