// Lightweight, regex-based code parser. Extracts symbols and edges without
// full AST — good enough for v1 graph signal, safe on Cloudflare Workers.

export type ParsedSymbol = {
  name: string;
  kind: "function" | "class" | "component" | "route" | "export" | "table_ref" | "package";
  start_line?: number | null;
  end_line?: number | null;
  signature?: string | null;
  docstring?: string | null;
};

export type ParsedEdgeExternal = {
  kind: "imports" | "depends_on_package" | "reads_table" | "writes_table" | "defines_route" | "calls";
  dst_external: string; // path (relative import), package name, table name, route path
};

export type ParsedFile = {
  path: string;
  language: string;
  size: number;
  content: string;
  symbols: ParsedSymbol[];
  edges: ParsedEdgeExternal[];
};

const EXT_LANG: Record<string, string> = {
  ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript",
  py: "python", go: "go", rs: "rust", java: "java", kt: "kotlin",
  rb: "ruby", php: "php", css: "css", scss: "scss", json: "json",
  toml: "toml", yml: "yaml", yaml: "yaml", md: "markdown", sql: "sql", sh: "bash",
};

export function detectLanguage(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return EXT_LANG[ext] ?? "text";
}

function lineOf(content: string, index: number): number {
  let n = 1;
  for (let i = 0; i < index && i < content.length; i++) if (content.charCodeAt(i) === 10) n++;
  return n;
}

export function parseFile(path: string, content: string): ParsedFile {
  const language = detectLanguage(path);
  const symbols: ParsedSymbol[] = [];
  const edges: ParsedEdgeExternal[] = [];

  // --- JS / TS / JSX / TSX ---
  if (["typescript", "javascript"].includes(language)) {
    // imports
    const importRe = /import\s+(?:[\s\S]*?)\s+from\s+["']([^"']+)["']/g;
    for (const m of content.matchAll(importRe)) {
      const spec = m[1];
      if (spec.startsWith(".") || spec.startsWith("/") || spec.startsWith("@/")) {
        edges.push({ kind: "imports", dst_external: spec });
      } else {
        const pkg = spec.startsWith("@") ? spec.split("/").slice(0, 2).join("/") : spec.split("/")[0];
        edges.push({ kind: "depends_on_package", dst_external: pkg });
      }
    }
    // require
    for (const m of content.matchAll(/require\(["']([^"']+)["']\)/g)) {
      const spec = m[1];
      if (spec.startsWith(".")) edges.push({ kind: "imports", dst_external: spec });
      else edges.push({ kind: "depends_on_package", dst_external: spec.split("/")[0] });
    }
    // functions & exports & components
    const fnRe = /(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)/g;
    for (const m of content.matchAll(fnRe)) {
      const name = m[1];
      const isComponent = /^[A-Z]/.test(name);
      symbols.push({
        name,
        kind: isComponent ? "component" : "function",
        start_line: lineOf(content, m.index ?? 0),
        signature: `function ${name}(${m[2].slice(0, 120)})`,
      });
    }
    const arrowRe = /export\s+const\s+([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*(?:async\s*)?\(([^)]*)\)\s*=>/g;
    for (const m of content.matchAll(arrowRe)) {
      const name = m[1];
      const isComponent = /^[A-Z]/.test(name);
      symbols.push({
        name,
        kind: isComponent ? "component" : "function",
        start_line: lineOf(content, m.index ?? 0),
        signature: `const ${name} = (${m[2].slice(0, 120)}) =>`,
      });
    }
    const classRe = /(?:export\s+)?class\s+([A-Za-z_$][\w$]*)/g;
    for (const m of content.matchAll(classRe)) {
      symbols.push({ name: m[1], kind: "class", start_line: lineOf(content, m.index ?? 0) });
    }
    // TanStack routes
    const routeRe = /createFileRoute\(\s*["']([^"']+)["']/g;
    for (const m of content.matchAll(routeRe)) {
      edges.push({ kind: "defines_route", dst_external: m[1] });
      symbols.push({ name: m[1], kind: "route", start_line: lineOf(content, m.index ?? 0) });
    }
    // supabase table refs
    const fromRe = /\.from\(\s*["']([A-Za-z_][\w]*)["']\s*\)/g;
    for (const m of content.matchAll(fromRe)) {
      const tbl = m[1];
      const idx = m.index ?? 0;
      // rough heuristic: look at .insert/.update/.delete/.upsert in the next 400 chars
      const after = content.slice(idx, idx + 400);
      const writes = /\.(insert|update|delete|upsert)\s*\(/.test(after);
      edges.push({ kind: writes ? "writes_table" : "reads_table", dst_external: tbl });
      symbols.push({ name: tbl, kind: "table_ref", start_line: lineOf(content, idx) });
    }
  }

  // --- Python ---
  if (language === "python") {
    for (const m of content.matchAll(/^\s*(?:from\s+([\w.]+)\s+import|import\s+([\w.]+))/gm)) {
      const pkg = (m[1] ?? m[2]).split(".")[0];
      edges.push({ kind: "depends_on_package", dst_external: pkg });
    }
    for (const m of content.matchAll(/^\s*def\s+([A-Za-z_][\w]*)\s*\(([^)]*)\)/gm)) {
      symbols.push({
        name: m[1], kind: "function",
        start_line: lineOf(content, m.index ?? 0),
        signature: `def ${m[1]}(${m[2].slice(0, 120)})`,
      });
    }
    for (const m of content.matchAll(/^\s*class\s+([A-Za-z_][\w]*)/gm)) {
      symbols.push({ name: m[1], kind: "class", start_line: lineOf(content, m.index ?? 0) });
    }
  }

  // --- package.json ---
  if (path.endsWith("package.json")) {
    try {
      const j = JSON.parse(content) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
      for (const dep of Object.keys(j.dependencies ?? {})) edges.push({ kind: "depends_on_package", dst_external: dep });
      for (const dep of Object.keys(j.devDependencies ?? {})) edges.push({ kind: "depends_on_package", dst_external: dep });
    } catch { /* ignore */ }
  }

  // dedupe edges
  const seen = new Set<string>();
  const dedup = edges.filter((e) => {
    const k = `${e.kind}|${e.dst_external}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  return {
    path,
    language,
    size: content.length,
    content,
    symbols: symbols.slice(0, 400),
    edges: dedup.slice(0, 400),
  };
}

// Split file into overlapping chunks for embedding.
export function chunkContent(content: string, chunkSize = 1000, overlap = 100): string[] {
  if (content.length <= chunkSize) return [content];
  const chunks: string[] = [];
  let i = 0;
  while (i < content.length) {
    chunks.push(content.slice(i, i + chunkSize));
    i += chunkSize - overlap;
  }
  return chunks.slice(0, 40); // hard cap per file
}
