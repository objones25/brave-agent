import { geminiGenerate } from "./client";
import { QUERY_OPTIMIZER_PROMPT } from "./prompts";
import { QueryOptimizationSchema, type QueryOptimization } from "../types";

const MODEL = "gemini-3.1-flash-lite-preview";

// Hand-written JSON Schema matching QueryOptimizationSchema
const RESPONSE_JSON_SCHEMA = {
  type: "object",
  properties: {
    optimizedQuery: {
      type: "string",
    },
    alternativeQueries: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
      maxItems: 3,
    },
    searchParams: {
      type: "object",
      properties: {
        freshness: {
          type: "string",
          enum: ["pd", "pw", "pm", "py"],
        },
        resultFilter: {
          type: "string",
        },
        country: {
          type: "string",
        },
      },
    },
    intent: {
      type: "string",
      enum: [
        "informational",
        "navigational",
        "transactional",
        "commercial",
        "local",
      ],
    },
  },
  required: ["optimizedQuery", "alternativeQueries", "searchParams", "intent"],
};

export async function optimizeQuery(
  query: string,
  apiKey: string
): Promise<QueryOptimization> {
  const response = await geminiGenerate(
    MODEL,
    {
      systemInstruction: { parts: [{ text: QUERY_OPTIMIZER_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: query }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseJsonSchema: RESPONSE_JSON_SCHEMA,
      },
    },
    apiKey
  );

  const candidate = response.candidates[0];
  if (!candidate) throw new Error("No candidates returned from Gemini");

  const part = candidate.content.parts.find(
    (p): p is { text: string } => typeof p.text === "string" && !p.thought
  );
  if (!part) throw new Error("No text part in Gemini response");

  let parsed: unknown;
  try {
    parsed = JSON.parse(part.text);
  } catch {
    throw new Error(`Failed to parse optimization JSON: ${part.text}`);
  }

  const result = QueryOptimizationSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Invalid optimization response: ${result.error.message}`);
  }

  return result.data;
}
