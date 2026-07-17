import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getProfile from "./tools/get-profile";
import listNotifications from "./tools/list-notifications";
import getActiveRepo from "./tools/get-active-repo";
import setActiveRepo from "./tools/set-active-repo";

// The OAuth issuer must be the direct Supabase host, not the .lovable.cloud proxy.
// VITE_SUPABASE_PROJECT_ID is inlined by Vite at build time.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "jeradin-mcp",
  title: "Jeradin",
  version: "0.1.0",
  instructions:
    "Tools for your Jeradin workspace. Read your profile and notifications, and view or change the GitHub repo Jeradin uses to ground its screen analysis. All tools act as the signed-in Jeradin user.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getProfile, listNotifications, getActiveRepo, setActiveRepo],
});
