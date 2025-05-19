import { Agent } from 'agents';
import { GeminiFunctionCaller } from './function-calling';
import { 
  BraveWebSearchParams, 
  BraveWebSearchFunctionArgs, 
  BraveSearchFunctionResponse,
  WebSearchApiResponse,
  SearchResultSummary,
  BraveSearchRequest,
  BraveSearchResponse
} from './types';

// Define the environment type for the agent
interface Env {
  BRAVE_API_KEY: string;
  GEMINI_API_KEY: string;
}

// Define the state type for the agent
interface BraveAgentState {
  conversations: {
    [id: string]: {
      messages: {
        role: 'user' | 'agent';
        content: string;
        timestamp: number;
      }[];
      searchResults?: BraveSearchFunctionResponse;
    };
  };
}

// Brave Search Agent implementation
export class BraveSearchAgent extends Agent<Env, BraveAgentState> {
  // Initial state for the agent
  initialState: BraveAgentState = {
    conversations: {}
  };

  // Function to perform a search using the Brave Search API
  private async performBraveSearch(args: BraveWebSearchFunctionArgs): Promise<BraveSearchFunctionResponse> {
    try {
      // Construct the search parameters
      const params: BraveWebSearchParams = {
        q: args.query,
        count: args.count || 10,
        country: args.country,
        search_lang: args.search_lang,
        safesearch: args.safesearch as 'off' | 'moderate' | 'strict',
        freshness: args.freshness,
        result_filter: args.result_filter,
        spellcheck: true,
        text_decorations: true
      };

      // Build the URL with query parameters
      const url = new URL('https://api.search.brave.com/res/v1/web/search');
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            value.forEach(v => url.searchParams.append(key, v));
          } else {
            url.searchParams.append(key, value.toString());
          }
        }
      });

      // Make the API request
      const response = await fetch(url.toString(), {
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': this.env.BRAVE_API_KEY || ''
        }
      });

      if (!response.ok) {
        throw new Error(`Brave Search API error: ${response.status} ${response.statusText}`);
      }

      // Parse the response
      const data = await response.json() as WebSearchApiResponse;
      
      // Extract and format the search results
      const results: SearchResultSummary[] = [];
      
      // Add web results if available
      if (data.web && data.web.results) {
        data.web.results.forEach(result => {
          results.push({
            title: result.title,
            url: result.url,
            description: result.description || '',
            favicon: result.meta_url?.favicon,
            age: result.age,
            extra_snippets: result.extra_snippets
          });
        });
      }
      
      // Add news results if available
      if (data.news && data.news.results) {
        data.news.results.forEach(result => {
          results.push({
            title: result.title,
            url: result.url,
            description: result.description || '',
            favicon: result.meta_url?.favicon,
            age: result.age,
            extra_snippets: result.extra_snippets
          });
        });
      }

      return {
        results,
        query: {
          original: data.query?.original || args.query,
          altered: data.query?.altered
        },
        total_count: results.length
      };
    } catch (error) {
      console.error('Error performing Brave search:', error);
      throw error;
    }
  }

  // Method to search using the Brave Search API
  async search(request: BraveSearchRequest): Promise<BraveSearchResponse> {
    try {
      const searchResults = await this.performBraveSearch({
        query: request.query,
        count: request.options?.count,
        country: request.options?.country,
        search_lang: request.options?.search_lang,
        safesearch: request.options?.safesearch as 'off' | 'moderate' | 'strict',
        freshness: request.options?.freshness,
        result_filter: request.options?.result_filter
      });

      return {
        results: searchResults.results,
        query: searchResults.query,
        total_count: searchResults.total_count
      };
    } catch (error) {
      console.error('Error in search method:', error);
      throw error;
    }
  }

  // Method to chat with the agent using function calling
  async chat(conversationId: string, message: string): Promise<{
    response: string;
    conversationId: string;
  }> {
    try {
      // Get existing conversation history
      let state = this.state;
      const conversation = state.conversations[conversationId] || { messages: [] };
      
      // Extract previous messages in the format needed for Gemini
      const previousMessages = conversation.messages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }));
      
      // Initialize the function caller
      const functionCaller = new GeminiFunctionCaller(
        this.env.GEMINI_API_KEY || '',
        this.performBraveSearch.bind(this)
      );

      // Process the query with conversation history
      const result = await functionCaller.processQuery(message, previousMessages);

      // Update the conversation state
      if (!state.conversations[conversationId]) {
        state.conversations[conversationId] = {
          messages: []
        };
      }

      // Add the user message
      state.conversations[conversationId].messages.push({
        role: 'user',
        content: message,
        timestamp: Date.now()
      });

      // Add the agent response
      state.conversations[conversationId].messages.push({
        role: 'agent',
        content: result.response,
        timestamp: Date.now()
      });

      // Store search results if available
      if (result.searchResults) {
        state.conversations[conversationId].searchResults = result.searchResults;
      }

      // Update the state
      this.setState(state);

      return {
        response: result.response,
        conversationId
      };
    } catch (error) {
      console.error('Error in chat method:', error);
      throw error;
    }
  }

  // Method to get conversation history
  async getConversation(conversationId: string): Promise<{
    messages: {
      role: 'user' | 'agent';
      content: string;
      timestamp: number;
    }[];
    searchResults?: BraveSearchFunctionResponse;
  }> {
    const state = this.state;
    if (!state.conversations[conversationId]) {
      return {
        messages: []
      };
    }

    return state.conversations[conversationId];
  }

  // Method to list all conversations
  async listConversations(): Promise<{
    conversationIds: string[];
  }> {
    const state = this.state;
    return {
      conversationIds: Object.keys(state.conversations)
    };
  }

  // Method to delete a conversation
  async deleteConversation(conversationId: string): Promise<{
    success: boolean;
  }> {
    const state = this.state;
    if (state.conversations[conversationId]) {
      delete state.conversations[conversationId];
      this.setState(state);
      return { success: true };
    }
    return { success: false };
  }

  // Handle HTTP requests
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // Set CORS headers
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json'
    };

    // Handle preflight requests
    if (method === 'OPTIONS') {
      return new Response(null, { headers });
    }

    try {
      // Extract the endpoint from the path
      // Format: /agents/brave-search-agent/[endpoint]
      const parts = path.split('/');
      const endpoint = parts[3]; // The endpoint is the 4th part (index 3)

      if (method === 'POST') {
        // Parse the request body
        const body = await request.json() as any;

        // Route to the appropriate method based on the endpoint
        switch (endpoint) {
          case 'chat': {
            if (typeof body.conversationId !== 'string' || typeof body.message !== 'string') {
              return new Response(JSON.stringify({ error: 'Invalid request body' }), { 
                status: 400,
                headers 
              });
            }
            const result = await this.chat(body.conversationId, body.message);
            return new Response(JSON.stringify(result), { headers });
          }
          case 'getConversation': {
            if (typeof body.conversationId !== 'string') {
              return new Response(JSON.stringify({ error: 'Invalid request body' }), { 
                status: 400,
                headers 
              });
            }
            const result = await this.getConversation(body.conversationId);
            return new Response(JSON.stringify(result), { headers });
          }
          case 'listConversations': {
            const result = await this.listConversations();
            return new Response(JSON.stringify(result), { headers });
          }
          case 'deleteConversation': {
            if (typeof body.conversationId !== 'string') {
              return new Response(JSON.stringify({ error: 'Invalid request body' }), { 
                status: 400,
                headers 
              });
            }
            const result = await this.deleteConversation(body.conversationId);
            return new Response(JSON.stringify(result), { headers });
          }
          case 'search': {
            // Validate the search request
            if (typeof body.query !== 'string') {
              return new Response(JSON.stringify({ error: 'Invalid search query' }), { 
                status: 400,
                headers 
              });
            }
            const searchRequest: BraveSearchRequest = {
              query: body.query,
              options: body.options
            };
            const result = await this.search(searchRequest);
            return new Response(JSON.stringify(result), { headers });
          }
          default:
            return new Response(JSON.stringify({ error: 'Method not found' }), { 
              status: 404,
              headers 
            });
        }
      }

      // Handle GET requests
      if (method === 'GET') {
        switch (endpoint) {
          case 'listConversations': {
            const result = await this.listConversations();
            return new Response(JSON.stringify(result), { headers });
          }
          default:
            return new Response(JSON.stringify({ error: 'Method not found' }), { 
              status: 404,
              headers 
            });
        }
      }

      // If we get here, the request method is not supported
      return new Response(JSON.stringify({ error: 'Method not supported' }), { 
        status: 405,
        headers 
      });
    } catch (error) {
      console.error('Error handling request:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return new Response(JSON.stringify({ error: errorMessage }), { 
        status: 500,
        headers 
      });
    }
  }
}
