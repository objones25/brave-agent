import type {
  SearchOptions,
  SearchResult,
  WebResult,
  NewsResult,
  VideoResult,
  FaqResult,
  DiscussionResult,
  LocationResult,
  InfoboxAttribute,
  InfoboxResult,
  RawWebResult,
  RawNewsResult,
  RawVideoResult,
  RawFaqResult,
  RawDiscussionResult,
  RawLocationResult,
} from "../types";

const BRAVE_SEARCH_ENDPOINT = "https://api.search.brave.com/res/v1/web/search";

// ── URL Building ──────────────────────────────────────────────────────────────

type ParamValue = string | number | boolean | string[] | undefined;

function buildUrl(
  base: string,
  params: Record<string, ParamValue>
): string {
  const url = new URL(base);
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      for (const v of value) url.searchParams.append(key, v);
    } else if (typeof value === "boolean") {
      url.searchParams.set(key, value ? "1" : "0");
    } else if (value !== "") {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

// ── Type Guards ───────────────────────────────────────────────────────────────

function isObject(val: unknown): val is Record<string, unknown> {
  return typeof val === "object" && val !== null;
}

function str(val: unknown): string {
  return typeof val === "string" ? val : "";
}

function optStr(val: unknown): string | undefined {
  return typeof val === "string" && val !== "" ? val : undefined;
}

function hostname(result: { url?: unknown; meta_url?: { hostname?: unknown } }): string {
  if (isObject(result.meta_url) && typeof result.meta_url.hostname === "string") {
    return result.meta_url.hostname;
  }
  const url = str(result.url);
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

// ── Response Processing ───────────────────────────────────────────────────────

function processWebResults(raw: unknown): WebResult[] {
  if (!isObject(raw) || !Array.isArray(raw["results"])) return [];
  return raw["results"]
    .filter((r): r is RawWebResult => isObject(r))
    .map((r) => ({
      title: str(r.title),
      url: str(r.url),
      description: str(r.description),
      source: hostname(r),
      extraSnippets: Array.isArray(r.extra_snippets)
        ? r.extra_snippets.filter((s): s is string => typeof s === "string")
        : undefined,
      age: optStr(r.age),
    }));
}

function processNewsResults(raw: unknown): NewsResult[] {
  if (!isObject(raw) || !Array.isArray(raw["results"])) return [];
  return raw["results"]
    .filter((r): r is RawNewsResult => isObject(r))
    .map((r) => ({
      title: str(r.title),
      url: str(r.url),
      description: str(r.description),
      source: typeof r.source === "string" ? r.source : hostname(r),
      age: optStr(r.age),
      isBreaking: r.breaking === true,
    }));
}

function processVideoResults(raw: unknown): VideoResult[] {
  if (!isObject(raw) || !Array.isArray(raw["results"])) return [];
  return raw["results"]
    .filter((r): r is RawVideoResult => isObject(r))
    .map((r) => ({
      title: str(r.title),
      url: str(r.url),
      description: str(r.description),
      source: hostname(r),
      duration: isObject(r.video) ? optStr(r.video.duration) : undefined,
      thumbnail: isObject(r.thumbnail) ? optStr(r.thumbnail.src) : undefined,
    }));
}

function processFaqResults(raw: unknown): FaqResult[] {
  if (!isObject(raw) || !Array.isArray(raw["results"])) return [];
  return raw["results"]
    .filter((r): r is RawFaqResult => isObject(r))
    .map((r) => ({
      question: str(r.question),
      answer: str(r.answer),
      title: str(r.title),
      url: str(r.url),
      source: hostname(r),
    }));
}

function processDiscussionResults(raw: unknown): DiscussionResult[] {
  if (!isObject(raw) || !Array.isArray(raw["results"])) return [];
  return raw["results"]
    .filter((r): r is RawDiscussionResult => isObject(r))
    .map((r) => ({
      title: str(r.title),
      url: str(r.url),
      description: str(r.description),
      forumName: isObject(r.data) ? optStr(r.data.forum_name) : undefined,
      numAnswers:
        isObject(r.data) && typeof r.data.num_answers === "number"
          ? r.data.num_answers
          : 0,
      score:
        isObject(r.data) && typeof r.data.score === "number"
          ? r.data.score
          : undefined,
      question: isObject(r.data) ? optStr(r.data.question) : undefined,
      topComment: isObject(r.data) ? optStr(r.data.top_comment) : undefined,
    }));
}

function processLocationResults(raw: unknown): LocationResult[] {
  if (!isObject(raw) || !Array.isArray(raw["results"])) return [];
  return raw["results"]
    .filter((r): r is RawLocationResult => isObject(r))
    .map((r) => {
      const coords =
        isObject(r.coordinates) &&
        typeof r.coordinates.lat === "number" &&
        typeof r.coordinates.lng === "number"
          ? { lat: r.coordinates.lat, lng: r.coordinates.lng }
          : undefined;

      const rating = isObject(r.rating) ? r.rating : undefined;

      return {
        title: str(r.title),
        id: str(r.id),
        coordinates: coords,
        address:
          isObject(r.postal_address)
            ? optStr(r.postal_address.displayAddress)
            : undefined,
        categories: Array.isArray(r.categories)
          ? r.categories.filter((c): c is string => typeof c === "string")
          : [],
        rating:
          rating && typeof rating.ratingValue === "number"
            ? rating.ratingValue
            : undefined,
        reviewCount:
          rating && typeof rating.reviewCount === "number"
            ? rating.reviewCount
            : undefined,
        distance:
          isObject(r.distance) &&
          typeof r.distance.value === "number" &&
          typeof r.distance.units === "string"
            ? `${r.distance.value} ${r.distance.units}`
            : undefined,
      };
    });
}

function processInfobox(raw: unknown): InfoboxResult | null {
  if (!isObject(raw)) return null;
  const resultsArr = raw["results"];
  const results = Array.isArray(resultsArr) ? resultsArr[0] : resultsArr;
  if (!isObject(results)) return null;

  const rawAttrs = Array.isArray(results["attributes"])
    ? results["attributes"]
    : [];
  const attributes: InfoboxAttribute[] = rawAttrs
    .filter(isObject)
    .map((a) => ({
      label: str(a["label"]),
      value: str(a["value"]),
    }));

  return {
    type: str(results["subtype"]) || "generic",
    title: str(results["title"]) || str(results["label"]),
    description: str(results["long_desc"]),
    attributes,
    thumbnail: isObject(results["thumbnail"])
      ? optStr(results["thumbnail"]["src"])
      : undefined,
  };
}

function processSearchResponse(data: unknown): SearchResult {
  if (!isObject(data)) {
    return emptyResult("");
  }

  const query = isObject(data["query"])
    ? { original: str(data["query"]["original"]), altered: optStr(data["query"]["altered"]) }
    : { original: "", altered: undefined };

  const webResults = processWebResults(data["web"]);
  const newsResults = processNewsResults(data["news"]);
  const videoResults = processVideoResults(data["videos"]);
  const faqResults = processFaqResults(data["faq"]);
  const discussionResults = processDiscussionResults(data["discussions"]);
  const locationsResults = processLocationResults(data["locations"]);
  const infobox = processInfobox(data["infobox"]);

  const summary =
    isObject(data["summarizer"]) &&
    typeof data["summarizer"]["key"] === "string"
      ? { key: data["summarizer"]["key"] }
      : null;

  const totalResults =
    webResults.length +
    newsResults.length +
    videoResults.length +
    faqResults.length +
    discussionResults.length +
    locationsResults.length;

  return {
    query: query.original,
    alteredQuery: query.altered,
    totalResults,
    webResults,
    newsResults,
    videoResults,
    faqResults,
    discussionResults,
    locationsResults,
    infobox,
    summary,
  };
}

function emptyResult(query: string): SearchResult {
  return {
    query,
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
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function braveSearch(
  query: string,
  options: SearchOptions,
  apiKey: string
): Promise<SearchResult> {
  const url = buildUrl(BRAVE_SEARCH_ENDPOINT, {
    q: query,
    count: options.count,
    offset: options.offset,
    country: options.country,
    search_lang: options.search_lang,
    safesearch: options.safesearch,
    freshness: options.freshness,
    text_decorations: options.text_decorations,
    spellcheck: options.spellcheck,
    result_filter: options.result_filter,
    goggles_id: options.goggles_id,
    goggles: options.goggles,
    units: options.units,
    extra_snippets: options.extra_snippets,
    summary: options.summary,
    ui_lang: options.ui_lang,
    enable_rich_callback: options.enable_rich_callback,
    include_fetch_metadata: options.include_fetch_metadata,
    operators: options.operators,
  });

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip",
      "X-Subscription-Token": apiKey,
    },
  });

  if (!response.ok) {
    throw new Error(`Brave Search API error ${response.status}: ${await response.text()}`);
  }

  const data: unknown = await response.json();
  return processSearchResponse(data);
}
