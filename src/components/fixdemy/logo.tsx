import { Link } from "@tanstack/react-router";

/**
 * Jeradin mark — a stylized "J" with a hooked base and an orbiting dot,
 * suggesting a system loop closing on a decision point.
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
        d="M15 3 V15 A5 5 0 0 1 5 15"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M10 3 H19"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle cx="19" cy="6" r="1.8" fill="currentColor" />
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

/** Centered wordmark used above the hero headline. */
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
