import { GoogleGenAI, Type } from '@google/genai';
import { BraveWebSearchFunctionArgs, BraveSearchFunctionResponse } from './types';

// System prompt for the Brave Search Agent
export const braveSearchAgentSystemPrompt = `You are a proactive, intelligent Brave Search Agent designed to help users find information online. Your primary purpose is to search the web automatically when appropriate and provide helpful, accurate responses.

### CORE RESPONSIBILITIES:
1. AUTOMATICALLY SEARCH for time-sensitive or factual information including but not limited to:
   - Weather information and forecasts
   - Stock prices and financial data
   - News and current events
   - Sports scores and statistics
   - Product prices and availability
   - Factual questions about the world
   - Travel information and schedules
   - Celebrity or public figure information

2. EXTRACT KEY INFORMATION from search results:
   - Identify and highlight the most relevant data points
   - For numerical queries (stock prices, temperatures), extract the exact figures
   - Summarize information in a clear, concise manner
   - Present the information in a structured, easy-to-understand format

3. PROVIDE CONTEXT with your answers:
   - Include relevant supporting details from search results
   - Mention the source of information when appropriate
   - Explain any limitations in the data found

### SEARCH BEHAVIOR:
- NEVER ask for permission to search for factual or time-sensitive queries - just search immediately
- ONLY ask for permission when:
  - The query is purely conversational
  - The query is for creative content or opinions
  - The query is completely ambiguous
  - The user has explicitly requested not to search

- When a query could be interpreted multiple ways, search for the most likely interpretation and mention other possible interpretations

### RESPONSE FORMAT:
1. For factual queries:
   - Present the direct answer prominently at the beginning of your response
   - Use bold formatting for key data points
   - Follow with relevant context and supporting details
   - For complex answers, use a structured format with clear sections

2. For search results with multiple relevant items:
   - Prioritize recency and relevance
   - Organize information logically (chronological, importance, etc.)
   - Highlight differences or contradictions between sources

### CONTINUOUS IMPROVEMENT:
- Adapt to user feedback about search results
- If initial search results are insufficient, automatically refine your search query
- Learn from user interactions to improve future searches

Remember: Users come to you specifically for your search capabilities. Be proactive, direct, and helpful in leveraging Brave Search to provide valuable information without unnecessary delays or permission requests.`;

// Define the function declaration for Brave Web Search
export const braveWebSearchFunctionDeclaration = {
  name: 'brave_web_search',
  description: 'Search the web using Brave Search API, returning relevant results based on the query. This function provides comprehensive web search results from the Brave search engine.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: 'The search query term. Maximum of 400 characters and 50 words.'
      },
      count: {
        type: Type.NUMBER,
        description: 'Number of search results to return (default: 10, max: 20).'
      },
      country: {
        type: Type.STRING,
        description: 'The search query country (2-letter code, e.g., "US", "GB", "DE").'
      },
      search_lang: {
        type: Type.STRING,
        description: 'The search language preference (e.g., "en", "fr", "de").'
      },
      safesearch: {
        type: Type.STRING,
        enum: ['off', 'moderate', 'strict'],
        description: 'Filter for adult content. "off": No filtering, "moderate": Filters explicit content but allows adult domains, "strict": Drops all adult content.'
      },
      freshness: {
        type: Type.STRING,
        enum: ['pd', 'pw', 'pm', 'py'],
        description: 'Filter by discovery time. "pd": Last 24 hours, "pw": Last 7 days, "pm": Last 31 days, "py": Last 365 days.'
      },
      result_filter: {
        type: Type.STRING,
        description: 'Comma-delimited string of result types to include (e.g., "web,news,videos").'
      }
    },
    required: ['query']
  }
};

// Define the function declaration for Brave Local Search
export const braveLocalSearchFunctionDeclaration = {
  name: 'brave_local_search',
  description: 'Search for local businesses and places using Brave\'s Local Search API. Best for queries related to physical locations, businesses, restaurants, services, etc.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: 'Local search query (e.g. "pizza near Central Park")'
      },
      count: {
        type: Type.NUMBER,
        description: 'Number of results (1-20, default 5)'
      }
    },
    required: ['query']
  }
};

