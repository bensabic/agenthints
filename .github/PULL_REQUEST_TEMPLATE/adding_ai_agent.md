---
name: Adding AI Agent
about: Add support for a new AI coding agent
title: "feat(agents): add [AGENT NAME]"
labels: enhancement
---

## Agent Details

**Agent Name:**
<!-- e.g., Cursor, Claude Code, Copilot -->

**Agent Website:**
<!-- Link to the agent's website or documentation -->

## Configuration

<!-- Fill in the agent config. See CONTRIBUTING.md for details on each field. -->

```typescript
{
  name: "",
  description: "",
  path: "",  // Use {hint} placeholder for per-resource mode
  appendMode: true,  // true = single file, false = file per hint
  // header: "",  // Optional: frontmatter if required by agent
}
```

## Checklist

- [ ] Added agent config to `packages/cli/src/agents.ts`
- [ ] `pnpm check` passes
- [ ] `pnpm type-check` passes
- [ ] `pnpm cli:test` passes
- [ ] Tested locally with `pnpm cli:local add <hint> --agent <new-agent>`
- [ ] Verified output file format is correct