import { Routes, Route, NavLink, Outlet, Link } from "react-router-dom";
import AgentIntake from "./pages/AgentIntake.jsx";
import CaseSummary from "./pages/CaseSummary.jsx";
import Queue from "./pages/Queue.jsx";
import Landing from "./pages/Landing.jsx";

function AppLayout() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="nav-links">
          <Link to="/welcome" className="brand">
            <span className="mark">S</span>
            SPOTSHIELD
          </Link>
          <nav>
            <NavLink to="/queue" className={({ isActive }) => (isActive ? "active" : "")}>
              Cases
            </NavLink>
            <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>
              New Case
            </NavLink>
          </nav>
        </div>
        <div className="agent-chip">
          <span className="avatar">FA</span>
          Field Agent
        </div>
      </header>

      <Outlet />
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/welcome" element={<Landing />} />
      <Route element={<AppLayout />}>
        <Route path="/" element={<AgentIntake />} />
        <Route path="/queue" element={<Queue />} />
        <Route path="/cases/:id" element={<CaseSummary />} />
      </Route>
    </Routes>
  );
}
