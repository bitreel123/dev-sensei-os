import { Link } from "@tanstack/react-router";

/**
 * Jeradin mark — a stylized "F" formed by a bracket and a fix-line.
 * Mono, scales with currentColor, sits flush with text.
 */
export function LogoMark({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M4 3.5 H20"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M4 3.5 V20.5"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M4 12 H14"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle cx="19" cy="12" r="2.2" fill="currentColor" />
    </svg>
  );
}

export function LogoLockup({
  href = "/",
  className = "",
}: {
  href?: string;
  className?: string;
}) {
  return (
    <Link to={href} className={`flex items-center gap-2 ${className}`}>
      <LogoMark className="h-[18px] w-[18px] text-current" />
      <span className="text-[15px] font-semibold tracking-tight">Jeradin</span>
    </Link>
  );
}

/** Centered wordmark used above the hero headline (antigravity style). */
export function LogoWordmark({ className = "" }: { className?: string }) {
  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <LogoMark className="h-[15px] w-[15px]" />
      <span className="text-[13px] font-semibold tracking-tight text-black">
        Jeradin
      </span>
    </div>
  );
}
