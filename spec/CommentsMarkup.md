# CommentsMarkup Specification

**Version:** 0.1.0 (draft)
**Date:** 2026-04-07
**Status:** Draft

## Overview

CommentsMarkup is a Markdown extension for collaborative commenting. It allows multiple authors to leave comments on specific parts of a document, reply in threads, and mark comments as resolved.

CommentsMarkup is the sister extension to [CriticMarkup](https://criticmarkup.com/). Where CriticMarkup handles *editing* (insertions, deletions, substitutions), CommentsMarkup handles *conversation* (comments, threads, resolution). Both share the curly brace `{}` family, and both are designed to coexist in the same document.

## Design Principles

1. **Plain text first.** Comments are readable without rendering. A human can open the raw file and understand every comment, who wrote it, and whether it is resolved.
2. **Non-destructive.** Comments do not alter the document content. The anchor is a small marker; the comment body lives separately.
3. **Footnote pattern.** Anchors inline, content at the end. This pattern is already established in Markdown with footnotes (`[^1]`). CommentsMarkup follows the same spatial logic.
4. **Minimal syntax.** Four concepts, four syntactic elements: anchor, comment, reply, state.
5. **Composable.** CommentsMarkup coexists with standard Markdown, GFM, CommonMark, CriticMarkup, footnotes, and wikilinks.

## Syntax

### Anchor

An anchor marks the position in the document that a comment refers to.

```
{^id}
```

- `id` is an alphanumeric identifier (letters, digits, hyphens, underscores). Case-sensitive.
- The anchor is placed inline, immediately after the text it refers to.
- An anchor MUST have a corresponding comment definition.

**Examples:**

```markdown
This claim needs a citation{^c1}.

The second paragraph{^c2} also raises questions.

Several factors contributed to the outcome{^c3}, most notably the timeline.
```

### Comment (root)

A comment is defined by its anchor ID, a state checkbox, an author, a date, and the comment text.

```
{^id [ ]} @author date: text
```

```
{^id [x]} @author date: text
```

- `[ ]` indicates an open (unresolved) comment.
- `[x]` indicates a resolved comment.
- `@author` is a single-word identifier for the commenter.
- `date` follows ISO 8601: either `YYYY-MM-DD` (date only) or `YYYY-MM-DDThh:mm±hh:mm` (date, time, and timezone offset). When time is included, the timezone offset is REQUIRED.
- `text` is the comment content, extending to the end of the line. It may contain inline Markdown (links, emphasis, wikilinks, etc.).

**Examples:**

```markdown
{^c1 [ ]} @alice 2026-04-07: Do we have a source for this claim?

{^c2 [x]} @bob 2026-04-07T15:30+02:00: This contradicts section 3.

{^c3 [ ]} @carol 2026-04-07T09:00-05:00: Can we clarify what "several factors" means?
```

### Reply

A reply extends a comment thread. It uses the parent comment's ID followed by a dot and a sequential number.

```
  {^id.n} @author date: text
```

- `n` is a positive integer, starting at 1, incrementing sequentially.
- Replies are indented by two spaces relative to the root comment (convention, not required by parsers).
- Replies do NOT carry a state checkbox. Resolution belongs to the thread (the root comment), not to individual messages.
- Replies may nest: `{^c1.1}`, `{^c1.2}`, `{^c1.3}`. Nesting beyond one level (`{^c1.1.1}`) is NOT part of this specification.

**Examples:**

```markdown
{^c1 [ ]} @alice 2026-04-07: Do we have a source for this claim?
  {^c1.1} @bob 2026-04-07: Robinson 1979, chapter 3.
  {^c1.2} @alice 2026-04-07: Thanks, adding the reference now.
```

### State

- `[ ]` — open. The comment is unresolved and requires attention.
- `[x]` — resolved. The conversation is concluded.

State is a property of the root comment only. To resolve a comment, change `[ ]` to `[x]` on the root line. A parser MUST treat any comment without `[x]` as open.

## Date Format

Dates follow [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601):

| Format | Meaning | Example |
|--------|---------|---------|
| `YYYY-MM-DD` | Date only (no time) | `2026-04-07` |
| `YYYY-MM-DDThh:mm±hh:mm` | Date, time, and timezone | `2026-04-07T15:30+02:00` |
| `YYYY-MM-DDThh:mmZ` | Date and time in UTC | `2026-04-07T13:30Z` |

- When time is included, timezone offset is REQUIRED (either `±hh:mm` or `Z` for UTC).
- Rendering tools SHOULD display dates in the user's local timezone.
- Date-only format (`YYYY-MM-DD`) carries no timezone information and is displayed as-is.

## Conventions (recommended, not required)

### Comments section

It is recommended to place all comment definitions under a dedicated heading at the end of the document:

```markdown
## Comments
```

This is a convention, not a syntactic requirement. Authors may use any heading text, any heading level, or no heading at all. The parser identifies comments by their syntax (`{^id ...}`), not by their position relative to a heading.

### Comment IDs

- IDs SHOULD be short and sequential: `c1`, `c2`, `c3`.
- Tools that generate IDs automatically SHOULD use this pattern.
- Manually written IDs are equally valid: `{^source-needed}`, `{^todo-review}`.

### Blank lines

A blank line between comment threads improves readability:

```markdown
{^c1 [x]} @alice 2026-04-07: Do we have a source for this?
  {^c1.1} @bob 2026-04-07: Robinson 1979, chapter 3.

{^c2 [ ]} @carol 2026-04-07: This contradicts section 3.
```

## Complete Example

```markdown
# Migration Plan

The migration to the new API should be completed by Q3{^c1}. All clients
will need to update their authentication flow{^c2}, as the legacy token
format is being deprecated.

Teams should coordinate their migration schedules{^c3} to avoid
overlapping downtime windows.

## Comments

{^c1 [x]} @alice 2026-03-15T10:15+01:00: Are we sure Q3 is realistic given current staffing?
  {^c1.1} @bob 2026-03-15T11:00-05:00: We discussed this in the planning meeting. Q3 assumes two new hires by May.
  {^c1.2} @alice 2026-03-15T11:30+01:00: OK. Marking resolved, but we should revisit if hiring slips.

{^c2 [ ]} @carol 2026-03-16: What happens to clients still using legacy tokens after the cutoff?
  {^c2.1} @dave 2026-03-16: They get a 401 with a descriptive error. See the RFC draft in `/docs/auth-migration.md`.

{^c3 [ ]} @bob 2026-03-17T09:00-05:00: Should we add a shared calendar for this?
```

## Graceful Degradation

In a Markdown parser that does not support CommentsMarkup:

- **Anchors** (`{^c1}`) render as literal text in the document body. They are small and visually unobtrusive.
- **Comment definitions** render as regular text in the Comments section. The syntax is human-readable by design.
- **No content is lost or corrupted.** The document remains fully readable.

## Relationship with CriticMarkup

CommentsMarkup and CriticMarkup are complementary extensions sharing the `{}` delimiter family:

| Extension | Purpose | Syntax |
|-----------|---------|--------|
| CriticMarkup | Track changes (editing) | `{++ ++}` `{-- --}` `{~~ ~>  ~~}` `{== ==}` `{>> <<}` |
| CommentsMarkup | Collaborative comments | `{^ }` |

CriticMarkup's `{>> <<}` (comment) is an inline annotation attached to an edit. CommentsMarkup's `{^ }` is a standalone comment system with authorship, threading, and state. They serve different purposes and do not conflict.

A document may use both extensions simultaneously:

```markdown
The deployment {--requires--}{++needs++} additional testing{^c1}.

## Comments

{^c1 [ ]} @alice 2026-04-07: Is "needs" strong enough here? Maybe "requires" was better after all.
  {^c1.1} @bob 2026-04-07: I changed it because "requires" sounds like a hard blocker. This is a recommendation.
```

## Formal Grammar

```
anchor       = "{^" id "}"
comment      = "{^" id SP state "}" SP "@" author SP date ":" SP text
reply        = "{^" id "." number "}" SP "@" author SP date ":" SP text
state        = "[" SP "]" / "[x]"
id           = 1*(ALPHA / DIGIT / "-" / "_")
number       = 1*DIGIT
author       = 1*(ALPHA / DIGIT / "-" / "_")
date         = date-only / date-time
date-only    = YYYY "-" MM "-" DD
date-time    = date-only "T" hh ":" mm tz
tz           = "Z" / ("+" / "-") hh ":" mm
text         = *CHAR
```
