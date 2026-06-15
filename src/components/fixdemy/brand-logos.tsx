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
}: {
  brand: BrandKey;
  className?: string;
}) {
  const b = BRANDS[brand];
  if (b.slug) {
    return (
      <img
        src={`https://cdn.simpleicons.org/${b.slug}/000000`}
        alt={`${b.name} logo`}
        className={className}
        loading="lazy"
        onError={(e) => {
          // hide broken icon, fallback letter shown by parent
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
      />
    );
  }
  return (
    <span
      className={`${className} inline-flex items-center justify-center rounded-md bg-black text-white font-semibold`}
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
