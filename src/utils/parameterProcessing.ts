import { SearchOptions, SuggestOptions } from "../types";
import { INITIAL_STATE, BRAVE_SEARCH_API_ENDPOINT, BRAVE_SUGGEST_API_ENDPOINT } from "../config";

/**
 * Processes and normalizes search parameters
 * 
 * @param params Raw parameters from the request
 * @param preferences User preferences to use as defaults
 * @returns Processed parameters
 */
export function processSearchParameters(
  params: Record<string, any>,
  preferences = INITIAL_STATE.preferences
): SearchOptions {
  const processedParams: SearchOptions = { ...params };
  
  // Convert string numbers to actual numbers
  if (typeof processedParams.count === 'string') {
    processedParams.count = parseInt(processedParams.count, 10);
  }
  if (typeof processedParams.offset === 'string') {
    processedParams.offset = parseInt(processedParams.offset, 10);
  }
  
  // Convert string booleans to actual booleans
  const booleanParams = ['text_decorations', 'spellcheck', 'extra_snippets', 'summary'] as const;
  for (const param of booleanParams) {
    const value = processedParams[param];
    if (typeof value === 'string') {
      if (value === 'true') {
        processedParams[param] = true as any;
      } else if (value === 'false') {
        processedParams[param] = false as any;
      }
    }
  }
  
  // Apply preferences as defaults if not explicitly provided
  if (processedParams.count === undefined && preferences.count) {
    processedParams.count = preferences.count;
  }
  if (processedParams.safesearch === undefined && preferences.safesearch) {
    processedParams.safesearch = preferences.safesearch;
  }
  if (processedParams.country === undefined && preferences.country) {
    processedParams.country = preferences.country;
  }
  if (processedParams.text_decorations === undefined && preferences.text_decorations !== undefined) {
    processedParams.text_decorations = preferences.text_decorations;
  }
  if (processedParams.spellcheck === undefined && preferences.spellcheck !== undefined) {
    processedParams.spellcheck = preferences.spellcheck;
  }
  if (processedParams.extra_snippets === undefined && preferences.extra_snippets !== undefined) {
    processedParams.extra_snippets = preferences.extra_snippets;
  }
  if (processedParams.summary === undefined && preferences.summary !== undefined) {
    processedParams.summary = preferences.summary;
  }
  if (processedParams.units === undefined && preferences.units) {
    processedParams.units = preferences.units;
  }
  if (processedParams.result_filter === undefined && preferences.result_filter) {
    processedParams.result_filter = preferences.result_filter;
  }
  
  return processedParams;
}

/**
 * Processes and normalizes suggest parameters
 * 
 * @param params Raw parameters from the request
 * @returns Processed parameters
 */
export function processSuggestParameters(params: Record<string, any>): SuggestOptions {
  const processedParams: SuggestOptions = { ...params };
  
  // Convert string numbers to actual numbers
  if (typeof processedParams.count === 'string') {
    processedParams.count = parseInt(processedParams.count, 10);
  }
  
  // Convert string booleans to actual booleans
  if (typeof processedParams.rich === 'string') {
    if (processedParams.rich === 'true') {
      processedParams.rich = true;
    } else if (processedParams.rich === 'false') {
      processedParams.rich = false;
    }
  }
  
  return processedParams;
}

/**
 * Builds URL search parameters for the Brave Search API
 * 
 * @param query Search query
 * @param options Search options
 * @returns URL with search parameters
 */
export function buildSearchUrl(query: string, options: SearchOptions): URL {
  const url = new URL(BRAVE_SEARCH_API_ENDPOINT);
  url.searchParams.append('q', query);
  
  // Add parameters
  for (const [key, value] of Object.entries(options)) {
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
  
  return url;
}

/**
 * Builds URL search parameters for the Brave Suggest API
 * 
 * @param query Search query
 * @param options Suggest options
 * @returns URL with search parameters
 */
export function buildSuggestUrl(query: string, options: SuggestOptions): URL {
  const url = new URL(BRAVE_SUGGEST_API_ENDPOINT);
  url.searchParams.append('q', query);
  
  // Add optional parameters
  if (options.country) {
    url.searchParams.append('country', options.country);
  }
  
  if (options.lang) {
    url.searchParams.append('lang', options.lang);
  }
  
  if (options.count !== undefined) {
    url.searchParams.append('count', options.count.toString());
  }
  
  if (options.rich !== undefined) {
    url.searchParams.append('rich', options.rich ? '1' : '0');
  }
  
  return url;
}
