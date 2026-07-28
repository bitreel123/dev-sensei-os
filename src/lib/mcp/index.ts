import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getProfile from "./tools/get-profile";
import listNotifications from "./tools/list-notifications";
import getActiveRepo from "./tools/get-active-repo";
import setActiveRepo from "./tools/set-active-repo";
import listIntelHistory from "./tools/list-intel-history";
import getIntelReport from "./tools/get-intel-report";
import runKnowledgeIntel from "./tools/run-knowledge-intel";

// The OAuth issuer must be the direct Supabase host, not the .lovable.cloud proxy.
// VITE_SUPABASE_PROJECT_ID is inlined by Vite at build time.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "jeradin-mcp",
  title: "Jeradin",
  version: "0.3.0",
  instructions:
    "Jeradin workspace tools. Use `run_knowledge_intel` to ask Jeradin research/startup/API/architecture questions (5 credits). Use `list_intel_history` and `get_intel_report` to read past Screen, System, GitHub, and Knowledge Intelligence reports. Also: profile, notifications, and the active GitHub repo used for grounding. All tools act as the signed-in Jeradin user.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    getProfile,
    listNotifications,
    getActiveRepo,
    setActiveRepo,
    listIntelHistory,
    getIntelReport,
    runKnowledgeIntel,
  ],
});
