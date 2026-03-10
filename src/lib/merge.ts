import type { SearchResult } from "../types";

export interface MergedSearchResult extends SearchResult {
  sources: string[];
}

export function mergeResults(results: SearchResult[]): MergedSearchResult {
  if (results.length === 0) {
    return {
      query: "",
      totalResults: 0,
      webResults: [],
      newsResults: [],
      videoResults: [],
      faqResults: [],
      discussionResults: [],
      locationsResults: [],
      infobox: null,
      summary: null,
      sources: [],
    };
  }

  const seenUrls = new Set<string>();
  const sources: string[] = [];

  const merged: MergedSearchResult = {
    query: results[0].query,
    alteredQuery: results[0].alteredQuery,
    totalResults: 0,
    webResults: [],
    newsResults: [],
    videoResults: [],
    faqResults: [],
    discussionResults: [],
    locationsResults: results[0].locationsResults,
    infobox: results[0].infobox,
    summary: results[0].summary,
    sources: [],
  };

  function addIfNew<T extends { url: string }>(
    items: T[],
    target: T[]
  ): void {
    for (const item of items) {
      if (!seenUrls.has(item.url)) {
        seenUrls.add(item.url);
        sources.push(item.url);
        target.push(item);
      }
    }
  }

  for (const result of results) {
    addIfNew(result.webResults, merged.webResults);
    addIfNew(result.newsResults, merged.newsResults);
    addIfNew(result.videoResults, merged.videoResults);
    addIfNew(result.faqResults, merged.faqResults);
    addIfNew(result.discussionResults, merged.discussionResults);
  }

  merged.totalResults =
    merged.webResults.length +
    merged.newsResults.length +
    merged.videoResults.length +
    merged.faqResults.length +
    merged.discussionResults.length +
    merged.locationsResults.length;

  merged.sources = sources;
  return merged;
}
