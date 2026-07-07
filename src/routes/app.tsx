import { createFileRoute, Link } from "@tanstack/react-router";
import { LogoMark } from "@/components/jeradin/logo";
import { DashboardMockup } from "@/components/jeradin/dashboard-mockup";
import { Plug, Home, Bug, BookOpen, Settings, Search } from "lucide-react";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "Workspace · Jeradin" },
      { name: "description", content: "Your Jeradin debugging workspace." },
    ],
  }),
  component: AppPage,
});

const nav = [
  { icon: Home, label: "Overview", active: true },
  { icon: Bug, label: "Issues" },
  { icon: Plug, label: "Connectors" },
  { icon: BookOpen, label: "Docs" },
  { icon: Settings, label: "Settings" },
];

function AppPage() {
  return (
    <div className="min-h-screen bg-[#fafafa] text-black flex">
      <aside className="hidden md:flex w-56 border-r border-black/5 bg-white flex-col">
        <div className="h-14 px-4 flex items-center gap-2 border-b border-black/5">
          <LogoMark className="h-4 w-4" />
          <span className="text-[14px] font-medium tracking-tight">Jeradin</span>
        </div>
        <nav className="flex-1 p-2">
          {nav.map((n) => (
            <button
              key={n.label}
              className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-[13px] ${
                n.active ? "bg-black text-white" : "text-black/65 hover:bg-black/[0.04]"
              }`}
            >
              <n.icon className="h-3.5 w-3.5" />
              {n.label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-black/5">
          <div className="rounded-lg bg-black/[0.03] p-3">
            <div className="text-[11px] uppercase tracking-wider text-black/40">
              Beta
            </div>
            <div className="mt-1 text-[12.5px] text-black/70 leading-relaxed">
              You're on the free plan. Unlimited fixes coming with Pro.
            </div>
            <Link to="/pricing" className="mt-2 inline-block text-[12px] text-black underline underline-offset-4">
              See plans
            </Link>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col">
        <header className="h-14 px-5 flex items-center justify-between border-b border-black/5 bg-white">
          <div className="flex items-center gap-2 text-[13px] text-black/55">
            <Search className="h-3.5 w-3.5" />
            <input
              placeholder="Search issues, files, fixes..."
              className="bg-transparent outline-none placeholder:text-black/35"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-black/45 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-black animate-pulse" />
              watching lovable.dev
            </span>
            <div className="h-7 w-7 rounded-full bg-black/10" />
          </div>
        </header>

        <div className="p-6 lg:p-10">
          <div className="text-[11px] uppercase tracking-[0.2em] text-black/40">
            Overview
          </div>
          <h1 className="mt-2 text-[28px] tracking-[-0.02em] font-medium">
            Good evening. Three issues are waiting.
          </h1>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              ["Active issues", "3"],
              ["Resolved today", "12"],
              ["Credits saved", "428"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-black/5 bg-white p-4">
                <div className="text-[11px] uppercase tracking-wider text-black/40">
                  {label}
                </div>
                <div className="mt-1 text-[28px] tracking-[-0.02em] font-medium">
                  {value}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8">
            <DashboardMockup />
          </div>
        </div>
      </main>
    </div>
  );
}
