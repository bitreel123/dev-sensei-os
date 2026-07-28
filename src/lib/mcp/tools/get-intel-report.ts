import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_intel_report",
  title: "Get a Jeradin intelligence report",
  description:
    "Return the full payload of one Jeradin intelligence report by id (from list_intel_history). Includes the full analysis, fix plan, or knowledge sections.",
  inputSchema: {
    id: z.string().uuid().describe("The report id from list_intel_history."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("intel_memory")
      .select("id, mode, title, summary, tags, payload, created_at")
      .eq("id", id)
      .eq("user_id", ctx.getUserId()!)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: "Report not found." }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2).slice(0, 20_000) }],
      structuredContent: { report: data },
    };
  },
});
