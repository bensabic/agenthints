# Agent Hints

The registry for feeding hints to your AI software engineer.

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE.md)
[![npm version](https://img.shields.io/npm/v/agenthints.svg)](https://www.npmjs.com/package/agenthints)

## Table of Contents

- [What is Agent Hints?](#what-is-agent-hints)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Commands](#commands)
- [Supported Agents](#supported-agents)
- [How It Works](#how-it-works)
- [Contributing](#contributing)
- [License](#license)

## What is Agent Hints?

Agent Hints is a registry for feeding hints to your AI software engineer. It provides a centralized collection of curated hints that help AI coding assistants understand your tools, frameworks, and project conventions.

**Write hints once, deploy to 20+ AI tools.**

Instead of manually maintaining separate configuration files for Claude, Cursor, Copilot, and other AI tools, Agent Hints lets you:

- Browse and add hints from a curated registry
- Automatically format hints for your specific AI agent
- Keep hints in sync with registry updates
- Easily switch between AI tools

## Installation

```bash
# Install globally
npm install -g agenthints

# Or use with npx (no install required)
npx agenthints --help
```

You can also use `pnpm` or `yarn`:

```bash
pnpm add -g agenthints
yarn global add agenthints
```

## Quick Start

### Initialize a new project

```bash
agenthints init
```

This interactive wizard will:

1. Ask you to select your AI agent
2. Let you browse and select hints from the registry
3. Automatically add the selected hints to your project

### Add hints manually

```bash
# Add a single hint
agenthints add ultracite

# Add multiple hints
agenthints add ultracite firebase supabase

# Specify the target agent
agenthints add ultracite --agent claude
```

### Remove hints

```bash
agenthints remove ultracite --agent claude
```

## Commands

| Command | Description |
|---------|-------------|
| `agenthints init` | Interactive setup wizard for new projects |
| `agenthints add <hints...>` | Add hints to your project |
| `agenthints remove <hints...>` | Remove hints from your project |
| `agenthints list` | List all available hints in the registry |
| `agenthints search <query>` | Search for hints by name, description, or tags |
| `agenthints agents` | Show all supported AI agents |

### Common Options

| Option | Description |
|--------|-------------|
| `-a, --agent <name>` | Target AI agent (skips selection prompt) |
| `-y, --yes` | Skip confirmation prompts |
| `--cwd <path>` | Working directory (default: current directory) |
| `--json` | Output results as JSON (for `list` and `search`) |

### Examples

```bash
# List all hints
agenthints list

# List hints in a specific category
agenthints list --category code-quality

# Search for hints
agenthints search typescript

# Add hint with auto-confirm
agenthints add ultracite --agent claude --yes
```

## Supported Agents

Agent Hints supports **20+ AI coding assistants** across two modes:

### Append Mode

These agents use a single file where all hints are appended:

| Agent | File | Description |
|-------|------|-------------|
| `claude` | `CLAUDE.md` | Anthropic Claude Code CLI |
| `copilot` | `AGENTS.md` | GitHub Copilot |
| `codex` | `AGENTS.md` | OpenAI Codex CLI |
| `google` | `GEMINI.md` | Gemini CLI / Firebase Studio |
| `aider` | `CONVENTIONS.md` | Aider CLI |
| `amp` | `AGENT.md` | Sourcegraph AMP |
| `devin` | `AGENTS.md` | Cognition Devin |
| `droid` | `AGENTS.md` | Factory Droid CLI |
| `goose` | `.goosehints` | Block's Codename Goose |
| `jules` | `AGENTS.md` | Google Jules |
| `junie` | `AGENTS.md` | JetBrains Junie |
| `opencode` | `AGENTS.md` | OpenCode CLI |
| `replit` | `replit.md` | Replit Agent |
| `warp` | `WARP.md` | Warp terminal AI |
| `zed` | `AGENTS.md` | Zed editor |

### Per-Resource Mode

These agents create a separate file for each hint:

| Agent | Path Pattern | Description |
|-------|--------------|-------------|
| `augment` | `.augment/rules/{hint}.md` | Augment Code |
| `cline` | `.clinerules/{hint}.md` | Cline VS Code extension |
| `cursor` | `.cursor/rules/{hint}.mdc` | Cursor AI IDE |
| `kilo-code` | `.kilocode/rules/{hint}.md` | Kilo Code |
| `kiro` | `.kiro/steering/{hint}.md` | Kiro IDE |
| `open-hands` | `.openhands/skills/{hint}.md` | OpenHands |
| `roo-code` | `.roo/rules/{hint}.md` | Roo Code |
| `windsurf` | `.windsurf/rules/{hint}.md` | Codeium's Windsurf IDE |

## How It Works

### Adding Hints

When you run `agenthints add`, the CLI:

1. Fetches the hint content from the registry at [agenthints.tech](https://agenthints.tech)
2. Transforms the content for your target agent (adding headers, frontmatter, etc.)
3. For **append mode** agents: wraps the hint in section markers and appends to the target file
4. For **per-resource** agents: creates a new file for each hint

### Section Markers

For append mode agents, hints are wrapped in HTML comment markers:

```markdown
<!-- agenthints:my-hint:start -->
[hint content]
<!-- agenthints:my-hint:end -->
```

This allows the CLI to:

- Update hints when the registry changes
- Remove specific hints without affecting others
- Track which hints are installed

### Removing Hints

When you run `agenthints remove`, the CLI locates the hint section and removes it cleanly, preserving the rest of your configuration file.

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on:

- Creating new hints
- Adding support for new AI agents
- General development

## License

[Apache-2.0](LICENSE.md)

---

Built by [Ben Sabic](https://bensabic.ca) | [agenthints.tech](https://agenthints.tech) | [GitHub](https://github.com/bensabic/agenthints)
