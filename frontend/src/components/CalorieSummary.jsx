export default function CalorieSummary({ eaten = 0, remaining = 1625, burned = 0, goal = 1625 }) {
  return (
    <div className="calorie-summary">
      <div className="calorie-item">
        <span className="calorie-label">Eaten</span>
        <span className="calorie-value">{eaten}</span>
      </div>
      <div className="calorie-item calorie-remaining">
        <span className="calorie-value calorie-remaining-value">{remaining}</span>
        <span className="calorie-label">Goal {goal} kcal</span>
      </div>
      <div className="calorie-item">
        <span className="calorie-label">Burned</span>
        <span className="calorie-value">{burned}</span>
      </div>
    </div>
  );
}
