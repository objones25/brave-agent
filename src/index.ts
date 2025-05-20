import { Agent, type AgentContext, type Connection, type WSMessage} from "agents";
import { generateText, tool } from "ai";
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { routeAgentRequest } from "agents";
import { z } from "zod";

// Define the state interface for the agent
interface BraveSearchState {
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

// Initial state with default values
const INITIAL_STATE: BraveSearchState = {
  recentSearches: [],
  conversationHistory: [],
  preferences: {
    safesearch: "moderate",
    count: 10,
    country: "US",
    text_decorations: true,
    spellcheck: true,
    units: "metric",
    extra_snippets: true,
    summary: true
  }
};

const MAX_RECENT_SEARCHES = 10;
const MAX_CONVERSATION_HISTORY = 20;

export class BraveSearchAgent extends Agent<{
  BRAVE_SEARCH_API_KEY: string;
  GEMINI_API_KEY: string;
}, BraveSearchState> {
  // Initialize state
  initialState: BraveSearchState = INITIAL_STATE;

  // Brave Search tool schema with detailed descriptions
  braveSearchSchema = z.object({
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

  // System prompt with detailed instructions
  systemPrompt = `
    You are BraveSearchAgent, an advanced search assistant powered by Brave Search.
    
    Your core purpose is to help users find accurate, up-to-date information while respecting their privacy. You have access to Brave Search, which provides high-quality search results without tracking users.
    
    SEARCH CAPABILITIES:
    - You can search the web using the braveSearch tool.
    - You can customize searches with parameters like result count, language, country, and content filtering.
    - You can search for various content types including web pages, news, videos, and more.
    
    GUIDELINES FOR SEARCHING:
    1. For factual questions, current events, or information that might be on the web, use the search tool.
    2. Formulate concise search queries focused on the essential aspects of the user's question.
    3. Use search parameters strategically:
       - Increase 'count' for broad topics where more results might be helpful.
       - Use 'freshness' for time-sensitive information.
       - Use 'result_filter' to focus on specific types of content when appropriate.
    4. For complex questions, perform multiple searches with different queries to gather comprehensive information.
    5. If initial results aren't helpful, refine your search with alternative terms or parameters.
    
    RESPONSE GUIDELINES:
    1. Always synthesize search results into a coherent, direct answer - don't just list results.
    2. Cite sources by mentioning the website names when providing information from search results.
    3. Be factual and objective in presenting information.
    4. Present nuanced views when appropriate, especially for topics with multiple perspectives.
    5. If search results are inconclusive or contradictory, acknowledge this honestly.
    6. Format your response for readability, using bullet points or sections for complex information.
    
    EXAMPLES OF GOOD SEARCH QUERIES:
    - "latest climate change reports" (for recent information on climate change)
    - "how to grow tomatoes container garden" (for specific how-to information)
    - "python dictionary syntax examples" (for programming help)
    - "toronto restaurants italian downtown" (for local recommendations)
    
    Remember: Your goal is to be helpful, accurate, and respectful of privacy. Always strive to provide the most relevant information to answer the user's question.
  `;

  constructor(ctx: AgentContext, env: { BRAVE_SEARCH_API_KEY: string; GEMINI_API_KEY: string }) {
    super(ctx, env);
  }

  // Handle WebSocket messages for real-time interaction
  override async onMessage(connection: Connection, message: WSMessage): Promise<void> {
    try {
      if (typeof message !== "string") {
        return await super.onMessage(connection, message);
      }

      const data = JSON.parse(message) as any;
      
      // Handle search requests via WebSocket
      if (data.type === "search_request") {
        const { query, preferences } = data;
        
        // Update preferences if provided
        if (preferences) {
          const state = this.state ?? INITIAL_STATE;
          this.setState({
            ...state,
            preferences: {
              ...state.preferences,
              ...preferences
            }
          });
        }
        
        // Process the search
        const response = await this.search(query);
        
        // Send the response back through the WebSocket
        connection.send(JSON.stringify({
          type: "search_response",
          query,
          response
        }));
        
        return;
      }
      
      // Handle preference updates
      if (data.type === "update_preferences") {
        const state = this.state ?? INITIAL_STATE;
        this.setState({
          ...state,
          preferences: {
            ...state.preferences,
            ...data.preferences
          }
        });
        
        connection.send(JSON.stringify({
          type: "preferences_updated",
          preferences: this.state?.preferences ?? INITIAL_STATE.preferences
        }));
        
        return;
      }
      
      // Handle history clearing
      if (data.type === "clear_history") {
        const state = this.state ?? INITIAL_STATE;
        this.setState({
          ...state,
          recentSearches: [],
          conversationHistory: []
        });
        
        connection.send(JSON.stringify({
          type: "history_cleared"
        }));
        
        return;
      }
      
      // Pass through to parent handler for other messages
      await super.onMessage(connection, message);
    } catch (error) {
      console.error("Error handling WebSocket message:", error);
      connection.send(JSON.stringify({
        type: "error",
        message: "Error processing your request"
      }));
    }
  }

  // Handle HTTP requests
  override async onRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    
    // Search endpoint
    if (url.pathname.endsWith("/search") && request.method === "POST") {
      try {
        const body = await request.json() as any;
        const { query, preferences } = body;
        
        if (!query) {
          return new Response(JSON.stringify({ error: "Query is required" }), { 
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
        
        // Update preferences if provided
        if (preferences) {
          const state = this.state ?? INITIAL_STATE;
          this.setState({
            ...state,
            preferences: {
              ...state.preferences,
              ...preferences
            }
          });
        }
        
        // Process the search
        const response = await this.search(query);
        
        return new Response(JSON.stringify({ query, response }), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        console.error("Error processing search:", error);
        return new Response(JSON.stringify({ error: "Error processing search" }), { 
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
    
    // State endpoint
    if (url.pathname.endsWith("/state") && request.method === "GET") {
      return new Response(JSON.stringify(this.state ?? INITIAL_STATE), {
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // Update preferences endpoint
    if (url.pathname.endsWith("/preferences") && request.method === "POST") {
      try {
        const body = await request.json() as any;
        const state = this.state ?? INITIAL_STATE;
        
        this.setState({
          ...state,
          preferences: {
            ...state.preferences,
            ...body
          }
        });
        
        return new Response(JSON.stringify({ 
          success: true, 
          preferences: this.state?.preferences ?? INITIAL_STATE.preferences 
        }), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        console.error("Error updating preferences:", error);
        return new Response(JSON.stringify({ error: "Error updating preferences" }), { 
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
    
    // Clear history endpoint
    if (url.pathname.endsWith("/clear-history") && request.method === "POST") {
      try {
        const state = this.state ?? INITIAL_STATE;
        this.setState({
          ...state,
          recentSearches: [],
          conversationHistory: []
        });
        
        return new Response(JSON.stringify({ success: true }), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        console.error("Error clearing history:", error);
        return new Response(JSON.stringify({ error: "Error clearing history" }), { 
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
    
    // Default to superclass handling for other requests
    return super.onRequest(request);
  }

  // Process search queries
  async search(query: string): Promise<string> {
  try {
    console.log("Starting search process for:", query);
    
    // Update state with the new search
    const state = this.state ?? INITIAL_STATE;
    this.setState({
      ...state,
      recentSearches: [
        { query, timestamp: Date.now() },
        ...(state.recentSearches || [])
      ].slice(0, MAX_RECENT_SEARCHES),
      conversationHistory: [
        { role: "user" as const, content: query, timestamp: Date.now() },
        ...(state.conversationHistory || [])
      ].slice(0, MAX_CONVERSATION_HISTORY)
    });
    
    // Process the search query with Google's Gemini Pro model
    const googleAI = createGoogleGenerativeAI({ apiKey: this.env.GEMINI_API_KEY });
    const model = googleAI("gemini-1.5-pro");
    
    console.log("Generating text with AI...");
    const { text } = await generateText({
      model,
      system: this.systemPrompt,
      prompt: query,
      tools: {
        braveSearch: tool({
          description: "Search the web using Brave Search to find relevant information for the user's query.",
          parameters: this.braveSearchSchema,
          execute: async ({ query, ...rest }: { query: string; [key: string]: any }) => {
            console.log("Executing Brave search for:", query);
            
            // Convert string parameters to proper types
            const parsedParams: { [key: string]: any } = { ...rest };
            
            // Convert string numbers to actual numbers
            if (typeof parsedParams.count === 'string') parsedParams.count = parseInt(parsedParams.count, 10);
            if (typeof parsedParams.offset === 'string') parsedParams.offset = parseInt(parsedParams.offset, 10);
            
            // Convert string booleans to actual booleans
            const booleanParams = ['text_decorations', 'spellcheck', 'extra_snippets', 'summary'];
            for (const param of booleanParams) {
              if (parsedParams[param] === 'true') parsedParams[param] = true;
              else if (parsedParams[param] === 'false') parsedParams[param] = false;
            }
            
            // Use preferences from state as defaults
            const preferences = this.state?.preferences ?? INITIAL_STATE.preferences;
            
            // Build the URL with parameters
            const url = new URL('https://api.search.brave.com/res/v1/web/search');
            url.searchParams.append('q', query);
            
            // Add preferences as defaults if not explicitly provided
            if (!parsedParams.count && preferences.count) {
              url.searchParams.append('count', preferences.count.toString());
            }
            if (!parsedParams.safesearch && preferences.safesearch) {
              url.searchParams.append('safesearch', preferences.safesearch);
            }
            if (!parsedParams.country && preferences.country) {
              url.searchParams.append('country', preferences.country);
            }
            if (!parsedParams.text_decorations && preferences.text_decorations !== undefined) {
              url.searchParams.append('text_decorations', preferences.text_decorations ? '1' : '0');
            }
            if (!parsedParams.spellcheck && preferences.spellcheck !== undefined) {
              url.searchParams.append('spellcheck', preferences.spellcheck ? '1' : '0');
            }
            if (!parsedParams.extra_snippets && preferences.extra_snippets !== undefined) {
              url.searchParams.append('extra_snippets', preferences.extra_snippets ? '1' : '0');
            }
            if (!parsedParams.summary && preferences.summary !== undefined) {
              url.searchParams.append('summary', preferences.summary ? '1' : '0');
            }
            if (!parsedParams.units && preferences.units) {
              url.searchParams.append('units', preferences.units);
            }
            if (!parsedParams.result_filter && preferences.result_filter) {
              url.searchParams.append('result_filter', preferences.result_filter);
            }
            
            // Handle any additional parameters
            for (const [key, value] of Object.entries(parsedParams)) {
              // Skip empty strings for goggles_id as it must be a valid HTTPS URL
              if (key === 'goggles_id' && (value === undefined || value === '')) {
                continue;
              }
              
              if (value !== undefined) {
                // Convert boolean values to 0/1 for API parameters
                if (typeof value === 'boolean') {
                  url.searchParams.append(key, value ? '1' : '0');
                } 
                // Convert array values for parameters like goggles
                else if (Array.isArray(value)) {
                  if (value.length > 0) {
                    for (const item of value) {
                      url.searchParams.append(key, item.toString());
                    }
                  }
                }
                // Handle all other types
                else if (value !== '') {  // Skip empty strings
                  url.searchParams.append(key, value.toString());
                }
              }
            }
            
            console.log("Brave Search URL:", url.toString());
            
            // Make the API request
            const response = await fetch(url.toString(), {
              headers: {
                'Accept': 'application/json',
                'Accept-Encoding': 'gzip',
                'X-Subscription-Token': this.env.BRAVE_SEARCH_API_KEY
              }
            });
            
            if (!response.ok) {
              throw new Error(`Brave Search API returned ${response.status}: ${await response.text()}`);
            }
            
            const data = await response.json();
            console.log("Received Brave search results");
            
            // Process the response to make it more usable for the AI
            return this.processSearchResults(data);
          }
        })
      },
      maxSteps: 10, // Increase max steps to allow for more interaction with search tool
      temperature: 0.7 // Add some variety to responses
    });
    
    console.log("AI generated response:", text.substring(0, 100) + "...");
    
    // Update conversation history with the response
    const updatedState = this.state ?? INITIAL_STATE;
    this.setState({
      ...updatedState,
      conversationHistory: [
        { role: "assistant" as const, content: text, timestamp: Date.now() },
        ...(updatedState.conversationHistory || [])
      ].slice(0, MAX_CONVERSATION_HISTORY)
    });
    
    return text;
  } catch (error) {
    console.error("Error processing search:", error);
    return `Sorry, I encountered an error while searching: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}
  
  // Process and format the search results to make them more usable for the AI
  private processSearchResults(data: any) {
    try {
      const processed: any = {
        query: data.query?.original,
        alteredQuery: data.query?.altered,
        totalResults: 0,
        webResults: [],
        newsResults: [],
        videoResults: [],
        faqResults: [],
        discussionResults: [],
        locationsResults: [],
        infobox: null,
        summary: null,
      };
      
      // Extract web results
      if (data.web?.results) {
        processed.webResults = data.web.results.map((result: any) => ({
          title: result.title,
          url: result.url,
          description: result.description,
          source: result.meta_url?.hostname || new URL(result.url).hostname,
          extraSnippets: result.extra_snippets || [],
          age: result.age || null
        }));
        processed.totalResults += processed.webResults.length;
      }
      
      // Extract news results
      if (data.news?.results) {
        processed.newsResults = data.news.results.map((result: any) => ({
          title: result.title,
          url: result.url,
          description: result.description,
          source: result.source || result.meta_url?.hostname || new URL(result.url).hostname,
          age: result.age || null,
          isBreaking: result.breaking || false
        }));
        processed.totalResults += processed.newsResults.length;
      }
      
      // Extract video results
      if (data.videos?.results) {
        processed.videoResults = data.videos.results.map((result: any) => ({
          title: result.title,
          url: result.url,
          description: result.description,
          source: result.meta_url?.hostname || new URL(result.url).hostname,
          duration: result.video?.duration || null,
          thumbnail: result.thumbnail?.src || null
        }));
        processed.totalResults += processed.videoResults.length;
      }
      
      // Extract FAQ results
      if (data.faq?.results) {
        processed.faqResults = data.faq.results.map((result: any) => ({
          question: result.question,
          answer: result.answer,
          title: result.title,
          url: result.url,
          source: result.meta_url?.hostname || new URL(result.url).hostname
        }));
        processed.totalResults += processed.faqResults.length;
      }
      
      // Extract discussion results
      if (data.discussions?.results) {
        processed.discussionResults = data.discussions.results.map((result: any) => ({
          title: result.title,
          url: result.url,
          description: result.description,
          forumName: result.data?.forum_name || null,
          numAnswers: result.data?.num_answers || 0,
          score: result.data?.score || null,
          question: result.data?.question || null,
          topComment: result.data?.top_comment || null
        }));
        processed.totalResults += processed.discussionResults.length;
      }
      
      // Extract locations results
      if (data.locations?.results) {
        processed.locationsResults = data.locations.results.map((result: any) => ({
          title: result.title,
          id: result.id,
          coordinates: result.coordinates || null,
          address: result.postal_address?.displayAddress || null,
          categories: result.categories || [],
          rating: result.rating?.ratingValue || null,
          reviewCount: result.rating?.reviewCount || null,
          distance: result.distance ? `${result.distance.value} ${result.distance.units}` : null
        }));
        processed.totalResults += processed.locationsResults.length;
      }
      
      // Extract infobox if available
      if (data.infobox?.results) {
        processed.infobox = {
          type: data.infobox.results.subtype || 'generic',
          title: data.infobox.results.title || data.infobox.results.label,
          description: data.infobox.results.long_desc || '',
          attributes: data.infobox.results.attributes || [],
          thumbnail: data.infobox.results.thumbnail?.src || null
        };
      }
      
      // Extract summary if available
      if (data.summarizer?.key) {
        processed.summary = {
          key: data.summarizer.key
        };
      }
      
      return processed;
    } catch (error) {
      console.error("Error processing search results:", error);
      return data; // Fall back to returning the raw data if processing fails
    }
  }
  
  // Override onStateUpdate to handle state changes if needed
  override onStateUpdate(state: BraveSearchState | undefined, source: Connection | "server"): void {
    console.log("State updated from source:", source);
  }
}

export default {
  async fetch(request: Request, env: any) {
    return (
      (await routeAgentRequest(request, env, { cors: true })) ||
      new Response("Not found", { status: 404 })
    );
  },
};
