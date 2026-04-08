# CommentsMarkup

A Markdown extension for threaded commenting. Complementary to [CriticMarkup](https://criticmarkup.com/): CriticMarkup handles editing (track changes), CommentsMarkup handles conversation (comments, threads, resolution).

## Quick Example

```markdown
The migration should be completed by Q3{^q1}. All teams
must update their client libraries{^t1} before the cutoff.

## Comments

{^q1 [x]} @alice 2026-03-15: Are we sure Q3 is realistic?
  {^q1.1} @bob 2026-03-15: Yes, discussed in planning. Assumes two new hires by May.
  {^q1.2} @alice 2026-03-15: OK, but what if hiring slips?
    {^q1.2.1} @bob 2026-03-15: Then we push to Q4.

{^t1 [ ]} @carol 2026-03-16: Update the migration guide before teams start.
```

## Syntax at a Glance

| Element | Syntax | Example |
|---------|--------|---------|
| Anchor | `{^id}` | `{^c1}`, `{^q1}`, `{^check-deps}` |
| Comment (open) | `{^id [ ]} @author date: text` | `{^c1 [ ]} @alice 2026-04-07: Needs source` |
| Comment (resolved) | `{^id [x]} @author date: text` | `{^c1 [x]} @alice 2026-04-07: Needs source` |
| Reply | `{^id.n} @author date: text` | `{^c1.1} @bob 2026-04-07: Done` |
| Nested reply | `{^id.n.n} @author date: text` | `{^c1.1.1} @carol 2026-04-07: Confirmed` |
| Document-level | `{^id [ ]} @author date: text` (no anchor) | `{^doc [ ]} @_claude 2026-04-07: No tests found` |
| Escape | `\{^` | Literal `{^`, not an anchor |

IDs MUST start with a letter. Teams MAY use prefixes (`c` comment, `q` question, `t` task, `r` review) or descriptive IDs (`{^check-deps}`). Dates use ISO 8601; timezone is required when time is present.

## Specification

Full spec: [spec/CommentsMarkup.md](spec/CommentsMarkup.md) (v0.2.0)

## Implementations

- [Obsidian plugin](plugins/obsidian/) — editor decorations, sidebar panel, commands for inserting and managing comments
- [AI agents](plugins/ai-agents/) — portable skill file for AI agents (Claude, Copilot, etc.)
- Python parser *(planned)*

## Why

Markdown has no native way to say «I have a question about this paragraph», attribute it, thread a reply, and mark it resolved. CriticMarkup solved the editing problem, but the conversation problem remains open.

CommentsMarkup fills that gap: a minimal, plain-text syntax for threaded commenting that works in any Markdown file and travels with git.

## License

Copyright 2026 V. Gracia.

This work is licensed under [Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/). See [LICENSE](LICENSE) for the full text.
