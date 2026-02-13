---
"llmstxt-cli": patch
---

Fix false positive agent detection (remove cwd-based checks for .github, .agent, etc.) and improve UX by truncating long agent lists and not pre-selecting entries in init.
