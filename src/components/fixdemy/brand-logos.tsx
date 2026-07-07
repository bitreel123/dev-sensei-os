/**
 * Real brand marks for the tools Fixdemy connects to.
 * Sourced via simpleicons CDN (monochrome, currentColor-friendly).
 * Fallbacks to a clean letter mark if a brand is unavailable.
 */

type Brand = {
  name: string;
  slug?: string; // simpleicons slug
  letter?: string; // fallback letter mark
  domain?: string; // optional clearbit fallback
};

const BRANDS: Record<string, Brand> = {
  lovable: { name: "Lovable", letter: "L", domain: "lovable.dev" },
  cursor: { name: "Cursor", slug: "cursor", letter: "C", domain: "cursor.com" },
  replit: { name: "Replit", slug: "replit", letter: "R", domain: "replit.com" },
  gemini: { name: "Gemini", slug: "googlegemini", letter: "G" },
  windsurf: { name: "Windsurf", letter: "W", domain: "windsurf.com" },
  v0: { name: "v0", slug: "vercel", letter: "▲", domain: "v0.dev" },
  vscode: { name: "VS Code", slug: "visualstudiocode", letter: "V" },
  bolt: { name: "Bolt", letter: "⚡", domain: "bolt.new" },
  zed: { name: "Zed", slug: "zedindustries", letter: "Z" },
  jetbrains: { name: "JetBrains", slug: "jetbrains", letter: "J" },
  github: { name: "GitHub", slug: "github", letter: "G" },
  claude: { name: "Claude", slug: "anthropic", letter: "C" },
};

export type BrandKey = keyof typeof BRANDS;

export function BrandLogo({
  brand,
  className = "h-6 w-6",
  variant = "dark",
}: {
  brand: BrandKey;
  className?: string;
  variant?: "dark" | "light";
}) {
  const b = BRANDS[brand];
  const hex = variant === "light" ? "ffffff" : "000000";
  if (b.slug) {
    return (
      <img
        src={`https://cdn.simpleicons.org/${b.slug}/${hex}`}
        alt={`${b.name} logo`}
        className={className}
        loading="lazy"
        style={variant === "light" ? { filter: "brightness(0) invert(1)" } : undefined}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
      />
    );
  }
  const letterClasses =
    variant === "light"
      ? "bg-white/10 text-white border border-white/20"
      : "bg-black text-white";
  return (
    <span
      className={`${className} inline-flex items-center justify-center rounded-md font-semibold ${letterClasses}`}
      aria-label={b.name}
    >
      {b.letter ?? b.name[0]}
    </span>
  );
}


export function BrandName(key: BrandKey) {
  return BRANDS[key].name;
}

export const ALL_BRANDS: BrandKey[] = [
  "lovable",
  "cursor",
  "replit",
  "gemini",
  "windsurf",
  "v0",
  "vscode",
  "bolt",
  "zed",
];
