# llmstxt-cli

## 0.3.0

### Minor Changes

- [`85ccac5`](https://github.com/thedaviddias/llms-txt-hub/commit/85ccac5b85073268ccf0587bd37315effa6ffc48) Thanks [@thedaviddias](https://github.com/thedaviddias)! - Replace static package-mappings.json with fuzzy token-based dependency detection that matches npm packages against registry entries by slug and name.

### Patch Changes

- [`acda3e0`](https://github.com/thedaviddias/llms-txt-hub/commit/acda3e0aea804df7ce93643b839c07075afc5963) Thanks [@thedaviddias](https://github.com/thedaviddias)! - Fix false positive agent detection (remove cwd-based checks for .github, .agent, etc.) and improve UX by truncating long agent lists and not pre-selecting entries in init.

## 0.2.0

### Minor Changes

- [`d8d047e`](https://github.com/thedaviddias/llms-txt-hub/commit/d8d047e6e9ea1228621ffcf7771d64d9b0af8bd4) Thanks [@thedaviddias](https://github.com/thedaviddias)! - Support 39 AI coding agents (up from 6), including OpenClaw, Gemini CLI, GitHub Copilot, Amp, Goose, Roo Code, and many more. Gitignore entries are now derived dynamically from the agents list.
