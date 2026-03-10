# Brave Search Agent

A Cloudflare Workers API that provides multiple search modes powered by the Brave Search API and Google Gemini 3.1 Flash-Lite.

## Endpoints

All endpoints accept `POST` requests with a JSON body.

### `POST /search`

Standard web search.

```json
{
  "query": "your search query",
  "options": {
    "count": 10,
    "safesearch": "moderate",
    "country": "US",
    "result_filter": "web,news"
  }
}
```

### `POST /optimized`

AI-optimized search. Uses Gemini to rewrite the query and generate alternative queries, then fans out multiple searches and merges the results.

```json
{
  "query": "your search query",
  "options": {
    "count": 10,
    "safesearch": "moderate"
  }
}
```

### `POST /agentic`

Agentic search. Gemini autonomously decides what to search for, calls Brave Search as a tool (up to 5 times), and synthesizes a final answer with citations. Uses Gemini 3's thought signatures to maintain reasoning context across multi-turn function calls.

```json
{
  "query": "your search query"
}
```

### `POST /ai`

Single-shot AI search. Runs a standard search and passes results to Gemini for synthesis.

```json
{
  "query": "your search query",
  "options": {
    "count": 10,
    "safesearch": "moderate"
  }
}
```

### Search Options

All `/search`, `/optimized`, and `/ai` endpoints accept an optional `options` object:

| Parameter                | Type                            | Description                                                                  |
| ------------------------ | ------------------------------- | ---------------------------------------------------------------------------- |
| `count`                  | `number` (1–20)                 | Number of results                                                            |
| `offset`                 | `number` (0–9)                  | Pagination offset                                                            |
| `country`                | `string`                        | 2-char country code (e.g. `"US"`)                                            |
| `search_lang`            | `string`                        | Language code (e.g. `"en"`)                                                  |
| `ui_lang`                | `string`                        | UI language (e.g. `"en-US"`)                                                 |
| `safesearch`             | `"off"` `"moderate"` `"strict"` | Content filter                                                               |
| `freshness`              | `"pd"` `"pw"` `"pm"` `"py"`     | Time filter: past day/week/month/year. Also accepts `YYYY-MM-DDtoYYYY-MM-DD` |
| `result_filter`          | `string`                        | Comma-separated types: `web,news,faq,discussions,videos,locations`           |
| `units`                  | `"metric"` `"imperial"`         | Measurement units                                                            |
| `goggles`                | `string[]`                      | Custom re-ranking goggles                                                    |
| `extra_snippets`         | `boolean`                       | Up to 5 additional snippets per result                                       |
| `summary`                | `boolean`                       | Enable summarizer key generation                                             |
| `text_decorations`       | `boolean`                       | Include highlight markers in snippets                                        |
| `spellcheck`             | `boolean`                       | Enable spell check                                                           |
| `enable_rich_callback`   | `boolean`                       | Enable rich result callbacks                                                 |
| `include_fetch_metadata` | `boolean`                       | Include fetch metadata                                                       |
| `operators`              | `boolean`                       | Apply search operators                                                       |

## Setup

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/) v4+
- Brave Search API key — [brave.com/search/api](https://brave.com/search/api/)
- Google Gemini API key — requires access to `gemini-3.1-flash-lite-preview`

### Local Development

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.dev.vars`:

   ```
   BRAVE_SEARCH_API_KEY=your_brave_search_api_key
   GEMINI_API_KEY=your_gemini_api_key
   ```

3. Start the dev server:
   ```bash
   npm run dev
   ```

The worker will be available at `http://localhost:8787`.

### Deployment

1. Set production secrets:

   ```bash
   wrangler secret put BRAVE_SEARCH_API_KEY
   wrangler secret put GEMINI_API_KEY
   ```

2. Deploy:
   ```bash
   npm run deploy
   ```

## Example curl Commands

```bash
# Standard search
curl -X POST http://localhost:8787/search \
  -H "Content-Type: application/json" \
  -d '{"query": "cloudflare workers", "options": {"count": 10}}'

# Optimized search
curl -X POST http://localhost:8787/optimized \
  -H "Content-Type: application/json" \
  -d '{"query": "best practices for typescript"}'

# Agentic search
curl -X POST http://localhost:8787/agentic \
  -H "Content-Type: application/json" \
  -d '{"query": "what happened at google io 2025"}'

# AI search
curl -X POST http://localhost:8787/ai \
  -H "Content-Type: application/json" \
  -d '{"query": "how does WASM work", "options": {"count": 15}}'
```
