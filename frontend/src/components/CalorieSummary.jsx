export default function CalorieSummary({ eaten = 0, remaining = null, goal = null }) {
  const loading = goal == null;
  return (
    <div className="calorie-summary">
      <div className="calorie-item">
        <span className="calorie-label">Eaten</span>
        <span className="calorie-value">{loading ? "…" : eaten}</span>
      </div>
      <div className="calorie-item calorie-remaining">
        <span className="calorie-value calorie-remaining-value">{loading ? "…" : remaining}</span>
        <span className="calorie-label">{loading ? "Goal…" : `Goal ${goal} kcal`}</span>
      </div>
    </div>
  );
}
