import { routeAgentRequest } from "agents";
import { BraveSearchAgent } from "./agent/BraveSearchAgent";

// Export the BraveSearchAgent class
export { BraveSearchAgent };

// Export the braveWebSearch and braveSuggest functions for direct API access
export { braveWebSearch } from "./api/braveSearch";
export { braveSuggest } from "./api/suggest";

// Main fetch handler for Cloudflare Workers
export default {
  async fetch(request: Request, env: any) {
    return (
      (await routeAgentRequest(request, env, { cors: true })) ||
      new Response("Not found", { status: 404 })
    );
  },
};
