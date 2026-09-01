import Icon from "./Icon.jsx";

export default function SectionHeader({ title, subtitle, action, icon }) {
  return (
    <div className="section-header">
      <div className="section-header-title-row">
        {icon && (
          <div className="section-header-icon">
            <Icon name={icon} size={15} />
          </div>
        )}
        <div>
          <h2>{title}</h2>
          {subtitle && <div className="section-subtitle">{subtitle}</div>}
        </div>
      </div>
      {action}
    </div>
  );
}
