# CommentsMarkup

A Markdown extension for collaborative commenting.

Where [CriticMarkup](https://criticmarkup.com/) handles editing (insertions, deletions, substitutions), CommentsMarkup handles conversation: who said what, about which part, and whether it has been resolved.

## Quick Example

```markdown
The migration to the new API should be completed by Q3{^c1}.

## Comments

{^c1 [x]} @alice 2026-03-15: Are we sure Q3 is realistic?
  {^c1.1} @bob 2026-03-15: Yes, discussed in planning. Assumes two new hires by May.
```

## Syntax at a Glance

| Element | Syntax | Example |
|---------|--------|---------|
| Anchor | `{^id}` | `{^c1}` |
| Comment (open) | `{^id [ ]} @author date: text` | `{^c1 [ ]} @alice 2026-04-07: Needs source` |
| Comment (resolved) | `{^id [x]} @author date: text` | `{^c1 [x]} @alice 2026-04-07: Needs source` |
| Reply | `{^id.n} @author date: text` | `{^c1.1} @bob 2026-04-07: Done` |

Dates follow ISO 8601. When time is included, timezone is required: `2026-04-07T15:30+02:00`.

## Specification

Full spec: [spec/CommentsMarkup.md](spec/CommentsMarkup.md)

## Implementations

*Planned:*

- Obsidian plugin
- Python parser

## Why

Markdown has become the lingua franca of technical writing, documentation, and data management. Tools like Obsidian have made it the foundation of collaborative vaults where multiple people think, write, and build together.

Yet Markdown has no native way to comment. No way to say “I have a question about this paragraph,” attribute it, thread a reply, and mark it resolved. CriticMarkup solved the *editing* problem (track changes), but the *conversation* problem remains open.

CommentsMarkup fills that gap: a minimal, plain-text-native syntax for collaborative commenting that works in any Markdown file, travels with git, and can be rendered by any tool that chooses to support it.

## License

This work is licensed under [Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/).

See [LICENSE](LICENSE) for the full text.
