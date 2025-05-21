# Brave Search Agent for Cloudflare Workers

A Cloudflare Workers AI agent that provides search capabilities using the Brave Search API. This agent can be interacted with via HTTP requests or WebSockets.

## Current Implementation Status

The agent is fully functional with robust parameter handling, type validation, and detailed performance logging. Recent improvements include:

- **Comprehensive Logging System**: Added detailed logging throughout the application with timing measurements for each step of the search process
- **Performance Metrics**: Implemented timing measurements for all API calls, data processing, and result merging operations
- **Type Validation Fixes**: Implemented automatic conversion between string parameters and their expected types (numbers, booleans, arrays)
- **Empty Value Handling**: Added special handling for empty values to prevent API validation errors
- **Parameter Filtering**: Improved parameter processing to ensure only valid values are sent to the Brave Search API

## Features

- Multiple search modes:
  - **Direct Search**: Standard web search using Brave Search API
  - **Optimized Search**: Enhanced search using query suggestions to improve results
  - **Agentic Search**: AI-powered search using Google's Gemini Pro model
- Get query suggestions from Brave Suggest API
- Detailed performance logging with timing information for each step
- Customize search parameters (count, safesearch, country, etc.)
- Maintain conversation history and recent searches
- User preference management
- Support for both HTTP and WebSocket interfaces
- Powered by Cloudflare Workers AI and Google's Gemini Pro

## Prerequisites

