import { Agent, type AgentContext, type Connection, type WSMessage } from "agents";
import { generateText, tool } from "ai";
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { 
  braveSearchSchema, 
  braveSuggestSchema
} from "../types";
import type { 
  BraveSearchState, 
  SearchOptions,
  SearchResult,
  SuggestOptions,
  SuggestResponse,
  NewsResult,
  VideoResult,
  FaqResult,
  DiscussionResult,
  LocationResult,
  WebResult
} from "../types";
import { braveWebSearch } from "../api/braveSearch";
import { INITIAL_STATE, MAX_RECENT_SEARCHES, MAX_CONVERSATION_HISTORY, SYSTEM_PROMPT } from "../config";
import searchWeb from "../api/braveSearch";
import getSuggestions from "../api/suggest";


export class BraveSearchAgent extends Agent<{
  BRAVE_SEARCH_API_KEY: string;
  BRAVE_SUGGEST_API_KEY: string;
  GEMINI_API_KEY: string;
}, BraveSearchState> {
  // Initialize state
  initialState: BraveSearchState = INITIAL_STATE;

  constructor(ctx: AgentContext, env: { BRAVE_SEARCH_API_KEY: string; BRAVE_SUGGEST_API_KEY: string; GEMINI_API_KEY: string }) {
    super(ctx, env);
  }

  // Handle WebSocket messages for real-time interaction
  override async onMessage(connection: Connection, message: WSMessage): Promise<void> {
    try {
      if (typeof message !== "string") {
        return await super.onMessage(connection, message);
      }

      const data = JSON.parse(message) as any;
      
      // Handle direct search requests via WebSocket
      if (data.type === "search_request") {
        const { query, options } = data;
        
        // Process the direct search
        const response = await this.directSearch(query, options || {});
        
        // Send the response back through the WebSocket
        connection.send(JSON.stringify({
          type: "search_response",
          query,
          response
        }));
        
        return;
      }
      
      // Handle optimized search requests via WebSocket
      if (data.type === "optimized_search_request") {
        const { query, searchOptions, suggestOptions } = data;
        
        // Process the optimized search
        const response = await this.optimizedSearch(
          query, 
          searchOptions || {}, 
          suggestOptions || {}
        );
        
        // Send the response back through the WebSocket
        connection.send(JSON.stringify({
          type: "optimized_search_response",
          query,
          response
        }));
        
        return;
      }
      
      // Handle agentic search requests via WebSocket
      if (data.type === "agentic_search_request") {
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
        
        // Process the agentic search
        const response = await this.agenticSearch(query);
        
        // Send the response back through the WebSocket
        connection.send(JSON.stringify({
          type: "agentic_search_response",
          query,
          response
        }));
        
        return;
      }
      
      // Handle suggest requests via WebSocket
      if (data.type === "suggest_request") {
        const { query, options } = data;
        
        // Process the suggest request
        const response = await this.getSuggestions(query, options || {});
        
        // Send the response back through the WebSocket
        connection.send(JSON.stringify({
          type: "suggest_response",
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
    
    // Direct search endpoint
    if (url.pathname.endsWith("/search") && request.method === "POST") {
      try {
        const body = await request.json() as { 
          query: string; 
          options?: SearchOptions;
        };
        
        if (!body.query) {
          return new Response(JSON.stringify({ error: "Query is required" }), { 
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
        
        // Process the direct search
        const response = await this.directSearch(body.query, body.options || {});
        
        return new Response(JSON.stringify({ query: body.query, response }), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        console.error("Error processing direct search:", error);
        return new Response(JSON.stringify({ 
          error: "Error processing direct search",
          details: error instanceof Error ? error.message : String(error)
        }), { 
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
    
    // Optimized search endpoint
    if (url.pathname.endsWith("/optimized-search") && request.method === "POST") {
      try {
        const body = await request.json() as { 
          query: string; 
          searchOptions?: SearchOptions;
          suggestOptions?: SuggestOptions;
        };
        
        if (!body.query) {
          return new Response(JSON.stringify({ error: "Query is required" }), { 
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
        
        // Process the optimized search
        const response = await this.optimizedSearch(
          body.query, 
          body.searchOptions || {}, 
          body.suggestOptions || {}
        );
        
        return new Response(JSON.stringify({ query: body.query, response }), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        console.error("Error processing optimized search:", error);
        return new Response(JSON.stringify({ 
          error: "Error processing optimized search",
          details: error instanceof Error ? error.message : String(error)
        }), { 
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
    
    // Agentic search endpoint
    if (url.pathname.endsWith("/agentic-search") && request.method === "POST") {
      try {
        const body = await request.json() as { 
          query: string; 
          preferences?: BraveSearchState['preferences'];
        };
        
        if (!body.query) {
          return new Response(JSON.stringify({ error: "Query is required" }), { 
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
        
        // Update preferences if provided
        if (body.preferences) {
          const state = this.state ?? INITIAL_STATE;
          this.setState({
            ...state,
            preferences: {
              ...state.preferences,
              ...body.preferences
            }
          });
        }
        
        // Process the agentic search
        const response = await this.agenticSearch(body.query);
        
        return new Response(JSON.stringify({ query: body.query, response }), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        console.error("Error processing agentic search:", error);
        return new Response(JSON.stringify({ 
          error: "Error processing agentic search",
          details: error instanceof Error ? error.message : String(error)
        }), { 
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
    
    // Suggest endpoint
    if (url.pathname.endsWith("/suggest") && request.method === "POST") {
      try {
        const body = await request.json() as any;
        const { query, options } = body;
        
        if (!query) {
          return new Response(JSON.stringify({ error: "Query is required" }), { 
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
        
        // Process the suggest request
        const response = await this.getSuggestions(query, options || {});
        
        return new Response(JSON.stringify({ query, response }), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        console.error("Error processing suggest:", error);
        return new Response(JSON.stringify({ error: "Error processing suggest" }), { 
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

  // Direct search - calls the Brave Search API directly
  async directSearch(
    query: string,
    options: SearchOptions
  ): Promise<SearchResult> {
    const startTime = Date.now();
    console.log(`[SEARCH] Direct search started for: "${query}"`);
    console.log(`[SEARCH] Direct search options: ${JSON.stringify(options)}`);
    
    // Update search history
    const historyStartTime = Date.now();
    this.updateSearchHistory(query);
    const historyEndTime = Date.now();
    console.log(`[TIMING] Direct search - Update history: ${historyEndTime - historyStartTime}ms`);
    
    // Call the Brave Search API directly
    const apiStartTime = Date.now();
    const result = await braveWebSearch(query, options, this.env.BRAVE_SEARCH_API_KEY);
    const apiEndTime = Date.now();
    console.log(`[TIMING] Direct search - API call: ${apiEndTime - apiStartTime}ms`);
    
    const endTime = Date.now();
    const totalDuration = endTime - startTime;
    console.log(`[TIMING] Direct search - Total execution time: ${totalDuration}ms`);
    console.log(`[SEARCH] Direct search results: ${result.webResults.length} web results, ${result.totalResults} total results`);
    
    return result;
  }
  
  // Optimized search - uses suggest API to get optimized queries, then calls search API
  async optimizedSearch(
    query: string, 
    searchOptions: SearchOptions,
    suggestOptions: SuggestOptions = {}
  ): Promise<SearchResult & { sources: string[] }> {
    const startTime = Date.now();
    console.log(`[SEARCH] Optimized search started for: "${query}"`);
    console.log(`[SEARCH] Optimized search options: ${JSON.stringify(searchOptions)}`);
    console.log(`[SEARCH] Suggest options: ${JSON.stringify(suggestOptions)}`);
    
    // Update search history
    const historyStartTime = Date.now();
    this.updateSearchHistory(query);
    const historyEndTime = Date.now();
    console.log(`[TIMING] Optimized search - Update history: ${historyEndTime - historyStartTime}ms`);
    
    // Set default suggest options if not provided
    const optionsStartTime = Date.now();
    const finalSuggestOptions: SuggestOptions = {
      count: suggestOptions.count || 3,
      country: suggestOptions.country || searchOptions.country,
      lang: suggestOptions.lang || searchOptions.search_lang,
      ...suggestOptions
    };
    const optionsEndTime = Date.now();
    console.log(`[TIMING] Optimized search - Process options: ${optionsEndTime - optionsStartTime}ms`);
    
    // Get suggestions first
    const suggestStartTime = Date.now();
    const suggestResponse = await getSuggestions(
      query, 
      finalSuggestOptions, 
      this.env.BRAVE_SUGGEST_API_KEY
    );
    const suggestEndTime = Date.now();
    console.log(`[TIMING] Optimized search - Get suggestions: ${suggestEndTime - suggestStartTime}ms`);
    console.log(`[SEARCH] Suggestions received: ${suggestResponse.results?.length || 0}`);
    
    // Use original query and suggestions for search
    const queries = [query];
    
    // Add suggestions to queries if available
    if (suggestResponse.results && suggestResponse.results.length > 0) {
      // Add suggestions to the queries array
      for (const suggestion of suggestResponse.results) {
        queries.push(suggestion.query);
      }
    }
    console.log(`[SEARCH] Total queries to search: ${queries.length}`);
    
    // Execute searches for all queries
    const searchStartTime = Date.now();
    const searchResults = await Promise.all(
      queries.map(q => braveWebSearch(q, searchOptions, this.env.BRAVE_SEARCH_API_KEY))
    );
    const searchEndTime = Date.now();
    console.log(`[TIMING] Optimized search - Execute searches: ${searchEndTime - searchStartTime}ms`);
    
    // Merge and deduplicate results
    const mergeStartTime = Date.now();
    const mergedResults = this.mergeSearchResults(searchResults, queries);
    const mergeEndTime = Date.now();
    console.log(`[TIMING] Optimized search - Merge results: ${mergeEndTime - mergeStartTime}ms`);
    
    const endTime = Date.now();
    const totalDuration = endTime - startTime;
    console.log(`[TIMING] Optimized search - Total execution time: ${totalDuration}ms`);
    console.log(`[SEARCH] Optimized search results: ${mergedResults.webResults.length} web results, ${mergedResults.totalResults} total results`);
    
    return mergedResults;
  }
  
  /**
   * Merges multiple search results into a single result with deduplication
   * 
   * @param results Array of search results to merge
   * @param queries Array of queries that produced these results
   * @returns Merged and deduplicated search result
   */
  private mergeSearchResults(
    results: SearchResult[], 
    queries: string[]
  ): SearchResult & { sources: string[] } {
    const startTime = Date.now();
    console.log(`[MERGE] Starting merge of ${results.length} search results`);
    
    if (results.length === 0) {
      throw new Error("No search results to merge");
    }
    
    // Use the first result as the base
    const initStartTime = Date.now();
    const mergedResult: SearchResult & { sources: string[] } = {
      ...results[0],
      sources: [queries[0]],
      webResults: [...results[0].webResults],
      newsResults: [...results[0].newsResults],
      videoResults: [...results[0].videoResults],
      faqResults: [...results[0].faqResults],
      discussionResults: [...results[0].discussionResults],
      locationsResults: [...results[0].locationsResults]
    };
    const initEndTime = Date.now();
    console.log(`[TIMING] Merge - Initialize result: ${initEndTime - initStartTime}ms`);
    
    // Track URLs to avoid duplicates
    const seenUrls = new Set<string>(
      mergedResult.webResults.map((result: WebResult) => result.url)
    );
    
    // Stats for logging
    let addedWebResults = 0;
    let addedNewsResults = 0;
    let addedVideoResults = 0;
    let addedFaqResults = 0;
    let addedDiscussionResults = 0;
    let addedLocationResults = 0;
    
    // Merge additional results
    for (let i = 1; i < results.length; i++) {
      const resultStartTime = Date.now();
      const result = results[i];
      console.log(`[MERGE] Processing results from query: "${queries[i]}"`);
      
      // Add source query
      mergedResult.sources.push(queries[i]);
      
      // Merge web results with deduplication
      const webStartTime = Date.now();
      for (const webResult of result.webResults) {
        if (!seenUrls.has(webResult.url)) {
          mergedResult.webResults.push(webResult);
          seenUrls.add(webResult.url);
          addedWebResults++;
        }
      }
      const webEndTime = Date.now();
      console.log(`[TIMING] Merge - Web results for query ${i+1}: ${webEndTime - webStartTime}ms`);
      
      // Deduplicate news results
      const newsStartTime = Date.now();
      const seenNewsUrls = new Set<string>(
        mergedResult.newsResults.map((item: NewsResult) => item.url)
      );
      for (const newsResult of result.newsResults) {
        if (!seenNewsUrls.has(newsResult.url)) {
          mergedResult.newsResults.push(newsResult);
          seenNewsUrls.add(newsResult.url);
          addedNewsResults++;
        }
      }
      const newsEndTime = Date.now();
      console.log(`[TIMING] Merge - News results for query ${i+1}: ${newsEndTime - newsStartTime}ms`);
      
      // Deduplicate video results
      const videoStartTime = Date.now();
      const seenVideoUrls = new Set<string>(
        mergedResult.videoResults.map((item: VideoResult) => item.url)
      );
      for (const videoResult of result.videoResults) {
        if (!seenVideoUrls.has(videoResult.url)) {
          mergedResult.videoResults.push(videoResult);
          seenVideoUrls.add(videoResult.url);
          addedVideoResults++;
        }
      }
      const videoEndTime = Date.now();
      console.log(`[TIMING] Merge - Video results for query ${i+1}: ${videoEndTime - videoStartTime}ms`);
      
      // Deduplicate FAQ results
      const faqStartTime = Date.now();
      const seenFaqUrls = new Set<string>(
        mergedResult.faqResults.map((item: FaqResult) => item.url)
      );
      for (const faqResult of result.faqResults) {
        if (!seenFaqUrls.has(faqResult.url)) {
          mergedResult.faqResults.push(faqResult);
          seenFaqUrls.add(faqResult.url);
          addedFaqResults++;
        }
      }
      const faqEndTime = Date.now();
      console.log(`[TIMING] Merge - FAQ results for query ${i+1}: ${faqEndTime - faqStartTime}ms`);
      
      // Deduplicate discussion results
      const discussionStartTime = Date.now();
      const seenDiscussionUrls = new Set<string>(
        mergedResult.discussionResults.map((item: DiscussionResult) => item.url)
      );
      for (const discussionResult of result.discussionResults) {
        if (!seenDiscussionUrls.has(discussionResult.url)) {
          mergedResult.discussionResults.push(discussionResult);
          seenDiscussionUrls.add(discussionResult.url);
          addedDiscussionResults++;
        }
      }
      const discussionEndTime = Date.now();
      console.log(`[TIMING] Merge - Discussion results for query ${i+1}: ${discussionEndTime - discussionStartTime}ms`);
      
      // Deduplicate location results
      const locationStartTime = Date.now();
      const seenLocationIds = new Set<string>(
        mergedResult.locationsResults.map((item: LocationResult) => item.id)
      );
      for (const locationResult of result.locationsResults) {
        if (!seenLocationIds.has(locationResult.id)) {
          mergedResult.locationsResults.push(locationResult);
          seenLocationIds.add(locationResult.id);
          addedLocationResults++;
        }
      }
      const locationEndTime = Date.now();
      console.log(`[TIMING] Merge - Location results for query ${i+1}: ${locationEndTime - locationStartTime}ms`);
      
      const resultEndTime = Date.now();
      console.log(`[TIMING] Merge - Total for query ${i+1}: ${resultEndTime - resultStartTime}ms`);
    }
    
    // Update total results count
    mergedResult.totalResults = mergedResult.webResults.length;
    
    const endTime = Date.now();
    const totalDuration = endTime - startTime;
    console.log(`[TIMING] Merge - Total execution time: ${totalDuration}ms`);
    console.log(`[MERGE] Results: ${mergedResult.webResults.length} web, ${mergedResult.newsResults.length} news, ${mergedResult.videoResults.length} video, ${mergedResult.faqResults.length} FAQ, ${mergedResult.discussionResults.length} discussion, ${mergedResult.locationsResults.length} location`);
    console.log(`[MERGE] Added from secondary queries: ${addedWebResults} web, ${addedNewsResults} news, ${addedVideoResults} video, ${addedFaqResults} FAQ, ${addedDiscussionResults} discussion, ${addedLocationResults} location`);
    
    return mergedResult;
  }
  
  // Agentic search - uses AI to process search results
  async agenticSearch(query: string): Promise<string> {
    const startTime = Date.now();
    console.log(`[AGENTIC] Agentic search started for: "${query}"`);
    
    try {
      // Update state with the new search
      const historyStartTime = Date.now();
      this.updateSearchHistory(query);
      const historyEndTime = Date.now();
      console.log(`[TIMING] Agentic search - Update history: ${historyEndTime - historyStartTime}ms`);
      
      // Process the search query with Google's Gemini Pro model
      const aiInitStartTime = Date.now();
      const googleAI = createGoogleGenerativeAI({ apiKey: this.env.GEMINI_API_KEY });
      const model = googleAI("gemini-1.5-pro");
      const aiInitEndTime = Date.now();
      console.log(`[TIMING] Agentic search - Initialize AI model: ${aiInitEndTime - aiInitStartTime}ms`);
      
      console.log(`[AGENTIC] Generating text with AI for query: "${query}"`);
      const generateStartTime = Date.now();
      const { text } = await generateText({
        model,
        system: SYSTEM_PROMPT,
        prompt: `Answer the following query by using the braveSearch and braveSuggest tools to gather accurate information. Make multiple search queries to cover different aspects of the question. IMPORTANT: You must actually call the tools, not just describe what you would search for.\n\nQuery: ${query}`,
        tools: {
          braveSearch: tool({
            description: "Search the web using Brave Search to find relevant information for the user's query.",
            parameters: braveSearchSchema,
            execute: async ({ query, ...rest }: { query: string; [key: string]: any }) => {
              console.log(`[AGENTIC] AI tool called braveSearch with query: "${query}"`);
              const toolStartTime = Date.now();
              const result = await searchWeb(query, rest, this.env.BRAVE_SEARCH_API_KEY);
              const toolEndTime = Date.now();
              console.log(`[TIMING] Agentic search - Tool braveSearch execution: ${toolEndTime - toolStartTime}ms`);
              console.log(`[AGENTIC] braveSearch returned ${result.webResults.length} web results`);
              return result;
            }
          }),
          braveSuggest: tool({
            description: "Get query suggestions from Brave Search to help users refine their search queries.",
            parameters: braveSuggestSchema,
            execute: async ({ query, ...rest }: { query: string; [key: string]: any }) => {
              console.log(`[AGENTIC] AI tool called braveSuggest with query: "${query}"`);
              const toolStartTime = Date.now();
              const result = await getSuggestions(query, rest, this.env.BRAVE_SUGGEST_API_KEY);
              const toolEndTime = Date.now();
              console.log(`[TIMING] Agentic search - Tool braveSuggest execution: ${toolEndTime - toolStartTime}ms`);
              console.log(`[AGENTIC] braveSuggest returned ${result.results?.length || 0} suggestions`);
              return result;
            }
          })
        },
        maxSteps: 10, // Increase max steps to allow for more interaction with search tool
        temperature: 0.7 // Add some variety to responses
      });
      const generateEndTime = Date.now();
      console.log(`[TIMING] Agentic search - Generate text: ${generateEndTime - generateStartTime}ms`);
      
      console.log(`[AGENTIC] AI generated response (first 100 chars): ${text.substring(0, 100)}...`);
      
      // Update conversation history with the response
      const updateHistoryStartTime = Date.now();
      this.updateConversationHistory("assistant", text);
      const updateHistoryEndTime = Date.now();
      console.log(`[TIMING] Agentic search - Update conversation history: ${updateHistoryEndTime - updateHistoryStartTime}ms`);
      
      const endTime = Date.now();
      const totalDuration = endTime - startTime;
      console.log(`[TIMING] Agentic search - Total execution time: ${totalDuration}ms`);
      
      return text;
    } catch (error) {
      const endTime = Date.now();
      const totalDuration = endTime - startTime;
      console.error(`[ERROR] Agentic search failed after ${totalDuration}ms:`, error);
      return `Sorry, I encountered an error while searching: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
  
  // Process suggest queries
  async getSuggestions(query: string, options: SuggestOptions = {}): Promise<SuggestResponse> {
    const startTime = Date.now();
    console.log(`[SUGGEST] Suggest started for: "${query}"`);
    console.log(`[SUGGEST] Suggest options: ${JSON.stringify(options)}`);
    
    try {
      const apiStartTime = Date.now();
      const result = await getSuggestions(query, options, this.env.BRAVE_SUGGEST_API_KEY);
      const apiEndTime = Date.now();
      console.log(`[TIMING] Suggest - API call: ${apiEndTime - apiStartTime}ms`);
      
      const endTime = Date.now();
      const totalDuration = endTime - startTime;
      console.log(`[TIMING] Suggest - Total execution time: ${totalDuration}ms`);
      console.log(`[SUGGEST] Suggest results: ${result.results?.length || 0} suggestions`);
      
      return result;
    } catch (error) {
      const endTime = Date.now();
      const totalDuration = endTime - startTime;
      console.error(`[ERROR] Suggest failed after ${totalDuration}ms:`, error);
      throw error;
    }
  }
  
  // Update search history
  private updateSearchHistory(query: string): void {
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
  }
  
  // Update conversation history
  private updateConversationHistory(role: "user" | "assistant", content: string): void {
    const state = this.state ?? INITIAL_STATE;
    this.setState({
      ...state,
      conversationHistory: [
        { role, content, timestamp: Date.now() },
        ...(state.conversationHistory || [])
      ].slice(0, MAX_CONVERSATION_HISTORY)
    });
  }
  
  // Override onStateUpdate to handle state changes if needed
  override onStateUpdate(state: BraveSearchState | undefined, source: Connection | "server"): void {
    console.log("State updated from source:", source);
  }
}
