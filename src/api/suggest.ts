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
  const startTime = Date.now();
  console.log(`[BRAVE_SUGGEST] Suggest started for: "${query}"`);
  console.log(`[BRAVE_SUGGEST] Suggest options: ${JSON.stringify(options)}`);
  
  // Process parameters and build URL
  const paramsStartTime = Date.now();
  const processedParams = processSuggestParameters(options);
  const paramsEndTime = Date.now();
  console.log(`[TIMING] Brave suggest - Process parameters: ${paramsEndTime - paramsStartTime}ms`);
  
  const urlStartTime = Date.now();
  const url = buildSuggestUrl(query, processedParams);
  const urlEndTime = Date.now();
  console.log(`[TIMING] Brave suggest - Build URL: ${urlEndTime - urlStartTime}ms`);
  console.log(`[BRAVE_SUGGEST] URL: ${url.toString()}`);
  
  try {
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
    console.log(`[TIMING] Brave suggest - Fetch request: ${fetchEndTime - fetchStartTime}ms`);
    
    if (!response.ok) {
      const responseText = await response.text();
      console.error(`[ERROR] Brave Suggest API error (${response.status}):`, responseText.substring(0, 100));
      throw new Error(`Brave Suggest API returned ${response.status}: ${responseText.substring(0, 100)}`);
    }
    
    // Get the response text first to check if it's valid JSON
    const textStartTime = Date.now();
    const responseText = await response.text();
    const textEndTime = Date.now();
    console.log(`[TIMING] Brave suggest - Get response text: ${textEndTime - textStartTime}ms`);
    
    // Try to parse the response as JSON
    const parseStartTime = Date.now();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e: unknown) {
      const error = e as Error;
      console.error("[ERROR] Failed to parse Suggest API response as JSON:", error.message);
      console.error("[ERROR] Response text (first 100 chars):", responseText.substring(0, 100));
      
      const parseEndTime = Date.now();
      console.log(`[TIMING] Brave suggest - Parse JSON (failed): ${parseEndTime - parseStartTime}ms`);
      
      const endTime = Date.now();
      const totalDuration = endTime - startTime;
      console.log(`[TIMING] Brave suggest - Total execution time (with error): ${totalDuration}ms`);
      
      // Return a default response instead of throwing
      return {
        type: 'suggest',
        query: { original: query },
        results: []
      };
    }
    const parseEndTime = Date.now();
    console.log(`[TIMING] Brave suggest - Parse JSON: ${parseEndTime - parseStartTime}ms`);
    
    // Validate the response structure
    const validateStartTime = Date.now();
    if (!data.type || !data.query || !Array.isArray(data.results)) {
      console.warn("[WARN] Suggest API response doesn't match expected format, creating default response");
      
      const validateEndTime = Date.now();
      console.log(`[TIMING] Brave suggest - Validate response (failed): ${validateEndTime - validateStartTime}ms`);
      
      const endTime = Date.now();
      const totalDuration = endTime - startTime;
      console.log(`[TIMING] Brave suggest - Total execution time (with invalid format): ${totalDuration}ms`);
      
      return {
        type: 'suggest',
        query: { original: query },
        results: []
      };
    }
    const validateEndTime = Date.now();
    console.log(`[TIMING] Brave suggest - Validate response: ${validateEndTime - validateStartTime}ms`);
    
    const endTime = Date.now();
    const totalDuration = endTime - startTime;
    console.log(`[TIMING] Brave suggest - Total execution time: ${totalDuration}ms`);
    console.log(`[BRAVE_SUGGEST] Results: ${data.results?.length || 0} suggestions`);
    
    return data as SuggestResponse;
  } catch (error: unknown) {
    const endTime = Date.now();
    const totalDuration = endTime - startTime;
    console.error(`[ERROR] Brave suggest failed after ${totalDuration}ms:`, error instanceof Error ? error.message : String(error));
    
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
