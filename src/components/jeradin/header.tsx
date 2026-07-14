import { Link } from "@tanstack/react-router";
import { LogoLockup } from "./logo";
import { useAuth } from "@/hooks/use-auth";

export function SiteHeader({ variant = "light" }: { variant?: "light" | "dark" }) {
  const isDark = variant === "dark";
  const { user } = useAuth();
  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 border-b ${
        isDark
          ? "bg-black/70 border-white/10 text-white"
          : "bg-white/70 border-black/5 text-black"
      } backdrop-blur-xl`}
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-5">
        <div className="flex items-center gap-10">
          <LogoLockup />
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={user ? "/chat" : "/signup"}
            className={`inline-flex items-center px-3.5 py-1.5 text-[13px] font-medium border transition-all ${
              isDark
                ? "border-white/30 text-white hover:bg-white hover:text-black"
                : "border-black/30 text-black hover:bg-black hover:text-white"
            }`}
          >
            {user ? "Open app" : "Create account"}
          </Link>
        </div>
      </div>
    </header>
  );
}

