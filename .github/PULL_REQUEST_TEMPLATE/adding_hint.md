---
name: Adding Hint
about: Add a new hint to the AgentHints registry
title: "feat(registry): add [HINT NAME]"
labels: registry
---

## Hint Details

**Hint Name:**
<!-- e.g., ultracite, prisma, drizzle -->

**Category:**
<!-- One of: code-quality, database, framework, api, auth, ui, testing, utils, other -->

**Description:**
<!-- Brief one-line description (max 100 characters) -->

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
- [ ] `pnpm validate-hints <hint>` passes
- [ ] `pnpm check` passes
- [ ] `pnpm type-check` passes
- [ ] Tested locally with `pnpm cli:local add <hint>`
- [ ] I am the maintainer or have permission to submit these hints
