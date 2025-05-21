import { Agent, type AgentContext, type Connection, type WSMessage } from "agents";
import { generateText, tool } from "ai";
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { BraveSearchState, braveSearchSchema, braveSuggestSchema } from "../types";
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

  // Process search queries
  async search(query: string): Promise<string> {
    try {
      console.log("Starting search process for:", query);
      
      // Update state with the new search
      this.updateSearchHistory(query);
      
      // Process the search query with Google's Gemini Pro model
      const googleAI = createGoogleGenerativeAI({ apiKey: this.env.GEMINI_API_KEY });
      const model = googleAI("gemini-1.5-pro");
      
      console.log("Generating text with AI...");
      const { text } = await generateText({
        model,
        system: SYSTEM_PROMPT,
        prompt: query,
        tools: {
          braveSearch: tool({
            description: "Search the web using Brave Search to find relevant information for the user's query.",
            parameters: braveSearchSchema,
            execute: async ({ query, ...rest }: { query: string; [key: string]: any }) => {
              return await searchWeb(query, rest, this.env.BRAVE_SEARCH_API_KEY);
            }
          }),
          braveSuggest: tool({
            description: "Get query suggestions from Brave Search to help users refine their search queries.",
            parameters: braveSuggestSchema,
            execute: async ({ query, ...rest }: { query: string; [key: string]: any }) => {
              return await getSuggestions(query, rest, this.env.BRAVE_SUGGEST_API_KEY);
            }
          })
        },
        maxSteps: 10, // Increase max steps to allow for more interaction with search tool
        temperature: 0.7 // Add some variety to responses
      });
      
      console.log("AI generated response:", text.substring(0, 100) + "...");
      
      // Update conversation history with the response
      this.updateConversationHistory("assistant", text);
      
      return text;
    } catch (error) {
      console.error("Error processing search:", error);
      return `Sorry, I encountered an error while searching: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
  
  // Process suggest queries
  async getSuggestions(query: string, options: any = {}): Promise<any> {
    try {
      return await getSuggestions(query, options, this.env.BRAVE_SUGGEST_API_KEY);
    } catch (error) {
      console.error("Error processing suggest:", error);
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
