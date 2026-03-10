import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { AiRequestSchema } from "../types";
import { braveSearch } from "../api/brave";
import { geminiGenerate } from "../ai/client";
import { AI_SEARCH_SYSTEM_PROMPT } from "../ai/prompts";
import type { Env } from "../types";

const MODEL = "gemini-3.1-flash-lite-preview";

export const aiRoute = new Hono<Env>().post(
  "/",
  zValidator("json", AiRequestSchema),
  async (c) => {
    const { query, options } = c.req.valid("json");

    const results = await braveSearch(
      query,
      options ?? {},
      c.env.BRAVE_SEARCH_API_KEY
    );

    const context = JSON.stringify(results);

    const response = await geminiGenerate(
      MODEL,
      {
        systemInstruction: { parts: [{ text: AI_SEARCH_SYSTEM_PROMPT }] },
        contents: [
          {
            role: "user",
            parts: [{ text: `Query: ${query}\n\nSearch Results:\n${context}` }],
          },
        ],
      },
      c.env.GEMINI_API_KEY
    );

    const candidate = response.candidates[0];
    if (!candidate) {
      return c.json({ error: "No response from model" }, 502);
    }

    const textPart = candidate.content.parts.find(
      (p) => typeof p.text === "string" && !p.thought
    );

    if (!textPart?.text) {
      return c.json({ error: "No text in model response" }, 502);
    }

    return c.json({ query, answer: textPart.text });
  }
);
