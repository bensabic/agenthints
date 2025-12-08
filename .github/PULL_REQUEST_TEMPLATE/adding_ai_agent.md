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

**Rules File Path:**
<!-- Where does this agent look for rules? e.g., .cursor/rules/, CLAUDE.md -->

**Append Mode:**
<!-- Does this agent use a single file for all rules (true) or separate files per hint (false)? -->

## Configuration

```typescript
{
  name: "",
  description: "",
  path: "",
  appendMode: true,
}
```

## Header Format (if applicable)

<!-- Does this agent require specific frontmatter or header format? -->

```markdown
---
example: frontmatter
---
```

## Documentation

<!-- Link to documentation about this agent's rules format -->

## Checklist

- [ ] Added agent config to `packages/cli/src/agents.ts`
- [ ] Tested locally with `agenthints add <hint> --agent <new-agent>`
- [ ] Verified output file format is correct