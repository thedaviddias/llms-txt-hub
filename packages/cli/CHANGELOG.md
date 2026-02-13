# llmstxt-cli

## 0.4.0

### Minor Changes

- [`8295ad4`](https://github.com/thedaviddias/llms-txt-hub/commit/8295ad4a5ed3a6e3f3eb75e21b5ca70fc81b8285) Thanks [@thedaviddias](https://github.com/thedaviddias)! - Add smart agent pre-selection, format choice, and remove auto-gitignore

  - Agent multiselect now pre-selects based on: saved preferences > project directory detection (.cursor/, .claude/) > sensible defaults
  - Universal agents (Amp, Codex, Gemini CLI, etc.) are always included
  - Selection is persisted to `.llms/agent-prefs.json` for next run
  - Init wizard now prompts for llms.txt vs llms-full.txt when available
  - Removed automatic .gitignore modification (matching vercel-labs/skills behavior)

## 0.3.0

### Minor Changes

- [`85ccac5`](https://github.com/thedaviddias/llms-txt-hub/commit/85ccac5b85073268ccf0587bd37315effa6ffc48) Thanks [@thedaviddias](https://github.com/thedaviddias)! - Replace static package-mappings.json with fuzzy token-based dependency detection that matches npm packages against registry entries by slug and name.

### Patch Changes

- [`acda3e0`](https://github.com/thedaviddias/llms-txt-hub/commit/acda3e0aea804df7ce93643b839c07075afc5963) Thanks [@thedaviddias](https://github.com/thedaviddias)! - Fix false positive agent detection (remove cwd-based checks for .github, .agent, etc.) and improve UX by truncating long agent lists and not pre-selecting entries in init.

## 0.2.0

### Minor Changes

- [`d8d047e`](https://github.com/thedaviddias/llms-txt-hub/commit/d8d047e6e9ea1228621ffcf7771d64d9b0af8bd4) Thanks [@thedaviddias](https://github.com/thedaviddias)! - Support 39 AI coding agents (up from 6), including OpenClaw, Gemini CLI, GitHub Copilot, Amp, Goose, Roo Code, and many more. Gitignore entries are now derived dynamically from the agents list.
