export default function ActivitySection({ burned = 0 }) {
  return (
    <div className="activity-section">
      <h3 className="activity-title">Activity</h3>
      <div className="activity-card">
        <span className="activity-label">Calories burned</span>
        <span className="activity-value">{burned}</span>
      </div>
    </div>
  );
}
