import CalorieSummary from "./CalorieSummary";
import MealsLogged from "./MealsLogged";
import ActivitySection from "./ActivitySection";

export default function Dashboard({ profile }) {
  const goalKcal = 1625;
  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>NutriGuide AI</h1>
        <p className="dashboard-date">Today</p>
      </header>
      <div className="dashboard-content">
        <CalorieSummary
          eaten={0}
          remaining={goalKcal}
          burned={0}
          goal={goalKcal}
        />
        <MealsLogged />
        <ActivitySection burned={0} />
      </div>
    </div>
  );
}
