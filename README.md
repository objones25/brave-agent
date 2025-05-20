# Brave Search Agent for Cloudflare Workers

A Cloudflare Workers AI agent that provides search capabilities using the Brave Search API. This agent can be interacted with via HTTP requests or WebSockets.

## Features

- Search the web using Brave Search API
- Customize search parameters (count, safesearch, country, etc.)
- Maintain conversation history and recent searches
- User preference management
- Support for both HTTP and WebSocket interfaces
- Powered by Cloudflare Workers AI

## Prerequisites

- [Node.js](https://nodejs.org/) (v16 or later)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) (v4 or later)
- A Cloudflare account
- A Brave Search API key (get one from [Brave Search API](https://brave.com/search/api/))

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

3. Create a `.dev.vars` file with your Brave Search API key:
   ```
   BRAVE_SEARCH_API_KEY=your_brave_api_key_here
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## Usage

### HTTP Endpoints

- **Search**: `POST /agents/brave-search/default/search`
  ```json
  {
    "query": "your search query",
    "preferences": {
      "safesearch": "moderate",
      "count": 10,
      "country": "US"
    }
  }
  ```

- **Get State**: `GET /agents/brave-search/default/state`

- **Update Preferences**: `POST /agents/brave-search/default/preferences`
  ```json
  {
    "safesearch": "strict",
    "count": 20,
    "country": "GB"
  }
  ```

- **Clear History**: `POST /agents/brave-search/default/clear-history`

### WebSocket Interface

Connect to `/agents/brave-search/default` and send JSON messages:

- **Search Request**:
  ```json
  {
    "type": "search_request",
    "query": "your search query",
    "preferences": {
      "safesearch": "moderate",
      "count": 10
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

Make sure to set your `BRAVE_SEARCH_API_KEY` in the Cloudflare Workers dashboard or via Wrangler secrets.

## Configuration

The agent's behavior can be customized by modifying the following:

- **Search Parameters**: Edit the `braveSearchSchema` in `src/index.ts` to add or modify search parameters.
- **System Prompt**: Modify the `systemPrompt` in `src/index.ts` to change how the AI responds to queries.
- **Default Preferences**: Update the `INITIAL_STATE` object in `src/index.ts` to change default search preferences.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
