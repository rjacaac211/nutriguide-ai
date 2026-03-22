import { useState, useEffect, useCallback } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { getDailyCalories, getWeightLogs, getCalorieGoal } from "../api/client";

const PRESETS = [
  { key: "7d", label: "7 days", days: 7 },
  { key: "30d", label: "30 days", days: 30 },
  { key: "90d", label: "90 days", days: 90 },
];

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(dateStr, delta) {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatChartDate(dateStr, daysBack) {
  const d = new Date(dateStr + "T12:00:00");
  if (daysBack <= 14) return d.toLocaleDateString(undefined, { weekday: "short" });
  if (daysBack <= 60) return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "2-digit" });
}

export default function ProgressCharts({ userId }) {
  const [rangePreset, setRangePreset] = useState("30d");
  const [dailyCalories, setDailyCalories] = useState([]);
  const [weightLogs, setWeightLogs] = useState([]);
  const [goalKcal, setGoalKcal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const preset = PRESETS.find((p) => p.key === rangePreset) ?? PRESETS[1];
  const toStr = todayStr();
  const fromStr = addDays(toStr, -(preset.days - 1));

  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const [days, logs, goalRes] = await Promise.all([
        getDailyCalories(userId, fromStr, toStr),
        getWeightLogs(userId, fromStr, toStr),
        getCalorieGoal(userId),
      ]);
      setDailyCalories(days);
      setWeightLogs(logs);
      setGoalKcal(goalRes.goalKcal ?? 1625);
    } catch (err) {
      console.error("Progress charts fetch error:", err);
      setError(err.message);
      setDailyCalories([]);
      setWeightLogs([]);
      setGoalKcal(null);
    } finally {
      setLoading(false);
    }
  }, [userId, fromStr, toStr]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const weightByDate = Object.fromEntries(
    weightLogs.map((log) => [log.date, log.weightKg])
  );

  const chartData = dailyCalories.map(({ date, calories }) => ({
    date,
    dateLabel: formatChartDate(date, preset.days),
    calories,
    weight: weightByDate[date] ?? null,
  }));

  const hasWeightData = weightLogs.length > 0;
  const hasCalorieData = dailyCalories.some((d) => d.calories > 0);

  if (loading) {
    return (
      <section className="progress-charts">
        <h3 className="progress-charts-title">Progress</h3>
        <div className="progress-charts-loading">Loading charts…</div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="progress-charts">
        <h3 className="progress-charts-title">Progress</h3>
        <div className="progress-charts-error">{error}</div>
      </section>
    );
  }

  return (
    <section className="progress-charts">
      <div className="progress-charts-header">
        <h3 className="progress-charts-title">Progress</h3>
        <div className="progress-charts-presets">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              className={`progress-charts-preset ${rangePreset === p.key ? "active" : ""}`}
              onClick={() => setRangePreset(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {(!hasWeightData && !hasCalorieData) ? (
        <div className="progress-charts-empty">
          No data in this range. Log meals and weight to see your progress.
        </div>
      ) : (
        <div className="progress-charts-grid">
          {hasWeightData && (
            <div className="progress-charts-card">
              <h4 className="progress-charts-card-title">Weight (kg)</h4>
              <div className="progress-charts-chart">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis
                      dataKey="dateLabel"
                      tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
                    />
                    <YAxis
                      dataKey="weight"
                      domain={["auto", "auto"]}
                      tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--color-bg)",
                        border: "1px solid var(--color-border)",
                        borderRadius: "var(--radius)",
                      }}
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.date}
                    />
                    <Line
                      type="monotone"
                      dataKey="weight"
                      stroke="var(--color-primary)"
                      strokeWidth={2}
                      dot={{ fill: "var(--color-primary)", r: 3 }}
                      connectNulls={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="progress-charts-card">
            <h4 className="progress-charts-card-title">Calories vs goal</h4>
            <div className="progress-charts-chart">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis
                    dataKey="dateLabel"
                    tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
                  />
                  <YAxis
                    dataKey="calories"
                    domain={[0, "auto"]}
                    tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--color-bg)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "var(--radius)",
                    }}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.date}
                  />
                  {goalKcal != null && (
                    <ReferenceLine
                      y={goalKcal}
                      stroke="var(--color-cta)"
                      strokeDasharray="4 4"
                      label={{ value: "Goal", fill: "var(--color-text-muted)", fontSize: 10 }}
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey="calories"
                    stroke="var(--color-primary)"
                    strokeWidth={2}
                    dot={{ fill: "var(--color-primary)", r: 3 }}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

    </section>
  );
}
