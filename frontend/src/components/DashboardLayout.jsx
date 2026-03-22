import { Outlet, NavLink } from "react-router-dom";

export default function DashboardLayout({ profile, userId, onLogout }) {
  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="dashboard-header-row">
          <h1>NutriGuide AI</h1>
          {onLogout && (
            <button type="button" className="dashboard-logout-btn" onClick={onLogout}>
              Log out
            </button>
          )}
        </div>
        <nav className="dashboard-tabs" aria-label="Dashboard sections">
          <NavLink
            to="/dashboard"
            end
            className={({ isActive }) => `dashboard-tab ${isActive ? "active" : ""}`}
          >
            Overview
          </NavLink>
          <NavLink
            to="/dashboard/chat"
            className={({ isActive }) => `dashboard-tab ${isActive ? "active" : ""}`}
          >
            Chat
          </NavLink>
        </nav>
      </header>
      <div className="dashboard-outlet">
        <Outlet context={{ profile, userId, onLogout }} />
      </div>
    </div>
  );
}
