import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { BraveSearchAgent } from './brave-search-agent';

// Export the BraveSearchAgent class for Durable Object
export { BraveSearchAgent };

// Define the environment interface
export interface Env {
  // Durable Object binding
  BRAVE_AGENT: DurableObjectNamespace;
  
  // API keys
  BRAVE_API_KEY: string;
  GEMINI_API_KEY: string;
}

// HTML content for the client page
const clientHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Brave Search Agent Client</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      line-height: 1.6;
    }
    
    h1 {
      color: #FB542B; /* Brave orange color */
      text-align: center;
    }
    
    .chat-container {
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
      height: 400px;
      overflow-y: auto;
    }
    
    .message {
      margin-bottom: 15px;
      padding: 10px;
      border-radius: 8px;
    }
    
    .user-message {
      background-color: #e6f7ff;
      margin-left: 20%;
      margin-right: 0;
    }
    
    .agent-message {
      background-color: #f0f0f0;
      margin-right: 20%;
      margin-left: 0;
    }
    
    .search-results {
      margin-top: 10px;
      padding: 10px;
      background-color: #f9f9f9;
      border-radius: 5px;
      font-size: 0.9em;
    }
    
    .search-result {
      margin-bottom: 10px;
      padding-bottom: 10px;
      border-bottom: 1px solid #eee;
    }
    
    .search-result:last-child {
      border-bottom: none;
    }
    
    .search-result h3 {
      margin: 0 0 5px 0;
      font-size: 1em;
    }
    
    .search-result a {
      color: #1a0dab;
      text-decoration: none;
    }
    
    .search-result a:hover {
      text-decoration: underline;
    }
    
    .search-result p {
      margin: 5px 0;
      font-size: 0.9em;
      color: #333;
    }
    
    .input-container {
      display: flex;
      gap: 10px;
    }
    
    #message-input {
      flex-grow: 1;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    
    button {
      background-color: #FB542B;
      color: white;
      border: none;
      padding: 10px 15px;
      border-radius: 4px;
      cursor: pointer;
    }
    
    button:hover {
      background-color: #e64a24;
    }
    
    .loading {
      text-align: center;
      margin: 20px 0;
      font-style: italic;
      color: #666;
    }
    
    .favicon {
      width: 16px;
      height: 16px;
      margin-right: 5px;
      vertical-align: middle;
    }
  </style>