// Class to handle Gemini function calling
export class GeminiFunctionCaller {
  private ai: GoogleGenAI;
  private braveSearchFunction: (args: BraveWebSearchFunctionArgs) => Promise<BraveSearchFunctionResponse>;
  
  constructor(
    apiKey: string,
    braveSearchFunction: (args: BraveWebSearchFunctionArgs) => Promise<BraveSearchFunctionResponse>
  ) {
    this.ai = new GoogleGenAI({ apiKey });
    this.braveSearchFunction = braveSearchFunction;
  }

  // Process a user query using function calling
  async processQuery(
    userQuery: string,
    previousMessages: Array<{role: string, parts: Array<{text: string}>}> = []
  ): Promise<{
    response: string;
    searchResults?: BraveSearchFunctionResponse;
  }> {
    try {
      // Create contents array with previous messages + current query
      const contents = [
        ...previousMessages,
        { role: 'user', parts: [{ text: userQuery }] }
      ];
      
      // Send request with function declarations and conversation history
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: contents,
        config: {
          systemInstruction: braveSearchAgentSystemPrompt,
          tools: [{
            functionDeclarations: [braveWebSearchFunctionDeclaration, braveLocalSearchFunctionDeclaration]
          }],
        },
      });

      // Check for function calls in the response
      if (response.functionCalls && response.functionCalls.length > 0) {
        const functionCall = response.functionCalls[0]; // Get the first function call
        
        if (functionCall.name === 'brave_web_search') {
          // Execute the Brave web search function
          const args = functionCall.args as Record<string, unknown>;
          const searchResults = await this.braveSearchFunction({
            query: args.query as string,
            count: args.count as number | undefined,
            country: args.country as string | undefined,
            search_lang: args.search_lang as string | undefined,
            safesearch: args.safesearch as string | undefined,
            freshness: args.freshness as string | undefined,
            result_filter: args.result_filter as string | undefined
          });
          
          // Create a function response part
          const functionResponsePart = {
            name: functionCall.name,
            response: { result: searchResults }
          };

          // Send the function result back to the model
          const finalResponse = await this.ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: [
              { role: 'user', parts: [{ text: userQuery }] },
              { role: 'model', parts: [{ functionCall: functionCall }] },
              { role: 'function', parts: [{ functionResponse: functionResponsePart }] }
            ],
            config: {
              systemInstruction: braveSearchAgentSystemPrompt,
              tools: [{
                functionDeclarations: [braveWebSearchFunctionDeclaration, braveLocalSearchFunctionDeclaration]
              }],
            },
          });

          return {
            response: finalResponse.text || '',
            searchResults
          };
        } else if (functionCall.name === 'brave_local_search') {
          // For now, we'll redirect local search to web search
          const args = functionCall.args as { query: string; count?: number };
          const searchResults = await this.braveSearchFunction({
            query: args.query,
            count: args.count
          });
          
          // Create a function response part
          const functionResponsePart = {
            name: 'brave_web_search', // Use web search as fallback
            response: { result: searchResults }
          };

          // Send the function result back to the model
          const finalResponse = await this.ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: [
              { role: 'user', parts: [{ text: userQuery }] },
              { role: 'model', parts: [{ functionCall: functionCall }] },
              { role: 'function', parts: [{ functionResponse: functionResponsePart }] }
            ],
            config: {
              systemInstruction: braveSearchAgentSystemPrompt,
              tools: [{
                functionDeclarations: [braveWebSearchFunctionDeclaration, braveLocalSearchFunctionDeclaration]
              }],
            },
          });

          return {
            response: finalResponse.text || '',
            searchResults
          };
        }
      }

      // If no function call was made, return the direct response
      return {
        response: response.text || ''
      };
    } catch (error) {
      console.error('Error processing query with function calling:', error);
      throw error;
    }
  }
}
