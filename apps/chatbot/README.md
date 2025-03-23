# llms.txt Chatbot

A dedicated chatbot for exploring the llms.txt ecosystem, allowing users to interactively discover and chat with llms.txt files from across the web.

## Features

- Chat-based interface for exploring llms.txt content
- Tool-based architecture for specialized information retrieval
- Syntax highlighted code blocks for llms.txt content
- Responsive design that works on all devices
- Dark mode support

## Getting Started

1. Install dependencies:
```
pnpm install
```

2. Generate the chatbot index:
```
pnpm generate-llms-chatbot-index
```

3. Start the development server:
```
pnpm dev --filter=chatbot
```

## Architecture

The chatbot consists of:

1. A Next.js application with modern UI inspired by Vercel's AI SDK starter
2. A set of specialized tools for retrieving llms.txt information:
   - `searchLlmsTxtTool`: Searches across llms.txt files
   - `getLlmsTxtFileTool`: Retrieves specific provider files
   - `getLlmsTxtCategoriesTool`: Organizes providers by category
3. A simulated chat API that will later be connected to a real LLM
4. A clean, minimalist UI with Markdown rendering support

## Development Roadmap

- [ ] Integrate with a real LLM API (Claude, OpenAI, etc.)
- [ ] Implement proper streaming for responses
- [ ] Add real-time llms.txt file fetching
- [ ] Create a more sophisticated search/retrieval system
- [ ] Display visualizations for context window sizes and other metrics
- [ ] Compare multiple llms.txt files side-by-side
- [ ] Advanced filtering options by capabilities
- [ ] API for third-party access to the chatbot