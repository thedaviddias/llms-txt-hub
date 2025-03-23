# llms.txt Chatbot

A dedicated chatbot for exploring the llms.txt ecosystem, allowing users to interactively discover and chat with llms.txt files from across the web.

## Features

- Chat-based interface for exploring llms.txt content
- Filter results by category
- View formatted llms.txt content with syntax highlighting
- Responsive design for all devices
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

1. A Next.js application with server-side API
2. A content index generator that fetches and processes llms.txt files
3. Client-side components for conversational interface
4. Fuzzy search implementation with Fuse.js for improved results

## Development Roadmap

- [ ] Conversational UI with chat-like interface
- [ ] Natural language processing for better understanding of queries
- [ ] Advanced filtering options (date, file type, etc.)
- [ ] Syntax highlighting improvements for llms.txt files
- [ ] Comparison view for multiple llms.txt files
- [ ] Analytics for popular queries
- [ ] API for third-party access to the chatbot