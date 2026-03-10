const GEMINI_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/models";

// ── Part Types ────────────────────────────────────────────────────────────────

export interface GeminiTextPart {
  text: string;
  thought?: boolean;
  thoughtSignature?: string;
}

export interface GeminiFunctionCallPart {
  functionCall: {
    name: string;
    args: Record<string, unknown>;
  };
  thoughtSignature?: string;
}

export interface GeminiFunctionResponsePart {
  functionResponse: {
    name: string;
    response: Record<string, unknown>;
  };
}

export type GeminiPart =
  | GeminiTextPart
  | GeminiFunctionCallPart
  | GeminiFunctionResponsePart;

// ── Content / Tool Types ──────────────────────────────────────────────────────

export type GeminiRole = "user" | "model";

export interface GeminiContent {
  role: GeminiRole;
  parts: GeminiPart[];
}

export interface FunctionDeclaration {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface GeminiTool {
  functionDeclarations: FunctionDeclaration[];
}

// ── Request / Response Types ──────────────────────────────────────────────────

export interface GeminiRequest {
  contents: GeminiContent[];
  systemInstruction?: { parts: [{ text: string }] };
  tools?: GeminiTool[];
  generationConfig?: {
    responseMimeType?: string;
    responseJsonSchema?: unknown;
  };
}

export interface GeminiResponsePart {
  text?: string;
  thought?: boolean;
  thoughtSignature?: string;
  functionCall?: {
    name: string;
    args: Record<string, unknown>;
  };
}

export interface GeminiResponse {
  candidates: Array<{
    content: {
      role: string;
      parts: GeminiResponsePart[];
    };
    finishReason?: string;
  }>;
}

// ── Client ────────────────────────────────────────────────────────────────────

export async function geminiGenerate(
  model: string,
  request: GeminiRequest,
  apiKey: string
): Promise<GeminiResponse> {
  const url = `${GEMINI_BASE_URL}/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${error}`);
  }

  return response.json() as Promise<GeminiResponse>;
}
