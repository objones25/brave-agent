import { z } from "zod";

// ── Search Options ────────────────────────────────────────────────────────────

export const SearchOptionsSchema = z.object({
  count: z.number().int().min(1).max(20).optional(),
  offset: z.number().int().min(0).max(9).optional(),
  country: z.string().optional(),
  search_lang: z.string().optional(),
  safesearch: z.enum(["off", "moderate", "strict"]).optional(),
  freshness: z.string().optional(),
  text_decorations: z.boolean().optional(),
  spellcheck: z.boolean().optional(),
  result_filter: z.string().optional(),
  goggles_id: z.string().optional(),
  goggles: z.array(z.string()).optional(),
  units: z.enum(["metric", "imperial"]).optional(),
  extra_snippets: z.boolean().optional(),
  summary: z.boolean().optional(),
  ui_lang: z.string().optional(),
  enable_rich_callback: z.boolean().optional(),
  include_fetch_metadata: z.boolean().optional(),
  operators: z.boolean().optional(),
});

export type SearchOptions = z.infer<typeof SearchOptionsSchema>;

// ── Request Schemas ───────────────────────────────────────────────────────────

export const SearchRequestSchema = z.object({
  query: z.string().min(1).max(400),
  options: SearchOptionsSchema.optional(),
});

export const OptimizedRequestSchema = z.object({
  query: z.string().min(1).max(400),
  options: SearchOptionsSchema.optional(),
});

export const AgenticRequestSchema = z.object({
  query: z.string().min(1).max(400),
});

export const AiRequestSchema = z.object({
  query: z.string().min(1).max(400),
  options: SearchOptionsSchema.optional(),
});

// ── Result Types ──────────────────────────────────────────────────────────────

export interface WebResult {
  title: string;
  url: string;
  description: string;
  source: string;
  extraSnippets?: string[];
  age?: string;
}

export interface NewsResult {
  title: string;
  url: string;
  description: string;
  source: string;
  age?: string;
  isBreaking: boolean;
}

export interface VideoResult {
  title: string;
  url: string;
  description: string;
  source: string;
  duration?: string;
  thumbnail?: string;
}

export interface FaqResult {
  question: string;
  answer: string;
  title: string;
  url: string;
  source: string;
}

export interface DiscussionResult {
  title: string;
  url: string;
  description: string;
  forumName?: string;
  numAnswers: number;
  score?: number;
  question?: string;
  topComment?: string;
}

export interface LocationResult {
  title: string;
  id: string;
  coordinates?: { lat: number; lng: number };
  address?: string;
  categories: string[];
  rating?: number;
  reviewCount?: number;
  distance?: string;
}

export interface InfoboxAttribute {
  label: string;
  value: string;
}

export interface InfoboxResult {
  type: string;
  title: string;
  description: string;
  attributes: InfoboxAttribute[];
  thumbnail?: string;
}

export interface SummaryResult {
  key: string;
}

export interface SearchResult {
  query: string;
  alteredQuery?: string;
  totalResults: number;
  webResults: WebResult[];
  newsResults: NewsResult[];
  videoResults: VideoResult[];
  faqResults: FaqResult[];
  discussionResults: DiscussionResult[];
  locationsResults: LocationResult[];
  infobox: InfoboxResult | null;
  summary: SummaryResult | null;
}

// ── Query Optimization ────────────────────────────────────────────────────────

export const QueryOptimizationSchema = z.object({
  optimizedQuery: z.string().describe("Primary optimized search query"),
  alternativeQueries: z
    .array(z.string())
    .min(1)
    .max(3)
    .describe("2-3 alternative queries covering different angles"),
  searchParams: z.object({
    freshness: z
      .enum(["pd", "pw", "pm", "py"])
      .optional()
      .describe("Time filter if query is time-sensitive"),
    resultFilter: z
      .string()
      .optional()
      .describe(
        "Comma-separated result types: web,news,faq,discussions,videos,locations"
      ),
    country: z
      .string()
      .optional()
      .describe("2-char country code if region-specific"),
  }),
  intent: z
    .enum([
      "informational",
      "navigational",
      "transactional",
      "commercial",
      "local",
    ])
    .describe("Classified search intent"),
});

export type QueryOptimization = z.infer<typeof QueryOptimizationSchema>;

// ── Raw Brave API Response Types (for type narrowing) ─────────────────────────

export interface RawWebResult {
  title?: unknown;
  url?: unknown;
  description?: unknown;
  meta_url?: { hostname?: unknown };
  extra_snippets?: unknown[];
  age?: unknown;
}

export interface RawNewsResult {
  title?: unknown;
  url?: unknown;
  description?: unknown;
  source?: unknown;
  meta_url?: { hostname?: unknown };
  age?: unknown;
  breaking?: unknown;
}

export interface RawVideoResult {
  title?: unknown;
  url?: unknown;
  description?: unknown;
  meta_url?: { hostname?: unknown };
  video?: { duration?: unknown };
  thumbnail?: { src?: unknown };
}

export interface RawFaqResult {
  question?: unknown;
  answer?: unknown;
  title?: unknown;
  url?: unknown;
  meta_url?: { hostname?: unknown };
}

export interface RawDiscussionResult {
  title?: unknown;
  url?: unknown;
  description?: unknown;
  data?: {
    forum_name?: unknown;
    num_answers?: unknown;
    score?: unknown;
    question?: unknown;
    top_comment?: unknown;
  };
}

export interface RawLocationResult {
  title?: unknown;
  id?: unknown;
  coordinates?: { lat?: unknown; lng?: unknown };
  postal_address?: { displayAddress?: unknown };
  categories?: unknown[];
  rating?: { ratingValue?: unknown; reviewCount?: unknown };
  distance?: { value?: unknown; units?: unknown };
}

// ── Cloudflare Rate Limiter ───────────────────────────────────────────────────

export interface RateLimitBinding {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

// ── Env ───────────────────────────────────────────────────────────────────────

export type Env = {
  Bindings: {
    BRAVE_SEARCH_API_KEY: string;
    GEMINI_API_KEY: string;
    RATE_LIMITER: RateLimitBinding;
  };
};