- [Node.js](https://nodejs.org/) (v16 or later)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) (v4 or later)
- A Cloudflare account
- A Brave Search API key (get one from [Brave Search API](https://brave.com/search/api/))
- A Brave Suggest API key (get one from [Brave Search API](https://brave.com/search/api/))
- A Google Gemini API key (for agentic search functionality)

## Setup

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/brave-search-agent.git
   cd brave-search-agent
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.dev.vars` file with your API keys:
   ```
   BRAVE_SEARCH_API_KEY=your_brave_search_api_key_here
   BRAVE_SUGGEST_API_KEY=your_brave_suggest_api_key_here
   GEMINI_API_KEY=your_google_gemini_api_key_here
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## Usage

### HTTP Endpoints

- **Direct Search**: `POST /agents/brave-search-agent/default/search`
  ```json
  {
    "query": "your search query",
    "options": {
      "safesearch": "moderate",
      "count": 10,
      "country": "US"
    }
  }
  ```

- **Optimized Search**: `POST /agents/brave-search-agent/default/optimized-search`
  ```json
  {
    "query": "your search query",
    "searchOptions": {
      "safesearch": "moderate",
      "count": 10,
      "country": "US"
    },
    "suggestOptions": {
      "count": 3,
      "country": "US"
    }
  }
  ```

- **Agentic Search**: `POST /agents/brave-search-agent/default/agentic-search`
  ```json
  {
    "query": "your search query",
    "preferences": {
      "safesearch": "moderate",
      "country": "US"
    }
  }
  ```

- **Suggest**: `POST /agents/brave-search-agent/default/suggest`
  ```json
  {
    "query": "your query prefix",
    "options": {
      "count": 5,
      "country": "US"
    }
  }
  ```

- **Get State**: `GET /agents/brave-search-agent/default/state`

- **Update Preferences**: `POST /agents/brave-search-agent/default/preferences`
  ```json
  {
    "safesearch": "strict",
    "count": 20,
    "country": "GB"
  }
  ```

- **Clear History**: `POST /agents/brave-search-agent/default/clear-history`

### Example curl Commands

- **Direct Search**:
  ```bash
  curl -X POST http://localhost:8787/agents/brave-search-agent/default/search \
    -H "Content-Type: application/json" \
    -d '{"query": "weather in San Francisco", "options": {"count": 10, "safesearch": "moderate"}}'
  ```

- **Optimized Search**:
  ```bash
  curl -X POST http://localhost:8787/agents/brave-search-agent/default/optimized-search \
    -H "Content-Type: application/json" \
    -d '{"query": "weather in San Francisco", "searchOptions": {"count": 10}, "suggestOptions": {"count": 3}}'
  ```

- **Agentic Search**:
  ```bash
  curl -X POST http://localhost:8787/agents/brave-search-agent/default/agentic-search \
    -H "Content-Type: application/json" \
    -d '{"query": "What are the best restaurants in New York City?"}'
  ```

- **Suggest**:
  ```bash
  curl -X POST http://localhost:8787/agents/brave-search-agent/default/suggest \
    -H "Content-Type: application/json" \
    -d '{"query": "weather in", "options": {"count": 5}}'
  ```

- **Get State**:
  ```bash
  curl -X GET http://localhost:8787/agents/brave-search-agent/default/state
  ```

- **Update Preferences**:
  ```bash
  curl -X POST http://localhost:8787/agents/brave-search-agent/default/preferences \
    -H "Content-Type: application/json" \
    -d '{"safesearch": "strict", "count": 20, "country": "GB"}'
  ```

- **Clear History**:
  ```bash
  curl -X POST http://localhost:8787/agents/brave-search-agent/default/clear-history
  ```

### WebSocket Interface

Connect to `/agents/brave-search/default` and send JSON messages:

- **Direct Search Request**:
  ```json
  {
    "type": "search_request",
    "query": "your search query",
    "options": {
      "safesearch": "moderate",
      "count": 10
    }
  }
  ```

- **Optimized Search Request**:
  ```json
  {
    "type": "optimized_search_request",
    "query": "your search query",
    "searchOptions": {
      "safesearch": "moderate",
      "count": 10
    },
    "suggestOptions": {
      "count": 3
    }
  }
  ```

- **Agentic Search Request**:
  ```json
  {
    "type": "agentic_search_request",
    "query": "What are the best restaurants in New York City?",
    "preferences": {
      "safesearch": "moderate"
    }
  }
  ```

- **Suggest Request**:
  ```json
  {
    "type": "suggest_request",
    "query": "weather in",
    "options": {
      "count": 5
    }
  }
  ```

- **Update Preferences**:
  ```json
  {
    "type": "update_preferences",
    "preferences": {
      "safesearch": "strict",
      "count": 20
    }
  }
  ```

- **Clear History**:
  ```json
  {
    "type": "clear_history"
  }
  ```

## Deployment

Deploy to Cloudflare Workers:

```bash
npm run deploy
```

Make sure to set your API keys in the Cloudflare Workers dashboard or via Wrangler secrets:

```bash
wrangler secret put BRAVE_SEARCH_API_KEY
wrangler secret put BRAVE_SUGGEST_API_KEY
wrangler secret put GEMINI_API_KEY
```

## Configuration

The agent's behavior can be customized by modifying the following:

- **Search Parameters**: Edit the `braveSearchSchema` in `src/types/index.ts` to add or modify search parameters.
- **Suggest Parameters**: Edit the `braveSuggestSchema` in `src/types/index.ts` to modify suggestion parameters.
- **System Prompt**: Modify the `SYSTEM_PROMPT` in `src/config/index.ts` to change how the AI responds to queries.
- **Default Preferences**: Update the `INITIAL_STATE` object in `src/config/index.ts` to change default search preferences.
- **Logging Format**: Modify the logging prefixes and formats in the various files to customize the logging output.

## Performance Logging

The agent now includes comprehensive performance logging throughout the codebase:

### Logging Format

All logs follow a consistent format with prefixes to indicate the type of log:

- `[TIMING]`: Logs execution time for specific operations
- `[SEARCH]`: Logs search-related information
- `[BRAVE_SEARCH]`: Logs information about Brave Search API calls
- `[BRAVE_SUGGEST]`: Logs information about Brave Suggest API calls
- `[MERGE]`: Logs information about result merging operations
- `[AGENTIC]`: Logs information about AI-powered search operations
- `[ERROR]`: Logs error information

### Example Log Output

```
[SEARCH] Direct search started for: "weather in San Francisco"
[SEARCH] Direct search options: {"count":10,"safesearch":"moderate"}
[TIMING] Direct search - Update history: 5ms
[BRAVE_SEARCH] Search started for: "weather in San Francisco"
[BRAVE_SEARCH] Search options: {"count":10,"safesearch":"moderate"}
[TIMING] Brave search - Process parameters: 2ms
[TIMING] Brave search - Build URL: 1ms
[BRAVE_SEARCH] URL: https://api.search.brave.com/res/v1/web/search?q=weather%20in%20San%20Francisco&count=10&safesearch=moderate
[TIMING] Brave search - Fetch request: 320ms
[TIMING] Brave search - Parse JSON: 15ms
[TIMING] Brave search - Process results: 8ms
[TIMING] Brave search - Total execution time: 346ms
[BRAVE_SEARCH] Results: 10 web results, 10 total results
[TIMING] Direct search - API call: 350ms
[TIMING] Direct search - Total execution time: 360ms
[SEARCH] Direct search results: 10 web results, 10 total results
```

### Type Validation and Parameter Handling

The agent includes robust type validation and parameter handling to ensure compatibility with various client implementations:

#### Parameter Processing

The parameter processing utilities ensure that all parameters are correctly formatted before being sent to the Brave Search API:

```typescript
// Process parameters and build URL
const paramsStartTime = Date.now();
const processedParams = processSearchParameters(options);
const paramsEndTime = Date.now();
console.log(`[TIMING] Brave search - Process parameters: ${paramsEndTime - paramsStartTime}ms`);
```

These implementations ensure that the agent can handle parameters passed as strings (common in HTTP requests and JSON) while still validating them against the expected types.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
