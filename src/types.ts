// Brave Search API Types

// Request Parameters
export interface BraveWebSearchParams {
  q: string;                  // Required: The user's search query term
  country?: string;           // Optional: The search query country (2-letter code)
  search_lang?: string;       // Optional: The search language preference
  ui_lang?: string;           // Optional: User interface language preferred in response
  count?: number;             // Optional: Number of search results (max 20)
  offset?: number;            // Optional: Zero-based offset for pagination
  safesearch?: string;        // Optional: Filter for adult content ('off', 'moderate', 'strict')
  freshness?: string;         // Optional: Filter by discovery time
  text_decorations?: boolean; // Optional: Whether to include decoration markers
  spellcheck?: boolean;       // Optional: Whether to spellcheck the query
  result_filter?: string;     // Optional: Comma-delimited string of result types
  goggles?: string[];         // Optional: Custom re-ranking on top of Brave's search index
  units?: string;             // Optional: Measurement units ('metric', 'imperial')
  extra_snippets?: boolean;   // Optional: Get additional snippets
  summary?: boolean;          // Optional: Enable summary key generation
}

// Response Types
export interface WebSearchApiResponse {
  type: "search";
  discussions?: Discussions;
  faq?: FAQ;
  infobox?: GraphInfobox;
  locations?: Locations;
  mixed?: MixedResponse;
  news?: News;
  query?: Query;
  videos?: Videos;
  web?: Search;
  summarizer?: Summarizer;
  rich?: RichCallbackInfo;
}

export interface Query {
  original: string;
  show_strict_warning?: boolean;
  altered?: string;
  safesearch?: boolean;
  is_navigational?: boolean;
  is_geolocal?: boolean;
  local_decision?: string;
  local_locations_idx?: number;
  is_trending?: boolean;
  is_news_breaking?: boolean;
  ask_for_location?: boolean;
  language?: Language;
  spellcheck_off?: boolean;
  country?: string;
  bad_results?: boolean;
  should_fallback?: boolean;
  lat?: string;
  long?: string;
  postal_code?: string;
  city?: string;
  state?: string;
  header_country?: string;
  more_results_available?: boolean;
  custom_location_label?: string;
  reddit_cluster?: string;
}

export interface Language {
  main: string;
}

export interface Search {
  type: "search";
  results: SearchResult[];
  family_friendly: boolean;
}

export interface SearchResult {
  type: "search_result";
  subtype: "generic";
  is_live: boolean;
  deep_results?: DeepResult;
  schemas?: any[][];
  meta_url?: MetaUrl;
  thumbnail?: Thumbnail;
  age?: string;
  language: string;
  location?: LocationResult;
  video?: VideoData;
  movie?: MovieData;
  faq?: FAQ;
  qa?: QAPage;
  book?: Book;
  rating?: Rating;
  article?: Article;
  product?: ProductReview;
  product_cluster?: ProductReview[];
  cluster_type?: string;
  cluster?: Result[];
  creative_work?: CreativeWork;
  music_recording?: MusicRecording;
  review?: Review;
  software?: Software;
  recipe?: Recipe;
  organization?: Organization;
  content_type?: string;
  extra_snippets?: string[];
  title: string;
  url: string;
  is_source_local: boolean;
  is_source_both: boolean;
  description?: string;
  page_age?: string;
  page_fetched?: string;
  profile?: Profile;
  family_friendly: boolean;
}

export interface Result {
  title: string;
  url: string;
  is_source_local: boolean;
  is_source_both: boolean;
  description?: string;
  page_age?: string;
  page_fetched?: string;
  profile?: Profile;
  language?: string;
  family_friendly: boolean;
}

export interface MetaUrl {
  scheme: string;
  netloc: string;
  hostname?: string;
  favicon: string;
  path: string;
}

export interface Thumbnail {
  src: string;
  original?: string;
}

export interface DeepResult {
  news?: NewsResult[];
  buttons?: ButtonResult[];
  videos?: VideoResult[];
  images?: Image[];
}

// Simplified types for other response objects
export interface Discussions {
  type: "search";
  results: any[];
  mutated_by_goggles: boolean;
}

export interface FAQ {
  type: "faq";
  results: QA[];
}

export interface QA {
  question: string;
  answer: string;
  title: string;
  url: string;
  meta_url?: MetaUrl;
}

export interface GraphInfobox {
  type: "graph";
  results: any;
}

export interface Locations {
  type: "locations";
  results: LocationResult[];
}

export interface LocationResult extends Result {
  type: "location_result";
  id?: string;
  provider_url: string;
  coordinates?: number[];
  zoom_level: number;
  thumbnail?: Thumbnail;
  postal_address?: any;
  opening_hours?: any;
  contact?: any;
  price_range?: string;
  rating?: Rating;
  distance?: any;
  profiles?: any[];
  reviews?: any;
  pictures?: any;
  action?: any;
  serves_cuisine?: string[];
  categories?: string[];
  icon_category?: string;
  results?: any;
  timezone?: string;
  timezone_offset?: string;
}

