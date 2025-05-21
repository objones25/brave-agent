import { SearchResult } from "../types";

/**
 * Process and format the search results to make them more usable for the AI
 * 
 * @param data Raw search results from the Brave Search API
 * @returns Processed search results
 */
export function processSearchResults(data: any): SearchResult {
  try {
    const processed: SearchResult = {
      query: data.query?.original,
      alteredQuery: data.query?.altered,
      totalResults: 0,
      webResults: [],
      newsResults: [],
      videoResults: [],
      faqResults: [],
      discussionResults: [],
      locationsResults: [],
      infobox: null,
      summary: null,
    };
    
    // Extract web results
    if (data.web?.results) {
      processed.webResults = data.web.results.map((result: any) => ({
        title: result.title,
        url: result.url,
        description: result.description,
        source: result.meta_url?.hostname || new URL(result.url).hostname,
        extraSnippets: result.extra_snippets || [],
        age: result.age || null
      }));
      processed.totalResults += processed.webResults.length;
    }
    
    // Extract news results
    if (data.news?.results) {
      processed.newsResults = data.news.results.map((result: any) => ({
        title: result.title,
        url: result.url,
        description: result.description,
        source: result.source || result.meta_url?.hostname || new URL(result.url).hostname,
        age: result.age || null,
        isBreaking: result.breaking || false
      }));
      processed.totalResults += processed.newsResults.length;
    }
    
    // Extract video results
    if (data.videos?.results) {
      processed.videoResults = data.videos.results.map((result: any) => ({
        title: result.title,
        url: result.url,
        description: result.description,
        source: result.meta_url?.hostname || new URL(result.url).hostname,
        duration: result.video?.duration || null,
        thumbnail: result.thumbnail?.src || null
      }));
      processed.totalResults += processed.videoResults.length;
    }
    
    // Extract FAQ results
    if (data.faq?.results) {
      processed.faqResults = data.faq.results.map((result: any) => ({
        question: result.question,
        answer: result.answer,
        title: result.title,
        url: result.url,
        source: result.meta_url?.hostname || new URL(result.url).hostname
      }));
      processed.totalResults += processed.faqResults.length;
    }
    
    // Extract discussion results
    if (data.discussions?.results) {
      processed.discussionResults = data.discussions.results.map((result: any) => ({
        title: result.title,
        url: result.url,
        description: result.description,
        forumName: result.data?.forum_name || null,
        numAnswers: result.data?.num_answers || 0,
        score: result.data?.score || null,
        question: result.data?.question || null,
        topComment: result.data?.top_comment || null
      }));
      processed.totalResults += processed.discussionResults.length;
    }
    
    // Extract locations results
    if (data.locations?.results) {
      processed.locationsResults = data.locations.results.map((result: any) => ({
        title: result.title,
        id: result.id,
        coordinates: result.coordinates || null,
        address: result.postal_address?.displayAddress || null,
        categories: result.categories || [],
        rating: result.rating?.ratingValue || null,
        reviewCount: result.rating?.reviewCount || null,
        distance: result.distance ? `${result.distance.value} ${result.distance.units}` : null
      }));
      processed.totalResults += processed.locationsResults.length;
    }
    
    // Extract infobox if available
    if (data.infobox?.results) {
      processed.infobox = {
        type: data.infobox.results.subtype || 'generic',
        title: data.infobox.results.title || data.infobox.results.label,
        description: data.infobox.results.long_desc || '',
        attributes: data.infobox.results.attributes || [],
        thumbnail: data.infobox.results.thumbnail?.src || null
      };
    }
    
    // Extract summary if available
    if (data.summarizer?.key) {
      processed.summary = {
        key: data.summarizer.key
      };
    }
    
    return processed;
  } catch (error) {
    console.error("Error processing search results:", error);
    return {
      query: data.query?.original || "",
      totalResults: 0,
      webResults: [],
      newsResults: [],
      videoResults: [],
      faqResults: [],
      discussionResults: [],
      locationsResults: [],
      infobox: null,
      summary: null
    };
  }
}
