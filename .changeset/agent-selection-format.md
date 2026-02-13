---
"llmstxt-cli": minor
---

Add smart agent pre-selection, format choice, and remove auto-gitignore

- Agent multiselect now pre-selects based on: saved preferences > project directory detection (.cursor/, .claude/) > sensible defaults
- Universal agents (Amp, Codex, Gemini CLI, etc.) are always included
- Selection is persisted to `.llms/agent-prefs.json` for next run
- Init wizard now prompts for llms.txt vs llms-full.txt when available
- Removed automatic .gitignore modification (matching vercel-labs/skills behavior)
