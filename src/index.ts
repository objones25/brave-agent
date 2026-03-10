import { Hono } from "hono";
import { cors } from "hono/cors";
import { searchRoute } from "./routes/search";
import { optimizedRoute } from "./routes/optimized";
import { agenticRoute } from "./routes/agentic";
import { aiRoute } from "./routes/ai";
import type { Env } from "./types";

const app = new Hono<Env>();

app.use("*", cors());

// Rate limiting middleware
app.use("*", async (c, next) => {
  const ip = c.req.header("CF-Connecting-IP") ?? "unknown";
  const { success } = await c.env.RATE_LIMITER.limit({ key: ip });
  if (!success) return c.json({ error: "Rate limit exceeded" }, 429);
  await next();
});

app.route("/search", searchRoute);
app.route("/optimized", optimizedRoute);
app.route("/agentic", agenticRoute);
app.route("/ai", aiRoute);

app.notFound((c) => c.json({ error: "Not found" }, 404));

export default app;
