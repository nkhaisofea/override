export function Card({ children, className = "", raised = false, ...props }) {
  return (
    <div
      className={`rounded-3xl border border-border p-5 ${className}`}
      style={{ background: raised ? "var(--surface-raised)" : "var(--surface)" }}
      {...props}
    >
      {children}
    </div>
  );
}

export function PillButton({ children, className = "", variant = "solid", ...props }) {
  const base = "label-tracked rounded-full px-5 py-3 text-sm transition active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100";
  const styles =
    variant === "solid"
      ? { background: "var(--accent)", color: "#04140d" }
      : variant === "outline"
      ? { background: "transparent", color: "var(--foreground)", border: "1px solid var(--border)" }
      : { background: "var(--surface-raised)", color: "var(--foreground)" };
  return (
    <button className={`${base} ${className}`} style={styles} {...props}>
      {children}
    </button>
  );
}
