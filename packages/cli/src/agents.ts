/**
 * Agent configuration for transforming hints into agent-specific formats.
 *
 * Each agent has:
 * - path: Where the hints file should be placed (supports {hint} placeholder)
 * - header: Optional frontmatter/header to prepend
 * - appendMode: If true, append to existing file. If false, create separate file per hint.
 * - transform: Optional function to transform the content
 */

export type AgentConfig = {
  name: string;
  description: string;
  path: string;
  header?: string | ((hintName: string) => string);
  appendMode: boolean;
  transform?: (content: string, hintName: string) => string;
};

export const agents = {
  droid: {
    name: "Droid",
    description: "Factory Droid CLI",
    path: "AGENTS.md",
    appendMode: true,
  },

  claude: {
    name: "Claude Code",
    description: "Anthropic Claude Code CLI",
    path: "CLAUDE.md",
    appendMode: true,
  },

  codex: {
    name: "OpenAI Codex",
    description: "OpenAI Codex CLI",
    path: "AGENTS.md",
    appendMode: true,
  },

  google: {
    name: "Gemini / Antigravity / Firebase Studio",
    description: "Gemini CLI / Antigravity IDE / Firebase Studio",
    path: "GEMINI.md",
    appendMode: true,
  },

  copilot: {
    name: "GitHub Copilot",
    description: "GitHub Copilot",
    path: "AGENTS.md",
    appendMode: true,
  },

  aider: {
    name: "Aider",
    description: "Aider CLI coding assistant",
    path: "CONVENTIONS.md",
    appendMode: true,
  },

  amp: {
    name: "AMP",
    description: "Sourcegraph AMP",
    path: "AGENT.md",
    appendMode: true,
  },

  augment: {
    name: "Augment Code",
    description: "Augment Code assistant",
    path: ".augment/rules/{hint}.md",
    appendMode: false,
  },

  cline: {
    name: "Cline",
    description: "Cline VS Code extension",
    path: ".clinerules/{hint}.md",
    appendMode: false,
  },

  cursor: {
    name: "Cursor",
    description: "Cursor AI IDE",
    path: ".cursor/rules/{hint}.mdc",
    header: (hint) => `---
description: "${hint}"
globs: "**/*"
alwaysApply: true
---`,
    appendMode: false,
  },

  devin: {
    name: "Devin",
    description: "Cognition Devin AI",
    path: "AGENTS.md",
    appendMode: true,
  },

  goose: {
    name: "Goose",
    description: "Block's Codename Goose",
    path: ".goosehints",
    appendMode: true,
  },

  jules: {
    name: "Jules",
    description: "Google Jules AI agent",
    path: "AGENTS.md",
    appendMode: true,
  },

  junie: {
    name: "Junie",
    description: "JetBrains Junie",
    path: "AGENTS.md",
    appendMode: true,
  },

  "kilo-code": {
    name: "Kilo Code",
    description: "Kilo Code assistant",
    path: ".kilocode/rules/{hint}.md",
    appendMode: false,
  },

  kiro: {
    name: "Kiro",
    description: "Kiro IDE",
    path: ".kiro/steering/{hint}.md",
    appendMode: false,
  },

  "open-hands": {
    name: "OpenHands",
    description: "OpenHands AI agent",
    path: ".openhands/skills/{hint}.md",
    appendMode: false,
  },

  opencode: {
    name: "OpenCode",
    description: "OpenCode CLI assistant",
    path: "AGENTS.md",
    appendMode: true,
  },

  "roo-code": {
    name: "Roo Code",
    description: "Roo Code assistant",
    path: ".roo/rules/{hint}.md",
    appendMode: false,
  },

  replit: {
    name: "Replit",
    description: "Replit Agent",
    path: "replit.md",
    appendMode: true,
  },

  warp: {
    name: "Warp",
    description: "Warp terminal AI",
    path: "WARP.md",
    appendMode: true,
  },

  windsurf: {
    name: "Windsurf",
    description: "Codeium's Windsurf IDE",
    path: ".windsurf/rules/{hint}.md",
    appendMode: false,
  },

  zed: {
    name: "Zed",
    description: "Zed editor AI assistant",
    path: "AGENTS.md",
    appendMode: true,
  },
} as const satisfies Record<string, AgentConfig>;

export type AgentName = keyof typeof agents;

export const agentNames = Object.keys(agents) as AgentName[];

export function getAgent(name: string): AgentConfig | undefined {
  return agents[name as AgentName];
}

export function resolveAgentPath(agent: AgentConfig, hintName: string): string {
  return agent.path.replace("{hint}", hintName);
}

export function resolveAgentHeader(
  agent: AgentConfig,
  hintName: string
): string | undefined {
  if (!agent.header) {
    return;
  }
  if (typeof agent.header === "function") {
    return agent.header(hintName);
  }
  return agent.header;
}
