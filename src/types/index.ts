import { z } from "zod";

// State interfaces
export interface BraveSearchState {
  recentSearches: Array<{
    query: string;
    timestamp: number;
  }>;
  conversationHistory: Array<{
    role: "user" | "assistant";
    content: string;
    timestamp: number;
  }>;
  preferences: {
    safesearch: "off" | "moderate" | "strict";
    count: number;
    country: string;
    text_decorations?: boolean;
    spellcheck?: boolean;
    units?: "metric" | "imperial";
    extra_snippets?: boolean;
    summary?: boolean;
    result_filter?: string;
  };
}

// Web Search API Types
export interface SearchOptions {
  count?: number;
  offset?: number;
  country?: string;
  search_lang?: string;
  safesearch?: "off" | "moderate" | "strict";
  freshness?: string;
  text_decorations?: boolean;
  spellcheck?: boolean;
  result_filter?: string;
  goggles_id?: string;
  goggles?: string[] | string;
  units?: "metric" | "imperial";
  extra_snippets?: boolean;
  summary?: boolean;
  ui_lang?: string;
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

export interface InfoboxResult {
  type: string;
  title: string;
  description: string;
  attributes: any[];
  thumbnail?: string;
}

export interface SummaryResult {
  key: string;
}

// Suggest API Types
export interface SuggestOptions {
  country?: string;  // 2-character country code
  lang?: string;     // 2+ character language code
  count?: number;    // Number of suggestions (max 20)
  rich?: boolean;    // Whether to enhance suggestions with rich results
}

export interface SuggestResponse {
  type: 'suggest';
  query: {
    original: string;
  };
  results: SuggestResult[];
}

export interface SuggestResult {
  query: string;
  is_entity: boolean;
  title?: string;
  description?: string;
  img?: string;
}

// Zod Schemas
export const braveSearchSchema = z.object({
  query: z.string().describe("The user's search query term. Should be concise and focused on the key aspects of what you're looking for. Maximum of 400 characters and 50 words."),
  count: z.union([z.string().transform(val => parseInt(val, 10)), z.number()])
    .optional()
    .describe("Number of search results to return (maximum 20, default 10). Use a higher number for broad topics and a lower number for specific queries."),
  offset: z.union([z.string().transform(val => parseInt(val, 10)), z.number()])
    .optional()
    .describe("Results page offset (maximum 9, default 0). Use with count for pagination of results."),
  country: z.string().optional().describe("Two-letter country code to focus search results (e.g., 'US', 'GB', 'DE'). Use when searching for region-specific information."),
  search_lang: z.string().optional().describe("Two or more character language code for search results (e.g., 'en', 'fr', 'de'). Use when searching for content in a specific language."),
  safesearch: z.enum(["off", "moderate", "strict"]).optional().describe("Content filtering level: 'off' (no filtering), 'moderate' (filters explicit images/videos), or 'strict' (all adult content filtered)."),
  freshness: z.string().optional().describe("Filter by content age: 'pd' (past day), 'pw' (past week), 'pm' (past month), 'py' (past year), or date range like '2022-04-01to2022-07-30'."),
  
  // Additional parameters
  text_decorations: z.union([
    z.string().transform(val => val === 'true' ? true : val === 'false' ? false : Boolean(val)),
    z.boolean()
  ]).optional().describe("Whether display strings (e.g. result snippets) should include decoration markers (e.g. highlighting characters). Default is true."),
  spellcheck: z.union([
    z.string().transform(val => val === 'true' ? true : val === 'false' ? false : Boolean(val)),
    z.boolean()
  ]).optional().describe("Whether to spellcheck the provided query. If enabled, the modified query is always used for search. The modified query can be found in the 'altered' key in the response."),
  result_filter: z.string().optional().describe("Comma-delimited string of result types to include (e.g., 'discussions,videos,web'). Available values: discussions, faq, infobox, news, query, summarizer, videos, web, locations."),
  goggles_id: z.string().optional().describe("(Deprecated) Goggle ID for custom re-ranking of search results. Use the goggles parameter instead."),
  goggles: z.union([
    z.string().transform(val => {
      try {
        return JSON.parse(val);
      } catch {
        return val.split(',').filter(Boolean);
      }
    }),
    z.array(z.string())
  ]).optional().describe("Custom re-ranking rules for search results. Can be a URL where the Goggle is hosted or the definition of the Goggle."),
  units: z.union([
    z.string().transform(val => {
      if (val === '') return undefined;
      return val;
    }),
    z.enum(["metric", "imperial"])
  ]).optional().describe("Measurement units to use in results. If not provided, units are derived from the search country."),
  extra_snippets: z.union([
    z.string().transform(val => val === 'true' ? true : val === 'false' ? false : Boolean(val)),
    z.boolean()
  ]).optional().describe("Allows retrieval of up to 5 additional, alternative excerpts from search result pages."),
  summary: z.union([
    z.string().transform(val => val === 'true' ? true : val === 'false' ? false : Boolean(val)),
    z.boolean()
  ]).optional().describe("Enables summary key generation in web search results. Required for the summarizer to be enabled."),
  ui_lang: z.string().optional().describe("User interface language preferred in response, usually in format '<language_code>-<country_code>' (e.g., 'en-US')."),
});

export const braveSuggestSchema = z.object({
  query: z.string().describe("The user's suggest search query term. Maximum of 400 characters and 50 words."),
  country: z.string().optional().describe("Two-letter country code to focus suggestions (e.g., 'US', 'GB', 'DE')."),
  lang: z.string().optional().describe("Two or more character language code for suggestions (e.g., 'en', 'fr', 'de')."),
  count: z.union([z.string().transform(val => parseInt(val, 10)), z.number()])
    .optional()
    .describe("Number of suggestions to return (maximum 20, default 5)."),
  rich: z.union([
    z.string().transform(val => val === 'true' ? true : val === 'false' ? false : Boolean(val)),
    z.boolean()
  ]).optional().describe("Whether to enhance suggestions with rich results.")
});
