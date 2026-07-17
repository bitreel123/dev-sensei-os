import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "set_active_repo",
  title: "Set my active project repo",
  description:
    "Set the GitHub repo (owner/name) that Jeradin uses when analyzing screens. Pass null to clear it. Requires an existing GitHub connection.",
  inputSchema: {
    repo: z
      .string()
      .regex(/^[^/\s]+\/[^/\s]+$/, "Must be 'owner/name'")
      .nullable()
      .describe("GitHub repo like 'octocat/hello-world', or null to clear."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ repo }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { error } = await supabase
      .from("github_connections")
      .update({ active_repo: repo })
      .eq("user_id", ctx.getUserId());
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: repo ? `Active repo set to ${repo}` : "Active repo cleared" }],
      structuredContent: { active_repo: repo },
    };
  },
});
