import { Routes, Route, NavLink } from "react-router-dom";
import AgentIntake from "./pages/AgentIntake.jsx";
import CaseSummary from "./pages/CaseSummary.jsx";
import Queue from "./pages/Queue.jsx";

export default function App() {
  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="brand">SpotShield AI</div>
        <nav>
          <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>
            New Case
          </NavLink>
          <NavLink to="/queue" className={({ isActive }) => (isActive ? "active" : "")}>
            Queue
          </NavLink>
        </nav>
      </div>

      <Routes>
        <Route path="/" element={<AgentIntake />} />
        <Route path="/queue" element={<Queue />} />
        <Route path="/cases/:id" element={<CaseSummary />} />
      </Routes>
    </div>
  );
}
