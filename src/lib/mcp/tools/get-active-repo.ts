import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_active_repo",
  title: "Get my active project repo",
  description: "Return the GitHub repo (owner/name) currently linked to the user's Jeradin workspace, if any.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("github_connections")
      .select("active_repo, login")
      .eq("user_id", ctx.getUserId()!)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const active = data?.active_repo ?? null;
    return {
      content: [
        {
          type: "text",
          text: active
            ? `Active repo: ${active} (GitHub login: ${data?.login ?? "unknown"})`
            : "No active repo set.",
        },
      ],
      structuredContent: { active_repo: active, connected: !!data },
    };
  },
});
