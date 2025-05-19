# Brave Search Agent

A Cloudflare Worker agent that uses the Brave Search API and Google Gemini function calling to provide intelligent search capabilities with conversation history support.

![Brave Search Agent](https://img.shields.io/badge/Brave%20Search-Agent-orange)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange)
![Google Gemini](https://img.shields.io/badge/Google-Gemini-blue)

## Features

- **Brave Web Search**: Search the web using Brave's powerful search engine
- **Function Calling**: Uses Google Gemini function calling to intelligently process queries
- **Conversation History**: Maintains conversation history for context-aware responses across multiple interactions
- **Simple Client**: Includes a simple HTML/JS client for interacting with the agent
- **Hono Framework**: Uses the lightweight Hono framework for routing and request handling

## Package Versions

- **@google/genai**: ^0.15.0
- **agents**: ^0.0.88
- **hono**: ^4.7.10

## Implementation Notes

- The agent uses Durable Objects to maintain state and conversation history across requests.
- Each conversation is stored with a unique ID, allowing the agent to maintain context across multiple interactions.
- The Gemini function calling implementation has been updated to support conversation history, enabling the agent to understand context from previous messages.
- Environment variables are accessed through `this.env` in the agent, which is provided by the Cloudflare Workers runtime.
- The project requires the "nodejs_compat" compatibility flag to be enabled in wrangler.toml due to the agents package using Node.js-specific modules like "async_hooks".
- Wrangler requires Node.js v20.0.0 or higher to run properly.

## Project Structure

```
brave-agent/
├── src/
│   ├── types.ts                 # Type definitions for Brave API
│   ├── brave-search-agent.ts    # Agent implementation with conversation history
│   ├── function-calling.ts      # Function calling implementation with context support
│   └── index.ts                 # Main entry point with Hono routing
├── wrangler.toml                # Cloudflare Worker configuration
└── package.json                 # Project dependencies
```

## Setup

1. Clone the repository:
   ```
   git clone https://github.com/theelusivegerbilfish/brave-agent.git
   cd brave-agent
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.dev.vars` file with your API keys:
   ```
   BRAVE_API_KEY=your_brave_api_key
   GEMINI_API_KEY=your_gemini_api_key
   ```

4. Run the development server:
   ```
   npm run dev
   ```

5. Open the landing page in your browser:
   ```
   open http://localhost:8787
   ```

## Development

This project includes a `.gitignore` file to prevent unnecessary files from being committed to the repository. The following files and directories are excluded:

- `node_modules/`
- `.dev.vars` (contains sensitive API keys)
- `.DS_Store`
- `dist/`
- `.wrangler/`
- Various IDE and editor-specific files

Make sure to keep your API keys and other sensitive information in the `.dev.vars` file, which is excluded from version control.

## API

The Brave Search Agent exposes the following HTTP endpoints:

### POST `/agents/brave-search-agent/chat`

Processes a message using function calling and returns a response.

Request body:
```json
{
  "conversationId": "unique-conversation-id",
  "message": "User's message"
}
```

Response:
```json
{
  "response": "Agent's response",
  "conversationId": "unique-conversation-id"
}
```

### POST `/agents/brave-search-agent/getConversation`

Gets the conversation history for a specific conversation.

Request body:
```json
{
  "conversationId": "unique-conversation-id"
}
```

Response:
```json
{
  "messages": [
    {
      "role": "user",
      "content": "User's message",
      "timestamp": 1747694777164
    },
    {
      "role": "agent",
      "content": "Agent's response",
      "timestamp": 1747694777164
    }
  ],
  "searchResults": {
    // Search results if available
  }
}
```

### POST `/agents/brave-search-agent/listConversations`

Lists all conversation IDs.

Response:
```json
{
  "conversationIds": ["conversation-id-1", "conversation-id-2"]
}
```

### POST `/agents/brave-search-agent/deleteConversation`

Deletes a conversation.

Request body:
```json
{
  "conversationId": "unique-conversation-id"
}
```

Response:
```json
{
  "success": true
}
```

### POST `/agents/brave-search-agent/search`

Performs a search using the Brave Search API.

Request body:
```json
{
  "query": "Search query",
  "options": {
    // Optional search parameters
  }
}
```

Response:
```json
{
  "results": [
    // Search results
  ],
  "query": {
    "original": "Search query",
    "altered": "Altered query (if any)"
  },
  "total_count": 10
}
```

## Conversation History

The agent maintains conversation history for each unique conversation ID. This allows it to understand context from previous messages and provide more relevant responses. For example:

User: "What is the capital of France?"
Agent: "The capital of France is Paris."

User: "What is its population?"
Agent: "The population of Paris is estimated to be around 2.1 million as of 2023."

The agent correctly understands that "its" refers to Paris, which was mentioned in the previous message.

## Deployment

Deploy to Cloudflare Workers:

```
npm run deploy
```

## License

MIT
