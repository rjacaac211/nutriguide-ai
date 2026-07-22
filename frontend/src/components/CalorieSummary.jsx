export default function CalorieSummary({ eaten = 0, remaining = null, goal = null }) {
  const loading = goal == null;
  return (
    <>
      <div className="calorie-tile calorie-tile-remaining">
        <span className="calorie-tile-value">{loading ? "…" : remaining}</span>
        <span className="calorie-tile-label">{loading ? "Goal…" : `Goal ${goal} kcal`}</span>
      </div>
      <div className="calorie-tile calorie-tile-eaten">
        <span className="calorie-tile-value calorie-tile-value-sm">{loading ? "…" : eaten}</span>
        <span className="calorie-tile-label">Eaten</span>
      </div>
    </>
  );
}
