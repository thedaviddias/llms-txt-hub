# llmstxt-cli

Install llms.txt documentation into your AI coding agents.

> 900+ entries from the [llms-txt-hub](https://github.com/thedaviddias/llms-txt-hub) registry, delivered as agent skills for Claude Code, Cursor, Windsurf, Cline, OpenCode, Codex & more.

## Quick Start

```bash
# Auto-detect your project's dependencies and install matching docs
npx llmstxt-cli init

# Install a specific skill
npx llmstxt-cli install react
```

## How It Works

1. Fetches `llms.txt` / `llms-full.txt` from the registry
2. Stores canonically in `.agents/skills/<slug>/SKILL.md`
3. Creates symlinks for each detected agent (`.claude/skills/`, `.cursor/skills/`, etc.)
4. Updates `CLAUDE.md` with a managed reference section
5. Adds `.gitignore` entries (installs are per-developer)

## Commands

| Command | Description |
|---|---|
| `init` | Auto-detect dependencies and install matching docs |
| `install <names...>` | Install by name (supports multiple) |
| `search <query>` | Search the registry |
| `list` (alias: `ls`) | Show installed entries |
| `update [name]` | Re-fetch installed entries (or a specific one) |
| `remove` (alias: `rm`) | Uninstall an entry |
| `info <name>` | Show registry details for an entry |

## Options

```bash
# Prefer llms-full.txt when available
npx llmstxt-cli init --full
npx llmstxt-cli install react --full

# Preview without installing
npx llmstxt-cli init --dry-run

# Force re-download
npx llmstxt-cli install react --force
npx llmstxt-cli update --force

# Filter by category
npx llmstxt-cli init --category frameworks,libraries
npx llmstxt-cli search react --category frameworks
```

## Supported Agents

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code)
- [Cursor](https://cursor.sh)
- [Windsurf](https://codeium.com/windsurf)
- [Cline](https://github.com/cline/cline)
- [OpenCode](https://opencode.ai)
- [Codex](https://github.com/openai/codex)

## Requirements

- Node.js >= 22

## Links

- Website: [llmstxt.directory](https://llmstxt.directory)
- Registry: [github.com/thedaviddias/llms-txt-hub](https://github.com/thedaviddias/llms-txt-hub)
- Issues: [github.com/thedaviddias/llms-txt-hub/issues](https://github.com/thedaviddias/llms-txt-hub/issues)

## License

MIT
