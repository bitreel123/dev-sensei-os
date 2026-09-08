import { Link } from "@tanstack/react-router";
import logoAsset from "@/assets/jeradin-logo.png.asset.json";

export function LogoMark({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <img
      src={logoAsset.url}
      alt=""
      className={className}
      aria-hidden="true"
    />
  );
}

export function LogoLockup({
  href = "/",
  className = "",
  variant = "dark",
}: {
  href?: string;
  className?: string;
  variant?: "dark" | "light";
}) {
  return (
    <Link to={href} className={`flex items-center gap-2 ${className}`}>
      <LogoMark className={`h-[20px] w-[20px] object-contain ${variant === "light" ? "invert" : ""}`} />
      <span className="text-[15px] font-semibold tracking-tight">Jeradin</span>
    </Link>
  );
}

/** Centered wordmark used above the hero headline. */
export function LogoWordmark({ className = "" }: { className?: string }) {
  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <LogoMark className="h-[17px] w-[17px] object-contain invert" />
      <span className="text-[13px] font-semibold tracking-tight">
        Jeradin
      </span>
    </div>
  );
}
