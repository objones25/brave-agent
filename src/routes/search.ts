import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { SearchRequestSchema } from "../types";
import { braveSearch } from "../api/brave";
import type { Env } from "../types";

export const searchRoute = new Hono<Env>().post(
  "/",
  zValidator("json", SearchRequestSchema),
  async (c) => {
    const { query, options } = c.req.valid("json");
    const results = await braveSearch(
      query,
      options ?? {},
      c.env.BRAVE_SEARCH_API_KEY
    );
    return c.json({ query, results });
  }
);
