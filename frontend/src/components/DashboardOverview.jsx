import { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import CalorieSummary from "./CalorieSummary";
import MealsLogged from "./MealsLogged";
import ActivitySection from "./ActivitySection";
import WeightSection from "./WeightSection";
import ProgressCharts from "./ProgressCharts";
import DatePicker from "./DatePicker";
import { getCalorieGoal, getFoodLogs } from "../api/client";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDateLabel(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Today";
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export default function DashboardOverview() {
  const { userId } = useOutletContext();
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [foodLogs, setFoodLogs] = useState([]);
  const [goalKcal, setGoalKcal] = useState(1625);

  const refresh = useCallback(async () => {
    if (!userId) return;
    try {
      const [goalRes, logs] = await Promise.all([
        getCalorieGoal(userId),
        getFoodLogs(userId, selectedDate),
      ]);
      setGoalKcal(goalRes.goalKcal ?? 1625);
      setFoodLogs(logs);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setFoodLogs([]);
    }
  }, [userId, selectedDate]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const eaten = foodLogs.reduce((sum, log) => sum + (log.totalCal ?? 0), 0);
  const remaining = Math.max(0, goalKcal - eaten);

  return (
    <>
      <div className="dashboard-date-row">
        <DatePicker value={selectedDate} onChange={setSelectedDate} />
        <span className="dashboard-date-label">{formatDateLabel(selectedDate)}</span>
      </div>
      <div className="dashboard-content">
        <CalorieSummary
          eaten={Math.round(eaten)}
          remaining={Math.round(remaining)}
          burned={0}
          goal={goalKcal}
        />
        <MealsLogged
          userId={userId}
          selectedDate={selectedDate}
          logs={foodLogs}
          onRefresh={refresh}
        />
        <WeightSection userId={userId} selectedDate={selectedDate} onRefresh={refresh} />
        <ProgressCharts userId={userId} />
        <ActivitySection burned={0} />
      </div>
      <footer className="dashboard-footer">
        <a
          href="https://fdc.nal.usda.gov"
          target="_blank"
          rel="noopener noreferrer"
          className="fdc-attribution"
        >
          Food data from USDA FoodData Central, fdc.nal.usda.gov
        </a>
      </footer>
    </>
  );
}
