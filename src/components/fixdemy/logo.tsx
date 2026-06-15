import { Link } from "@tanstack/react-router";

export function LogoMark({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M5 6 L15 20 L25 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect
        x="12.5"
        y="18.5"
        width="5"
        height="5"
        transform="rotate(45 15 21)"
        fill="currentColor"
      />
      <circle cx="15" cy="27" r="2.6" fill="currentColor" />
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
      <LogoMark className="h-5 w-5 text-foreground" />
      <span className="text-[15px] font-medium tracking-tight text-foreground">
        Fixdemy
      </span>
    </Link>
  );
}
