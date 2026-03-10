import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { AgenticRequestSchema } from "../types";
import { braveSearch } from "../api/brave";
import {
  geminiGenerate,
  type GeminiContent,
  type GeminiPart,
  type GeminiResponsePart,
} from "../ai/client";
import { AGENTIC_SEARCH_PROMPT } from "../ai/prompts";
import type { Env } from "../types";

const MODEL = "gemini-3.1-flash-lite-preview";
const MAX_STEPS = 5;

const BRAVE_SEARCH_TOOL = {
  functionDeclarations: [
    {
      name: "braveSearch",
      description:
        "Search the web using Brave Search. Use targeted, specific queries for best results.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query (be specific and concise)",
          },
          count: {
            type: "number",
            description: "Number of results to return (1-20, default 10)",
          },
          freshness: {
            type: "string",
            description:
              "Time filter: pd (past day), pw (past week), pm (past month), py (past year)",
          },
          result_filter: {
            type: "string",
            description:
              "Comma-separated result types: web, news, faq, discussions, videos",
          },
        },
        required: ["query"],
      },
    },
  ],
};

function responsePartToGeminiPart(p: GeminiResponsePart): GeminiPart {
  if (p.functionCall !== undefined) {
    return {
      functionCall: p.functionCall,
      ...(p.thoughtSignature !== undefined && { thoughtSignature: p.thoughtSignature }),
    };
  }
  return {
    text: p.text ?? "",
    thought: p.thought,
    ...(p.thoughtSignature !== undefined && { thoughtSignature: p.thoughtSignature }),
  };
}

export const agenticRoute = new Hono<Env>().post(
  "/",
  zValidator("json", AgenticRequestSchema),
  async (c) => {
    const { query } = c.req.valid("json");

    const contents: GeminiContent[] = [
      { role: "user", parts: [{ text: query }] },
    ];

    for (let step = 0; step < MAX_STEPS; step++) {
      const response = await geminiGenerate(
        MODEL,
        {
          systemInstruction: { parts: [{ text: AGENTIC_SEARCH_PROMPT }] },
          contents,
          tools: [BRAVE_SEARCH_TOOL],
        },
        c.env.GEMINI_API_KEY
      );

      const candidate = response.candidates[0];
      if (!candidate) {
        return c.json({ error: "No response from model" }, 502);
      }

      // Include all model parts (including thought parts) verbatim in next turn
      const modelParts = candidate.content.parts.map(responsePartToGeminiPart);
      contents.push({ role: "model", parts: modelParts });

      const funcCallPart = candidate.content.parts.find(
        (p): p is GeminiResponsePart & {
          functionCall: { name: string; args: Record<string, unknown> };
        } => p.functionCall !== undefined
      );

      if (!funcCallPart) {
        // No tool call — return the final text answer
        const textPart = candidate.content.parts.find(
          (p) => typeof p.text === "string" && !p.thought
        );
        const answer = textPart?.text ?? "";
        return c.json({ query, answer });
      }

      // Execute the function call
      const { name, args } = funcCallPart.functionCall;

      if (name === "braveSearch") {
        const searchQuery =
          typeof args["query"] === "string" ? args["query"] : query;
        const searchResult = await braveSearch(
          searchQuery,
          {
            count:
              typeof args["count"] === "number" ? args["count"] : undefined,
            freshness:
              typeof args["freshness"] === "string"
                ? args["freshness"]
                : undefined,
            result_filter:
              typeof args["result_filter"] === "string"
                ? args["result_filter"]
                : undefined,
          },
          c.env.BRAVE_SEARCH_API_KEY
        );

        contents.push({
          role: "user",
          parts: [
            {
              functionResponse: {
                name,
                response: searchResult as unknown as Record<string, unknown>,
              },
            },
          ],
        });
      }
    }

    return c.json({ query, answer: "Search could not be completed" }, 500);
  }
);