export interface MixedResponse {
  type: "mixed";
  main?: ResultReference[];
  top?: ResultReference[];
  side?: ResultReference[];
}

export interface ResultReference {
  type: string;
  index?: number;
  all: boolean;
}

export interface News {
  type: "news";
  results: NewsResult[];
  mutated_by_goggles?: boolean;
}

export interface NewsResult extends Result {
  meta_url?: MetaUrl;
  source?: string;
  breaking: boolean;
  is_live: boolean;
  thumbnail?: Thumbnail;
  age?: string;
  extra_snippets?: string[];
}

export interface Videos {
  type: "videos";
  results: VideoResult[];
  mutated_by_goggles?: boolean;
}

export interface VideoResult extends Result {
  type: "video_result";
  video: VideoData;
  meta_url?: MetaUrl;
  thumbnail?: Thumbnail;
  age?: string;
}

export interface MovieData {
  name?: string;
  description?: string;
  url?: string;
  thumbnail?: Thumbnail;
  release?: string;
  directors?: Person[];
  actors?: Person[];
  rating?: Rating;
  duration?: string;
  genre?: string[];
  query?: string;
}

export interface Person {
  type: "person";
  name: string;
  url?: string;
  thumbnail?: Thumbnail;
}

export interface VideoData {
  duration?: string;
  views?: string;
  creator?: string;
  publisher?: string;
  thumbnail?: Thumbnail;
  tags?: string[];
  author?: Profile;
  requires_subscription?: boolean;
}

export interface ButtonResult {
  type: "button_result";
  title: string;
  url: string;
}

export interface Image {
  thumbnail: Thumbnail;
  url?: string;
  properties?: any;
}

export interface QAPage {
  question: string;
  answer: any;
}

export interface Book {
  title: string;
  author: any[];
  date?: string;
  price?: any;
  pages?: number;
  publisher?: any;
  rating?: Rating;
}

export interface Rating {
  ratingValue: number;
  bestRating: number;
  reviewCount?: number;
  profile?: Profile;
  is_tripadvisor: boolean;
}

export interface Profile {
  name: string;
  long_name: string;
  url?: string;
  img?: string;
}

export interface Article {
  author?: any[];
  date?: string;
  publisher?: any;
  thumbnail?: Thumbnail;
  isAccessibleForFree?: boolean;
}

export interface ProductReview {
  // Simplified for brevity
  type: "Product";
  name: string;
  category?: string;
  price: string;
  thumbnail: Thumbnail;
  description?: string;
  offers?: any[];
  rating?: Rating;
}

export interface CreativeWork {
  name: string;
  thumbnail: Thumbnail;
  rating?: Rating;
}

export interface MusicRecording {
  name: string;
  thumbnail?: Thumbnail;
  rating?: Rating;
}

export interface Review {
  type: "review";
  name: string;
  thumbnail: Thumbnail;
  description: string;
  rating: Rating;
}

export interface Software {
  name?: string;
  author?: string;
  version?: string;
  codeRepository?: string;
  homepage?: string;
  datePublisher?: string;
  is_npm?: boolean;
  is_pypi?: boolean;
  stars?: number;
  forks?: number;
  ProgrammingLanguage?: string;
}

export interface Recipe {
  title: string;
  description: string;
  thumbnail: Thumbnail;
  url: string;
  domain: string;
  favicon: string;
  time?: string;
  prep_time?: string;
  cook_time?: string;
  ingredients?: string;
  instructions?: any[];
  servings?: number;
  calories?: number;
  rating?: Rating;
  recipeCategory?: string;
  recipeCuisine?: string;
  video?: VideoData;
}

export interface Organization {
  type: "organization";
  contact_points?: any[];
}

export interface Summarizer {
  type: "summarizer";
  key: string;
}

export interface RichCallbackInfo {
  type: "rich";
  hint?: any;
}

// Function Calling Types
export interface BraveWebSearchFunctionArgs {
  query: string;
  count?: number;
  country?: string;
  search_lang?: string;
  safesearch?: string;
  freshness?: string;
  result_filter?: string;
}

export interface BraveSearchFunctionResponse {
  results: SearchResultSummary[];
  query: {
    original: string;
    altered?: string;
  };
  total_count: number;
}

export interface SearchResultSummary {
  title: string;
  url: string;
  description: string;
  favicon?: string;
  age?: string;
  extra_snippets?: string[];
}

// Agent Communication Types
export interface BraveSearchRequest {
  query: string;
  options?: Partial<BraveWebSearchParams>;
}

export interface BraveSearchResponse {
  results: SearchResultSummary[];
  query: {
    original: string;
    altered?: string;
  };
  total_count: number;
  raw_response?: WebSearchApiResponse;
}
