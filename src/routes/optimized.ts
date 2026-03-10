import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { OptimizedRequestSchema } from "../types";
import { braveSearch } from "../api/brave";
import { optimizeQuery } from "../ai/queryOptimizer";
import { mergeResults } from "../lib/merge";
import type { Env } from "../types";

export const optimizedRoute = new Hono<Env>().post(
  "/",
  zValidator("json", OptimizedRequestSchema),
  async (c) => {
    const { query, options } = c.req.valid("json");

    const optimization = await optimizeQuery(query, c.env.GEMINI_API_KEY);

    const allQueries = [
      optimization.optimizedQuery,
      ...optimization.alternativeQueries,
    ];

    const mergedOptions = {
      ...options,
      ...(optimization.searchParams.freshness !== undefined && {
        freshness: optimization.searchParams.freshness,
      }),
      ...(optimization.searchParams.resultFilter !== undefined && {
        result_filter: optimization.searchParams.resultFilter,
      }),
      ...(optimization.searchParams.country !== undefined && {
        country: optimization.searchParams.country,
      }),
    };

    const searchResults = await Promise.all(
      allQueries.map((q) =>
        braveSearch(q, mergedOptions, c.env.BRAVE_SEARCH_API_KEY)
      )
    );

    const results = mergeResults(searchResults);
    return c.json({ query, optimization, results });
  }
);
