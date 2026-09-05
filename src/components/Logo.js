import Link from "next/link";

export function ShieldMark({ className = "size-7" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 2L4 5v6c0 5 3.4 8.7 8 9.9 4.6-1.2 8-4.9 8-9.9V5l-8-3z"
        className="fill-accent/15 stroke-accent"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 12.2l2.4 2.4 4.6-5"
        className="stroke-accent"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Wordmark({ className = "" }) {
  return (
    <span className={`label-tracked text-lg tracking-[0.14em] text-foreground ${className}`}>
      VITAURA
    </span>
  );
}

/**
 * The lockup. `href` makes it a link home — used on every page except the
 * homepage itself, where linking to the current page is just noise.
 */
export function Logo({ className = "", href = null, markClassName }) {
  const inner = (
    <>
      <ShieldMark className={markClassName || "size-7 sm:size-8"} />
      <Wordmark className="sm:text-xl" />
    </>
  );

  const classes = `inline-flex items-center gap-2 ${className}`;

  if (href) {
    return (
      <Link
        href={href}
        className={`${classes} rounded-lg transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent`}
      >
        {inner}
      </Link>
    );
  }

  return <div className={classes}>{inner}</div>;
}

/**
 * The "live" pulse in the header. Purely decorative, so it's hidden from
 * assistive tech and stilled for prefers-reduced-motion (see globals.css).
 */
export function LivePulse({ className = "" }) {
  return (
    <span className={`relative flex size-2.5 ${className}`} aria-hidden="true">
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-60" />
      <span className="relative inline-flex size-2.5 rounded-full bg-accent" />
    </span>
  );
}
