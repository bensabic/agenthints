# Contributing to Agent Hints

Thank you for your interest in contributing to Agent Hints! This guide covers three types of contributions:

1. **Creating hints** - Add new hints to the registry
2. **Adding or modifying agents** - Support new AI tools
3. **General changes** - Bug fixes, features, documentation

## Table of Contents

- [Creating a Hint](#creating-a-hint)
  - [Hint Structure](#hint-structure)
  - [Using the Create Wizard](#using-the-create-wizard)
  - [Hint Content Guidelines](#hint-content-guidelines)
  - [Validating Your Hint](#validating-your-hint)
  - [Submitting Your Hint](#submitting-your-hint)
- [Adding or Modifying an Agent](#adding-or-modifying-an-agent)
  - [Agent Configuration](#agent-configuration)
  - [Append Mode vs Per-Resource Mode](#append-mode-vs-per-resource-mode)
  - [Adding a New Agent](#adding-a-new-agent)
  - [Submitting Your Agent](#submitting-your-agent)
- [General Development](#general-development)
  - [Prerequisites](#prerequisites)
  - [Setup](#setup)
  - [Development Commands](#development-commands)
  - [Project Structure](#project-structure)
- [Pull Request Checklist](#pull-request-checklist)

---

## Creating a Hint

### Hint Structure

Each hint lives in `public/registry/hints/<name>/` with two files:

```text
public/registry/hints/my-hint/
├── meta.json    # Metadata (name, description, category, tags)
└── hint.md      # The actual hint content
```

### Using the Create Wizard

The easiest way to create a hint is using the interactive wizard:

```bash
pnpm create-hint
```

This will prompt you for:

1. **Package name** - Display name (converted to kebab-case folder name)
2. **Description** - Short description (max 100 characters)
3. **GitHub username** - Your username (auto-detected from git config)
4. **Category** - Select from available categories
5. **Tags** - Comma-separated searchable tags

### Hint Content Guidelines

Structure your `hint.md` with these sections:

```markdown
# Package Name

Brief description of what this tool/library does.

## Commands

List the main commands AI agents should know:

- `npx package-name command` - Description

## Rules

Numbered rules that AI agents should follow:

1. **Rule title** - Explanation of the rule.
2. **Another rule** - More details.

## Common Patterns

Show code examples of correct usage:

\`\`\`typescript
// Example usage
\`\`\`

## Common Issues

List common mistakes and how to avoid them:

- Issue description and how to fix it.
```

**Tips for good hints:**

- Be concise but comprehensive
- Include practical code examples
- Focus on what AI agents need to know
- Avoid redundant information from official docs
- Use language-specific syntax highlighting

### Validating Your Hint

After creating your hint, validate it:

```bash
pnpm validate-hints my-hint
```

This checks:

- `meta.json` conforms to the schema
- `hint.md` exists and is readable
- Content transforms correctly for all agents

### Submitting Your Hint

When submitting a PR for a new hint, you must use the **Adding Hint** PR template located at `.github/PULL_REQUEST_TEMPLATE/adding_hint.md`.

---

## Adding or Modifying an Agent

### Agent Configuration

Agents are defined in `packages/cli/src/agents.ts`. Each agent has:

```typescript
export type AgentConfig = {
  name: string;           // Display name
  description: string;    // Description shown in CLI
  path: string;           // File path (supports {hint} placeholder)
  header?: string | ((hintName: string) => string);  // Optional frontmatter
  appendMode: boolean;    // true = single file, false = file per hint
  transform?: (content: string, hintName: string) => string;  // Optional transformer
};
```

### Append Mode vs Per-Resource Mode

**Append Mode (`appendMode: true`)**

- All hints go into a single file (e.g., `CLAUDE.md`)
- Hints are wrapped in section markers for tracking
- Good for agents that read a single instructions file

**Per-Resource Mode (`appendMode: false`)**

- Each hint creates its own file (e.g., `.cursor/rules/ultracite.mdc`)
- Use `{hint}` placeholder in path for the hint name
- Good for agents that read multiple rule files

### Adding a New Agent

**Step 1: Add the configuration** in `packages/cli/src/agents.ts`:

```typescript
export const agents: Record<string, AgentConfig> = {
  // ... existing agents ...

  "my-agent": {
    name: "My AI Agent",
    description: "Description for CLI display",
    path: "MYAGENT.md",  // or ".myagent/rules/{hint}.md"
    appendMode: true,     // or false for per-resource
  },
};
```

**Step 2: For agents with frontmatter**, add a header:

```typescript
"my-agent": {
  name: "My AI Agent",
  description: "My AI Agent IDE",
  path: ".myagent/rules/{hint}.md",
  header: (hint) => `---
description: ${hint}
enabled: true
---`,
  appendMode: false,
},
```

**Step 3: For custom transformations**, add a transform function:

```typescript
"my-agent": {
  name: "My AI Agent",
  description: "My AI Agent",
  path: "MYAGENT.md",
  appendMode: true,
  transform: (content, hintName) => {
    // Custom transformation logic
    return content.toUpperCase();
  },
},
```

### Submitting Your Agent

When submitting a PR for a new agent, you must use the **Adding AI Agent** PR template located at `.github/PULL_REQUEST_TEMPLATE/adding_ai_agent.md`.

---

## General Development

### Prerequisites

- Node.js 20+
- pnpm 10+

### Setup

```bash
# Clone the repository
git clone https://github.com/bensabic/agenthints.git
cd agenthints

# Install dependencies
pnpm install
```

### Development Commands

**Root project:**

```bash
# Start development server (builds registry + starts Cloudflare Worker)
pnpm dev

# Type checking
pnpm type-check

# Lint and format check
pnpm check

# Auto-fix lint/format issues
pnpm fix

# Run tests (includes CLI package tests)
pnpm test

# Create a new hint (interactive)
pnpm create-hint

# Validate hints
pnpm validate-hints           # Validate all hints
pnpm validate-hints my-hint   # Validate specific hint
```

**CLI package (`packages/cli`):**

```bash
cd packages/cli

# Build CLI
pnpm build

# Watch mode
pnpm dev

# Run tests
pnpm test
```

### Project Structure

```text
agenthints/
├── public/
│   └── registry/
│       ├── hints/              # Hint directories
│       │   └── <name>/
│       │       ├── meta.json
│       │       └── hint.md
│       ├── index.json         # Generated registry index
│       ├── index.schema.json
│       └── meta.schema.json    # Hint metadata schema
├── packages/
│   └── cli/
│       └── src/
│           ├── cli.ts          # CLI entry point
│           ├── agents.ts       # Agent configurations
│           ├── transformer.ts  # Content transformation
│           ├── registry.ts     # Registry client
│           └── commands/       # Command implementations
├── scripts/
│   ├── build-registry.ts       # Builds index.json
│   ├── create-hint.ts          # Hint creation wizard
│   └── validate-hints.ts       # Hint validation
├── lib/
│   └── types.ts                # Shared TypeScript types
└── src/
    └── index.ts                # Cloudflare Worker entry
```

---

## Pull Request Checklist

Before submitting a PR, ensure:

- [ ] **Code quality**: `pnpm check` passes (run `pnpm fix` to auto-fix)
- [ ] **Type safety**: `pnpm type-check` passes
- [ ] **Tests**: `pnpm test` passes
- [ ] **New hints validated**: `pnpm validate-hints <name>` passes (if adding hints)
- [ ] **Use the correct PR template** (see below)

### For New Hints

Use the PR template at `.github/PULL_REQUEST_TEMPLATE/adding_hint.md`:

- [ ] Follows the hint structure (`meta.json` + `hint.md`)
- [ ] Description is under 100 characters
- [ ] Category is valid (from schema enum)
- [ ] Tags are relevant and unique
- [ ] Content is useful for AI agents

### For New Agents

Use the PR template at `.github/PULL_REQUEST_TEMPLATE/adding_ai_agent.md`:

- [ ] Configuration added to `packages/cli/src/agents.ts`
- [ ] Path pattern is correct (with `{hint}` for per-resource)
- [ ] `appendMode` is set appropriately

### For Bug Fixes

Use the PR template at `.github/PULL_REQUEST_TEMPLATE/bug_fix.md`.

---

Questions? Open an issue at [github.com/bensabic/agenthints/issues](https://github.com/bensabic/agenthints/issues).
