import { SuggestOptions, SuggestResponse } from "../types";
import { processSuggestParameters, buildSuggestUrl } from "../utils/parameterProcessing";

/**
 * Internal function to call the Brave Suggest API
 * 
 * @param query Suggest query
 * @param options Suggest options
 * @param apiKey Brave Search API key
 * @returns Suggest response
 */
async function getSuggestions(
  query: string,
  options: SuggestOptions,
  apiKey: string
): Promise<SuggestResponse> {
  console.log("Executing Brave suggest for:", query);
  
  // Process parameters and build URL
  const processedParams = processSuggestParameters(options);
  const url = buildSuggestUrl(query, processedParams);
  
  console.log("Brave Suggest URL:", url.toString());
  
  try {
    // Make the API request
    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': apiKey
      }
    });
    
    if (!response.ok) {
      const responseText = await response.text();
      console.error(`Brave Suggest API error (${response.status}):`, responseText.substring(0, 100));
      throw new Error(`Brave Suggest API returned ${response.status}: ${responseText.substring(0, 100)}`);
    }
    
    // Get the response text first to check if it's valid JSON
    const responseText = await response.text();
    
    // Try to parse the response as JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e: unknown) {
      const error = e as Error;
      console.error("Failed to parse Suggest API response as JSON:", error.message);
      console.error("Response text (first 100 chars):", responseText.substring(0, 100));
      
      // Return a default response instead of throwing
      return {
        type: 'suggest',
        query: { original: query },
        results: []
      };
    }
    
    console.log("Received Brave suggest results");
    
    // Validate the response structure
    if (!data.type || !data.query || !Array.isArray(data.results)) {
      console.warn("Suggest API response doesn't match expected format, creating default response");
      return {
        type: 'suggest',
        query: { original: query },
        results: []
      };
    }
    
    return data as SuggestResponse;
  } catch (error: unknown) {
    console.error("Error in getSuggestions:", error instanceof Error ? error.message : String(error));
    // Return a default response instead of throwing
    return {
      type: 'suggest',
      query: { original: query },
      results: []
    };
  }
}

/**
 * Direct access function for Brave Suggest API
 * Can be imported and used without going through the agent
 * 
 * @param query Suggest query
 * @param options Suggest options
 * @param apiKey Brave Search API key
 * @returns Suggest response
 */
export async function braveSuggest(
  query: string,
  options: SuggestOptions,
  apiKey: string
): Promise<SuggestResponse> {
  return await getSuggestions(query, options, apiKey);
}

export default getSuggestions;
