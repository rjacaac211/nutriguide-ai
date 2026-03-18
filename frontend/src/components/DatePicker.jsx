export default function DatePicker({ value, onChange, className = "" }) {
  const dateStr = typeof value === "string" ? value : value?.toISOString?.()?.slice(0, 10) ?? "";

  return (
    <input
      type="date"
      className={`date-picker ${className}`.trim()}
      value={dateStr}
      onChange={(e) => onChange?.(e.target.value)}
      max={new Date().toISOString().slice(0, 10)}
      aria-label="Select date"
    />
  );
}
