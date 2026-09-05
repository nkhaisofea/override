// Surface + button primitives.
//
// These use real Tailwind utility classes (`bg-surface`, `border-accent`)
// rather than inline `style={{ background: "var(--…)" }}`. That's not
// cosmetic: inline styles can't take variants, so hover, focus and responsive
// states had nowhere to live, and every colour was hand-typed at each call
// site. The tokens are registered in globals.css.

export function Card({ children, className = "", raised = false, as: Tag = "div", ...props }) {
  return (
    <Tag
      className={[
        "rounded-3xl border border-border p-5",
        raised ? "bg-surface-raised" : "bg-surface",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </Tag>
  );
}

// A Card that responds to pointer/keyboard — for the tappable rows in
// "Recent checks" and the trending rail.
export function InteractiveCard({ children, className = "", raised = false, ...props }) {
  return (
    <Card
      raised={raised}
      className={[
        "text-left w-full transition-colors duration-150",
        "hover:border-border-strong hover:bg-surface-hover",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </Card>
  );
}

const BUTTON_VARIANTS = {
  solid:
    "bg-accent text-on-accent hover:bg-accent-strong disabled:hover:bg-accent",
  outline:
    "bg-transparent text-foreground border border-border hover:border-accent hover:text-accent disabled:hover:border-border disabled:hover:text-foreground",
  ghost: "bg-surface-raised text-foreground hover:bg-surface-hover",
  danger:
    "bg-transparent text-danger border border-danger/40 hover:bg-danger-soft hover:border-danger",
};

export function PillButton({
  children,
  className = "",
  variant = "solid",
  type = "button",
  ...props
}) {
  return (
    <button
      type={type}
      className={[
        "label-tracked inline-flex items-center justify-center gap-2",
        "rounded-full px-5 py-3 text-sm",
        "transition-colors duration-150 active:scale-[0.98]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        "disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed",
        BUTTON_VARIANTS[variant] || BUTTON_VARIANTS.solid,
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}

// Small uppercase tracked label — "RISK PORTFOLIO", "RECENT CHECKS".
// Used often enough that repeating the class trio everywhere was noise.
export function SectionLabel({ children, className = "", tone = "muted" }) {
  const toneClass = tone === "accent" ? "text-accent" : "text-muted";
  return (
    <p className={`label-tracked text-xs ${toneClass} ${className}`}>{children}</p>
  );
}
