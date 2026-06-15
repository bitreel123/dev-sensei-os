import { motion } from "motion/react";
import { AlertCircle, Check, Circle, FileCode2, Sparkles } from "lucide-react";
import { LogoMark } from "./logo";

export function DashboardMockup() {
  return (
    <div className="relative mx-auto w-full max-w-5xl rounded-2xl border border-black/10 bg-white shadow-[0_40px_120px_-30px_rgba(0,0,0,0.25)] overflow-hidden">
      {/* Window chrome */}
      <div className="flex items-center justify-between px-4 h-9 border-b border-black/5 bg-[#fafafa]">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-black/10" />
          <span className="h-2.5 w-2.5 rounded-full bg-black/10" />
          <span className="h-2.5 w-2.5 rounded-full bg-black/10" />
        </div>
        <div className="text-[11px] text-black/50 font-mono flex items-center gap-1.5">
          <LogoMark className="h-3 w-3 text-black" />
          fixdemy — watching lovable.dev
        </div>
        <div className="text-[11px] text-black/50 font-mono flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-black animate-pulse" />
          live
        </div>
      </div>

      <div className="grid grid-cols-12">
        {/* Sidebar: detected issues */}
        <div className="col-span-4 border-r border-black/5 p-4 bg-white">
          <div className="text-[10px] uppercase tracking-wider text-black/40">
            Detected · 3 issues
          </div>
          <div className="mt-3 space-y-2">
            <MockIssue
              active
              icon={<AlertCircle className="h-3.5 w-3.5" />}
              file="App.tsx"
              line="42"
              title="Undefined state on render"
              tag="critical"
            />
            <MockIssue
              icon={<AlertCircle className="h-3.5 w-3.5" />}
              file="api/auth.ts"
              line="18"
              title="Missing await on fetch"
              tag="warn"
            />
            <MockIssue
              icon={<Circle className="h-3.5 w-3.5" />}
              file="ui/Modal.tsx"
              line="71"
              title="Hydration mismatch hint"
              tag="info"
            />
          </div>

          <div className="mt-6 text-[10px] uppercase tracking-wider text-black/40">
            Resolved · today
          </div>
          <div className="mt-3 space-y-1.5">
            {["Stale closure in useEffect", "Missing dep in array"].map((t) => (
              <div
                key={t}
                className="flex items-center gap-2 text-[12px] text-black/50"
              >
                <Check className="h-3 w-3" />
                {t}
              </div>
            ))}
          </div>
        </div>

        {/* Main panel: explanation */}
        <div className="col-span-8 p-5">
          <div className="flex items-center gap-2 text-[11px] text-black/50 font-mono">
            <FileCode2 className="h-3.5 w-3.5" />
            App.tsx · line 42
          </div>
          <h3 className="mt-1.5 text-[15px] font-medium tracking-tight">
            <span className="text-black">user</span> is undefined when{" "}
            <span className="text-black">profile.name</span> renders
          </h3>

          <div className="mt-4 rounded-lg border border-black/10 bg-[#fafafa] overflow-hidden">
            <div className="px-3 py-1.5 border-b border-black/5 text-[10px] font-mono text-black/40 flex items-center justify-between">
              <span>App.tsx</span>
              <span>read-only · fixdemy will not write</span>
            </div>
            <pre className="px-3 py-2.5 text-[12px] font-mono leading-relaxed text-black/80 overflow-x-auto">
{`  const { data: user } = useUser()
- return <h1>Hello, {user.profile.name}</h1>
+ return <h1>Hello, {user?.profile?.name ?? "there"}</h1>`}
            </pre>
          </div>

          <div className="mt-4 rounded-lg bg-black text-white p-3.5">
            <div className="flex items-center gap-1.5 text-[11px] text-white/60">
              <Sparkles className="h-3 w-3" />
              Semantic explanation
            </div>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-white/85">
              <span className="text-white">useUser()</span> resolves asynchronously, so
              on the first render <span className="text-white">user</span> is{" "}
              <span className="text-white">undefined</span>. Reading{" "}
              <span className="text-white">.profile.name</span> throws before the
              fetch completes. Add optional chaining or guard with a loading state.
            </p>
            <div className="mt-3 flex gap-2">
              <button className="rounded-md bg-white text-black text-[11px] font-medium px-2.5 py-1">
                Copy fix
              </button>
              <button className="rounded-md border border-white/20 text-white/70 text-[11px] px-2.5 py-1">
                Open in Cursor
              </button>
              <button className="rounded-md border border-white/20 text-white/70 text-[11px] px-2.5 py-1">
                Send to Lovable
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Scan beam */}
      <motion.div
        className="pointer-events-none absolute left-0 right-0 h-px bg-black/15"
        initial={{ top: "10%" }}
        animate={{ top: ["10%", "95%", "10%"] }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}

function MockIssue({
  icon,
  file,
  line,
  title,
  tag,
  active,
}: {
  icon: React.ReactNode;
  file: string;
  line: string;
  title: string;
  tag: "critical" | "warn" | "info";
  active?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-2.5 ${
        active ? "border-black bg-black text-white" : "border-black/10 bg-white"
      }`}
    >
      <div className="flex items-center justify-between">
        <div
          className={`flex items-center gap-1.5 text-[10px] font-mono ${
            active ? "text-white/60" : "text-black/40"
          }`}
        >
          {icon}
          {file}:{line}
        </div>
        <span
          className={`text-[9px] uppercase tracking-wider ${
            active
              ? "text-white/70"
              : tag === "critical"
              ? "text-black"
              : "text-black/40"
          }`}
        >
          {tag}
        </span>
      </div>
      <div
        className={`mt-1 text-[12px] ${
          active ? "text-white" : "text-black/80"
        }`}
      >
        {title}
      </div>
    </div>
  );
}
