---
name: Adding Hint
about: Add a new hint to the AgentHints registry
title: "feat(registry): add [HINT NAME]"
labels: registry
---

## Hint Details

**Hint Name:**
<!-- e.g., Ultracite, Prisma, Drizzle -->

**npm Package (if applicable):**
<!-- e.g., ultracite, prisma, drizzle-orm -->

**Repository:**
<!-- Link to the hint's GitHub repository -->

**Category:**
<!-- One of: code-quality, database, framework, api, auth, ui, testing, utils, other -->

## Why should this be added?

<!-- Brief explanation of why this hint would benefit AI agents -->

## Files Added

- [ ] `public/registry/hints/<hint>/meta.json`
- [ ] `public/registry/hints/<hint>/hint.md`

## Hint Preview

<!-- Paste the contents of your hint.md or a summary of what it covers -->

```markdown
# Hint Name

...
```

## Checklist

- [ ] `meta.json` follows the schema
- [ ] `hint.md` includes relevant commands
- [ ] `hint.md` includes rules/guidelines for AI agents
- [ ] Tested locally with `agenthints add <hint>`
- [ ] I am the maintainer or have permission to submit these hints
