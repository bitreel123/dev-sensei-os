import { Link } from "@tanstack/react-router";
import { LogoMark } from "./logo";

const cols = [
  {
    title: "Product",
    links: [
      { label: "Overview", href: "/product" },
      { label: "Workflow", href: "/workflow" },
      { label: "Pricing", href: "/pricing" },
      { label: "Download", href: "/download" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Docs", href: "/docs" },
      { label: "Changelog", href: "/docs" },
      { label: "Support", href: "/docs" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/product" },
      { label: "Privacy", href: "/docs" },
      { label: "Terms", href: "/docs" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="bg-black text-white">
      <div className="mx-auto max-w-7xl px-5 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10">
          <div className="col-span-2">
            <div className="flex items-center gap-2">
              <LogoMark className="h-5 w-5 text-white" />
              <span className="text-[15px] font-medium tracking-tight">Jeradin</span>
            </div>
            <p className="mt-3 max-w-xs text-[13px] text-white/55 leading-relaxed">
              The read-only debugging copilot that watches your screen and tells you
              exactly where vibecoded code breaks — and how to fix it.
            </p>
          </div>
          {cols.map((c) => (
            <div key={c.title}>
              <div className="text-[12px] uppercase tracking-wider text-white/40">
                {c.title}
              </div>
              <ul className="mt-3 space-y-2">
                {c.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      to={l.href}
                      className="text-[13px] text-white/70 hover:text-white"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-14 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-white/10 pt-6">
          <div className="text-[12px] text-white/40">
            © {new Date().getFullYear()} Jeradin Labs. All rights reserved.
          </div>
          <div className="text-[12px] text-white/40">
            Built for builders. Read-only. Never touches your code.
          </div>
        </div>
      </div>
    </footer>
  );
}
