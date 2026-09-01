import Icon from "./Icon.jsx";

export default function StatCard({ label, value, accent, glass, icon }) {
  return (
    <div className={`stat-tile ${accent ? `accent-${accent}` : ""} ${glass ? "stat-tile-glass" : ""}`}>
      {icon && (
        <div className={`stat-tile-icon ${accent ? `accent-${accent}` : ""}`}>
          <Icon name={icon} size={16} />
        </div>
      )}
      <div className="stat-tile-body">
        <div className="label">{label}</div>
        <div className="value">{value}</div>
      </div>
    </div>
  );
}