</head>
<body>
  <h1>Brave Search Agent</h1>
  
  <div class="chat-container" id="chat-container"></div>
  
  <div class="input-container">
    <input type="text" id="message-input" placeholder="Ask something..." />
    <button id="send-button">Send</button>
  </div>
  
  <script>
    // Configuration
    const AGENT_URL = 'http://localhost:8787/agents/brave-search-agent';
    let conversationId = null;
    
    // DOM elements
    const chatContainer = document.getElementById('chat-container');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    
    // Initialize the conversation
    async function initConversation() {
      // Generate a random conversation ID if not already set
      if (!conversationId) {
        conversationId = Math.random().toString(36).substring(2, 15);
      }
    }
    
    // Add a message to the chat
    function addMessage(content, isUser = false, searchResults = null) {
      const messageDiv = document.createElement('div');
      messageDiv.className = \`message \${isUser ? 'user-message' : 'agent-message'}\`;
      messageDiv.textContent = content;
      
      // If there are search results, add them
      if (searchResults && searchResults.results && searchResults.results.length > 0) {
        const resultsDiv = document.createElement('div');
        resultsDiv.className = 'search-results';
        
        const resultsTitle = document.createElement('h3');
        resultsTitle.textContent = 'Search Results:';
        resultsDiv.appendChild(resultsTitle);
        
        searchResults.results.forEach(result => {
          const resultDiv = document.createElement('div');
          resultDiv.className = 'search-result';
          
          const titleLink = document.createElement('a');
          titleLink.href = result.url;
          titleLink.target = '_blank';
          titleLink.textContent = result.title;
          
          const titleH3 = document.createElement('h3');
          
          // Add favicon if available
          if (result.favicon) {
            const favicon = document.createElement('img');
            favicon.src = result.favicon;
            favicon.className = 'favicon';
            favicon.onerror = () => { favicon.style.display = 'none'; };
            titleH3.appendChild(favicon);
          }
          
          titleH3.appendChild(titleLink);
          resultDiv.appendChild(titleH3);
          
          const description = document.createElement('p');
          description.textContent = result.description;
          resultDiv.appendChild(description);
          
          resultsDiv.appendChild(resultDiv);
        });
        
        messageDiv.appendChild(resultsDiv);
      }
      
      chatContainer.appendChild(messageDiv);
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
    
    // Send a message to the agent
    async function sendMessage(message) {
      try {
        // Add the user message to the chat
        addMessage(message, true);
        
        // Show loading indicator
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'loading';
        loadingDiv.textContent = 'Agent is thinking...';
        chatContainer.appendChild(loadingDiv);
        
        // Make sure we have a conversation ID
        await initConversation();
        
        // Call the agent's chat method
        const response = await fetch(\`\${AGENT_URL}/chat\`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            conversationId,
            message
          })
        });
        
        if (!response.ok) {
          throw new Error(\`Error: \${response.status} \${response.statusText}\`);
        }
        
        const data = await response.json();
        
        // Remove loading indicator
        chatContainer.removeChild(loadingDiv);
        
        // Get the search results if available
        let searchResults = null;
        if (conversationId) {
          const conversationResponse = await fetch(\`\${AGENT_URL}/getConversation\`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              conversationId
            })
          });
          
          if (conversationResponse.ok) {
            const conversationData = await conversationResponse.json();
            searchResults = conversationData.searchResults;
          }
        }
        
        // Add the agent's response to the chat
        addMessage(data.response, false, searchResults);
      } catch (error) {
        console.error('Error sending message:', error);
        
        // Remove loading indicator if it exists
        const loadingDiv = document.querySelector('.loading');
        if (loadingDiv) {
          chatContainer.removeChild(loadingDiv);
        }
        
        // Add error message
        addMessage(\`Error: \${error.message}\`, false);
      }
    }
    
    // Event listeners
    sendButton.addEventListener('click', () => {
      const message = messageInput.value.trim();
      if (message) {
        sendMessage(message);
        messageInput.value = '';
      }
    });
    
    messageInput.addEventListener('keypress', (event) => {
      if (event.key === 'Enter') {
        const message = messageInput.value.trim();
        if (message) {
          sendMessage(message);
          messageInput.value = '';
        }
      }
    });
    
    // Initialize the conversation when the page loads
    window.addEventListener('load', initConversation);
    
    // Add welcome message
    addMessage('Hello! I\\'m the Brave Search Agent. Ask me anything, and I\\'ll search the web for you using Brave Search.');
  </script>
</body>
</html>`;

// Create a new Hono app
const app = new Hono<{ Bindings: Env }>();

// Add CORS middleware
app.use('*', cors());

// Serve the client HTML at multiple paths with the same handler
const serveClientHtml = (c: any) => {
  return new Response(clientHtml, {
    headers: { 'Content-Type': 'text/html' }
  });
};

app.get('/', serveClientHtml);
app.get('/index.html', serveClientHtml);
app.get('/brave-search-client.html', serveClientHtml);

// Route agent requests
app.all('/agents/brave-search-agent/*', async (c) => {
  try {
    const env = c.env;
    const request = c.req.raw;
    const url = new URL(request.url);
    
    // Extract the conversation ID from the request
    let conversationId = '';
    
    if (request.method === 'POST') {
      try {
        const body = await request.clone().json() as any;
        if (body && typeof body.conversationId === 'string') {
          conversationId = body.conversationId;
        }
      } catch (e) {
        // Ignore JSON parsing errors
      }
    }
    
    // Create a unique ID for this agent instance
    // Use the conversation ID as the name to ensure the same instance is used for the same conversation
    const id = env.BRAVE_AGENT.idFromName(conversationId || url.pathname);
    const stub = env.BRAVE_AGENT.get(id);
    
    // Forward the request to the Durable Object
    return await stub.fetch(request);
  } catch (error) {
    console.error('Error routing agent request:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(`Error: ${errorMessage}`, { status: 500 });
  }
});

// Handle all other routes with a 404
app.all('*', (c) => {
  return new Response('Not found', { status: 404 });
});

// Export the default fetch handler
export default {
  fetch: app.fetch
};
