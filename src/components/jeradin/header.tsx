import { Link } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { LogoLockup } from "./logo";
import { useAuth } from "@/hooks/use-auth";

const nav = [
  { label: "Product", href: "/product" },
  { label: "Workflow", href: "/workflow" },
  { label: "Pricing", href: "/pricing" },
  { label: "Docs", href: "/docs" },
];

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
          <nav className="hidden md:flex items-center gap-7">
            {nav.map((n) => (
              <Link
                key={n.href}
                to={n.href}
                className={`text-[13px] font-medium ${isDark ? "text-white/70 hover:text-white" : "text-black/70 hover:text-black"} transition-colors`}
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={user ? "/account" : "/signup"}
            className={`inline-flex items-center px-3.5 py-1.5 text-[13px] font-medium border transition-all ${
              isDark
                ? "border-white/30 text-white hover:bg-white hover:text-black"
                : "border-black/30 text-black hover:bg-black hover:text-white"
            }`}
          >
            {user ? "Account" : "Create account"}
          </Link>
          <Link
            to="/download"
            className={`hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[13px] font-medium transition-all ${
              isDark
                ? "bg-white text-black hover:bg-white/90"
                : "bg-black text-white hover:bg-black/90"
            }`}
          >
            Download <Download className="h-3.5 w-3.5" />
          </Link>

        </div>
      </div>
    </header>
  );
}
