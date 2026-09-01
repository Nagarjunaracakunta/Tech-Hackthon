// Small hand-authored monochrome icon set (stroke, currentColor) — no icon
// library dependency. Sized via the `size` prop, colored via CSS `color`.
const PATHS = {
  identity: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2.4" />
      <circle cx="8.5" cy="11" r="2" />
      <path d="M5.5 16c.5-1.8 1.8-2.6 3-2.6s2.5.8 3 2.6" />
      <path d="M14 10h5M14 13.2h5" />
    </>
  ),
  credit: (
    <>
      <path d="M4 19V10M9.5 19V5M15 19v-7M20 19v-4" />
      <path d="M3 19h18" />
    </>
  ),
  vehicleDoc: (
    <>
      <path d="M6 3.5h9l4 4V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" />
      <path d="M9 12h6M9 15.5h6M9 8.5h3" />
    </>
  ),
  camera: (
    <>
      <path d="M4 8.5a1.5 1.5 0 0 1 1.5-1.5h2l1.2-1.8h6.6L16.5 7h2A1.5 1.5 0 0 1 20 8.5V18a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18Z" />
      <circle cx="12" cy="13" r="3.4" />
    </>
  ),
  applicant: (
    <>
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5.5 19.5c1-3.6 3.6-5.5 6.5-5.5s5.5 1.9 6.5 5.5" />
    </>
  ),
  vehicle: (
    <>
      <path d="M4 16v-2.3l1.8-4.6A2 2 0 0 1 7.7 8h8.6a2 2 0 0 1 1.9 1.4l1.6 4.4V16" />
      <path d="M4 16h16v2a1 1 0 0 1-1 1h-1.4a1 1 0 0 1-1-1v-1H7.4v1a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Z" />
      <circle cx="7.6" cy="16" r="1.3" />
      <circle cx="16.4" cy="16" r="1.3" />
    </>
  ),
  dollar: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v10M14.6 9.4c-.4-.7-1.3-1.1-2.4-1.1-1.5 0-2.6.8-2.6 2s1 1.7 2.6 2c1.6.3 2.6.9 2.6 2.1s-1.1 2-2.6 2c-1.1 0-2-.4-2.5-1.2" />
    </>
  ),
  chart: (
    <>
      <path d="M4 4v16h16" />
      <path d="M7.5 15.5 11 11l2.6 2.4L19 8" />
    </>
  ),
  brain: (
    <>
      <path d="M9 4.5a3 3 0 0 0-3 3v.4A3 3 0 0 0 4.5 11v1a3 3 0 0 0 1.5 2.6v.4a3 3 0 0 0 3 3" />
      <path d="M15 4.5a3 3 0 0 1 3 3v.4A3 3 0 0 1 19.5 11v1a3 3 0 0 1-1.5 2.6v.4a3 3 0 0 1-3 3" />
      <path d="M9 4.5v14M15 4.5v14" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="M19 19l-4.3-4.3" />
    </>
  ),
  fork: (
    <>
      <circle cx="12" cy="6" r="2" />
      <circle cx="6" cy="18" r="2" />
      <circle cx="18" cy="18" r="2" />
      <path d="M12 8v3M12 11 6 16M12 11l6 5" />
    </>
  ),
  gift: (
    <>
      <rect x="4" y="9.5" width="16" height="10" rx="1" />
      <path d="M4 13.5h16M12 9.5v10" />
      <path d="M8.5 9.5C6.8 9.5 6 8.5 6 7.3 6 6.2 6.9 5.5 8 5.5c1.7 0 3.2 1.7 4 4Z" />
      <path d="M15.5 9.5c1.7 0 2.5-1 2.5-2.2 0-1.1-.9-1.8-2-1.8-1.7 0-3.2 1.7-4 4Z" />
    </>
  ),
  check: <path d="M5 12.5 10 17 19 7" />,
  cross: <path d="M6 6 18 18M18 6 6 18" />,
  alert: (
    <>
      <path d="M12 4 21 19H3Z" />
      <path d="M12 10.2v4M12 16.5h.01" />
    </>
  ),
  docs: (
    <>
      <path d="M7 3.5h8l4 4V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" />
      <path d="M15 3.5V8h4" />
    </>
  ),
  layers: (
    <>
      <path d="M12 3.5 4 8l8 4.5L20 8Z" />
      <path d="M4 12.5 12 17l8-4.5" />
      <path d="M4 16.5 12 21l8-4.5" />
    </>
  ),
};

export default function Icon({ name, size = 18, strokeWidth = 1.8, className }) {
  const content = PATHS[name];
  if (!content) return null;
  const filled = name === "check" || name === "alert";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {content}
    </svg>
  );
}
