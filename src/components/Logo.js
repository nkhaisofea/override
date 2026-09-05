export function ShieldMark({ className = "w-7 h-7" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 2L4 5v6c0 5 3.4 8.7 8 9.9 4.6-1.2 8-4.9 8-9.9V5l-8-3z"
        fill="var(--accent)"
        fillOpacity="0.16"
        stroke="var(--accent)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 12.2l2.4 2.4 4.6-5"
        stroke="var(--accent)"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Wordmark({ className = "" }) {
  return (
    <span
      className={`label-tracked text-lg text-foreground ${className}`}
      style={{ letterSpacing: "0.14em" }}
    >
      VITAURA
    </span>
  );
}

export function Logo({ className = "" }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <ShieldMark />
      <Wordmark />
    </div>
  );
}
