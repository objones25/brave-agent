import { SearchOptions, SearchResult } from "../types";
import { processSearchParameters, buildSearchUrl } from "../utils/parameterProcessing";
import { processSearchResults } from "../utils/responseProcessing";

/**
 * Internal function to call the Brave Search API
 * 
 * @param query Search query
 * @param options Search options
 * @param apiKey Brave Search API key
 * @returns Processed search results
 */
async function searchWeb(
  query: string,
  options: SearchOptions,
  apiKey: string
): Promise<SearchResult> {
  console.log("Executing Brave search for:", query);
  
  // Process parameters and build URL
  const processedParams = processSearchParameters(options);
  const url = buildSearchUrl(query, processedParams);
  
  console.log("Brave Search URL:", url.toString());
  
  // Make the API request
  const response = await fetch(url.toString(), {
    headers: {
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip',
      'X-Subscription-Token': apiKey
    }
  });
  
  if (!response.ok) {
    throw new Error(`Brave Search API returned ${response.status}: ${await response.text()}`);
  }
  
  const data = await response.json();
  console.log("Received Brave search results");
  
  // Process the response
  return processSearchResults(data);
}

/**
 * Direct access function for Brave Web Search API
 * Can be imported and used without going through the agent
 * 
 * @param query Search query
 * @param options Search options
 * @param apiKey Brave Search API key
 * @returns Processed search results
 */
export async function braveWebSearch(
  query: string,
  options: SearchOptions,
  apiKey: string
): Promise<SearchResult> {
  return await searchWeb(query, options, apiKey);
}

export default searchWeb;
