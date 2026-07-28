import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_intel_history",
  title: "List my Jeradin intelligence reports",
  description:
    "Return the signed-in user's recent Jeradin intelligence reports (Knowledge, Screen, System, GitHub). Use this to see past analyses.",
  inputSchema: {
    mode: z
      .enum(["knowledge", "screen", "system", "repo"])
      .optional()
      .describe("Filter by intelligence type. Omit to return all."),
    limit: z.number().int().min(1).max(50).optional().describe("Max rows (default 10)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ mode, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("intel_memory")
      .select("id, mode, title, summary, tags, created_at")
      .eq("user_id", ctx.getUserId()!)
      .order("created_at", { ascending: false })
      .limit(limit ?? 10);
    if (mode) q = q.eq("mode", mode);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const rows = data ?? [];
    const text = rows.length
      ? rows
          .map(
            (r, i) =>
              `${i + 1}. [${r.mode}] ${r.title}${r.summary ? ` — ${r.summary}` : ""} (id: ${r.id})`,
          )
          .join("\n")
      : "No reports yet.";
    return {
      content: [{ type: "text", text }],
      structuredContent: { reports: rows },
    };
  },
});
