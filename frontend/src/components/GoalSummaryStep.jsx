function calculateGoalDate(weightKg, goalWeightKg, speedKgPerWeek) {
  const diff = weightKg - goalWeightKg;
  if (diff <= 0) return null;
  const weeks = diff / speedKgPerWeek;
  const date = new Date();
  date.setDate(date.getDate() + Math.round(weeks * 7));
  return date;
}

function formatDate(d) {
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default function GoalSummaryStep({ profile, onContinue }) {
  const { name, weight_kg, goal_weight_kg, goal, speed_kg_per_week } = profile;
  const isLose = goal === "lose";
  const targetDate = isLose && weight_kg && goal_weight_kg && speed_kg_per_week
    ? calculateGoalDate(weight_kg, goal_weight_kg, speed_kg_per_week)
    : null;

  return (
    <div className="goal-summary-step">
      <h2 className="goal-summary-label">Your goal weight</h2>
      <p className="goal-summary-value">
        {goal_weight_kg != null ? `${goal_weight_kg} kg` : "—"}
      </p>
      {targetDate && (
        <p className="goal-summary-message">
          {name || "You"}, you will reach your goal by {formatDate(targetDate)}
        </p>
      )}
      {goal === "maintain" && (
        <p className="goal-summary-message">
          Your plan supports maintaining your weight.
        </p>
      )}
      {(goal === "gain_muscle" || goal === "eat_healthy") && !targetDate && (
        <p className="goal-summary-message">
          {name || "You"}, your personalized plan is ready.
        </p>
      )}
      <button type="button" className="goal-summary-continue" onClick={onContinue}>
        CONTINUE
      </button>
    </div>
  );
}
