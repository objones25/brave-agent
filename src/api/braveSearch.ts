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
  const startTime = Date.now();
  console.log(`[BRAVE_SEARCH] Search started for: "${query}"`);
  console.log(`[BRAVE_SEARCH] Search options: ${JSON.stringify(options)}`);
  
  try {
    // Process parameters and build URL
    const paramsStartTime = Date.now();
    const processedParams = processSearchParameters(options);
    const paramsEndTime = Date.now();
    console.log(`[TIMING] Brave search - Process parameters: ${paramsEndTime - paramsStartTime}ms`);
    
    const urlStartTime = Date.now();
    const url = buildSearchUrl(query, processedParams);
    const urlEndTime = Date.now();
    console.log(`[TIMING] Brave search - Build URL: ${urlEndTime - urlStartTime}ms`);
    console.log(`[BRAVE_SEARCH] URL: ${url.toString()}`);
    
    // Make the API request
    const fetchStartTime = Date.now();
    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': apiKey
      }
    });
    const fetchEndTime = Date.now();
    console.log(`[TIMING] Brave search - Fetch request: ${fetchEndTime - fetchStartTime}ms`);
    
    if (!response.ok) {
      throw new Error(`Brave Search API returned ${response.status}: ${await response.text()}`);
    }
    
    const jsonStartTime = Date.now();
    const data = await response.json();
    const jsonEndTime = Date.now();
    console.log(`[TIMING] Brave search - Parse JSON: ${jsonEndTime - jsonStartTime}ms`);
    
    // Process the response
    const processStartTime = Date.now();
    const result = processSearchResults(data);
    const processEndTime = Date.now();
    console.log(`[TIMING] Brave search - Process results: ${processEndTime - processStartTime}ms`);
    
    const endTime = Date.now();
    const totalDuration = endTime - startTime;
    console.log(`[TIMING] Brave search - Total execution time: ${totalDuration}ms`);
    console.log(`[BRAVE_SEARCH] Results: ${result.webResults.length} web results, ${result.totalResults} total results`);
    
    return result;
  } catch (error) {
    const endTime = Date.now();
    const totalDuration = endTime - startTime;
    console.error(`[ERROR] Brave search failed after ${totalDuration}ms:`, error);
    throw error;
  }
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
