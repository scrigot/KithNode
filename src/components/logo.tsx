// KithNode "Warm Path" logo.
//
// Mark: two nodes (you, target) connected by an arc with an intermediary dot
// on the path. Tells the whole product story in one glance.
//
// Left node uses `currentColor` so it inherits from text color — works on both
// light and dark surfaces without a variant prop. Right node + arc + dot are
// always teal (#0EA5E9) because that's the single-accent design system rule.

type IconProps = {
  className?: string;
  /** Aria label. Defaults to "KithNode". */
  title?: string;
};

export function LogoIcon({ className, title = "KithNode" }: IconProps) {
  return (
    <svg
      viewBox="0 0 40 40"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      {/* Warm path arc */}
      <path
        d="M 10 28 Q 20 6 30 28"
        fill="none"
        stroke="#0EA5E9"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Intermediary "via" dot at arc peak */}
      <circle cx="20" cy="13" r="2.5" fill="#0EA5E9" />
      {/* Left node — you (inherits text color) */}
      <circle cx="10" cy="28" r="5" fill="currentColor" />
      {/* Right node — target (teal) */}
      <circle cx="30" cy="28" r="5" fill="#0EA5E9" />
    </svg>
  );
}

type WordmarkProps = {
  className?: string;
  /** Icon size (CSS height). Width auto-scales via viewBox. Default 1.75rem. */
  iconClassName?: string;
  /** Text size Tailwind utility. Default text-lg. */
  textClassName?: string;
};

export function LogoWordmark({
  className,
  iconClassName = "h-7 w-7",
  textClassName = "text-lg",
}: WordmarkProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <LogoIcon className={iconClassName} />
      <span
        className={`font-heading font-bold tracking-tight leading-none ${textClassName}`}
      >
        Kith<span className="text-[#0EA5E9]">Node</span>
      </span>
    </span>
  );
}
