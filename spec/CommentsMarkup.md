# CommentsMarkup Specification

**Version:** 0.2.0 (draft)
**Date:** 2026-04-08
**Status:** Draft

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119).

## Overview

CommentsMarkup is a Markdown extension for threaded commenting. It allows multiple authors to leave comments on specific parts of a document, reply in threads, and mark comments as resolved.

CommentsMarkup is a **point comment** system: each comment is anchored to a single position in the document. It does not define range annotations (highlighting a span of text with start and end points). For range marking, CriticMarkup's highlight syntax (`{== ==}`) can be used alongside CommentsMarkup anchors.

CommentsMarkup is a complementary extension to [CriticMarkup](https://criticmarkup.com/). Where CriticMarkup handles *editing* (insertions, deletions, substitutions), CommentsMarkup handles *conversation* (comments, threads, resolution). Both use `{}` delimiters and can appear in the same document without conflict.

## Design Principles

1. **Plain text first.** Comments are readable without rendering. A human can open the raw file and read every comment, its author, and its state.
2. **Non-destructive.** Anchors do not alter the meaning of the text they are attached to. The comment body lives separately from the document content.
3. **Footnote pattern.** Anchors inline, content at the end. Many Markdown processors support footnotes (`[^1]`, originating in [PHP Markdown Extra](https://michelf.ca/projects/php-markdown/extra/#footnotes)). CommentsMarkup follows the same spatial logic.
4. **Minimal syntax.** Four concepts: anchor, comment, reply, state. Escaping uses Markdown's existing backslash mechanism, not a new one.
5. **Compatible.** CommentsMarkup coexists with standard Markdown, GFM, CommonMark, CriticMarkup, footnotes, and wikilinks without conflict.

## Syntax

### Anchor

An anchor marks the position in the document that a comment refers to.

```
{^id}
```

- `id` is an identifier that MUST start with a letter, followed by letters, digits, hyphens, or underscores. Case-sensitive; IDs SHOULD be lowercase to avoid accidental collisions between `{^C1}` and `{^c1}`. An ID MUST be unique within the document. Tools MUST NOT require or assume a specific ID prefix.
- The anchor is placed inline, immediately after the text it refers to.
- An anchor SHOULD have a corresponding comment definition. Parsers encountering an orphan anchor (an anchor without a comment definition) SHOULD ignore it without producing an error and MAY emit a warning.
- A comment definition without a corresponding anchor is valid and represents a **document-level comment** (not tied to a specific position). Parsers SHOULD render document-level comments separately from anchored comments.
- To write a literal `{^` in document text without creating an anchor, escape the opening brace with a backslash: `\{^`. This follows Markdown's standard backslash escape mechanism.

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
- `[x]` or `[X]` indicates a resolved comment.
- `@author` is a single-word identifier for the commenter (letters, digits, hyphens, underscores). By convention, identifiers starting with `_` are reserved for AI agents (e.g., `@_claude`, `@_copilot`).
- `date` uses ISO 8601 format as defined in the [Date Format](#date-format) section.
- The colon immediately after the date is the delimiter; it MUST be followed by a space. `text` is everything after that space to the end of the line. It may contain any characters, including additional `: ` sequences, inline Markdown (links, emphasis, wikilinks, etc.). A space before the colon is not valid: `2026-04-07: text` is correct, `2026-04-07 : text` is not.
- A comment MUST contain text. A comment occupies exactly one line: `text` runs to the end of the line. For extended discussion, link to an external document: `See [analysis](./notes/analysis.md) for details`.
- The order of comment definitions is not significant for parsers. Parsers MUST accept comment definitions in any order.

**Examples:**

```markdown
{^c1 [ ]} @alice 2026-04-07: Do we have a source for this claim?

{^c2 [x]} @bob 2026-04-07T15:30+02:00: This contradicts section 3.

{^c3 [ ]} @carol 2026-04-07T09:00-05:00: Can we clarify what "several factors" means?
```

### Reply

A reply extends a comment thread. It uses the parent's ID followed by a dot and a sequential number.

```
  {^id.n} @author date: text
```

- `n` is a positive integer, starting at 1. Numbering is sequential within each parent; gaps are tolerated (e.g., if a reply is deleted, parsers MUST NOT reject the remaining replies).
- Replies are indented by two spaces per nesting level relative to the root comment for readability. This is a convention; parsers MUST accept replies regardless of leading whitespace.
- Replies do NOT carry a state checkbox. Resolution belongs to the thread (the root comment), not to individual messages.
- Replies may nest to arbitrary depth. `{^c1.1}` replies to `{^c1}`, `{^c1.1.1}` replies to `{^c1.1}`, and so on. Each level appends `.n` to its parent's ID.
- A line is a reply if and only if the ID portion contains at least one dot (`.`); otherwise it is a root comment. The dot is not part of the `id` character set, so the distinction is unambiguous at the grammar level.
- A reply MUST have a parent (either a root comment or another reply). When deleting a comment, the entire thread (root and all replies) SHOULD be deleted together. Parsers encountering an orphan reply (a reply whose parent does not exist) SHOULD ignore it without producing an error and MAY emit a warning.

**Examples:**

```markdown
{^c1 [ ]} @alice 2026-04-07: Do we have a source for this claim?
  {^c1.1} @bob 2026-04-07: Robinson 1979, chapter 3.
  {^c1.2} @alice 2026-04-07: Thanks, adding the reference now.
    {^c1.2.1} @bob 2026-04-07: Also check chapter 5, it has the updated figures.
```

### State

- `[ ]` — open. The comment is unresolved and requires attention.
- `[x]` or `[X]` — resolved. The conversation is concluded. Parsers MUST accept both cases.

State is a property of the root comment only. To resolve a comment, change `[ ]` to `[x]` on the root line. A parser MUST treat any comment without `[x]` or `[X]` as open.

## Date Format

Dates use [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) format with one additional restriction: when time is present, timezone is REQUIRED (ISO 8601 itself permits local time without timezone; this specification requires it to avoid ambiguity in collaborative documents).

| Format | Meaning | Example |
|--------|---------|---------|
| `YYYY-MM-DD` | Date only (no time) | `2026-04-07` |
| `YYYY-MM-DDThh:mm±hh:mm` | Date, time, and timezone | `2026-04-07T15:30+02:00` |
| `YYYY-MM-DDThh:mm:ss±hh:mm` | With seconds (optional) | `2026-04-07T15:30:45+02:00` |
| `YYYY-MM-DDThh:mmZ` | Date and time in UTC | `2026-04-07T13:30Z` |

- Timezone offset format: `±hh:mm` or `Z` for UTC.
- Rendering tools SHOULD display dates in the user's local timezone.
- Date-only format (`YYYY-MM-DD`) carries no timezone information and is displayed as-is.

## Conventions (recommended, not required)

### Comments section

Place all comment definitions under a dedicated heading at the end of the document:

```markdown
## Comments
```

This is a convention, not a syntactic requirement. Authors may use any heading text, any heading level, or no heading at all. The parser identifies comments by their syntax (`{^id ...}`), not by their position relative to a heading.

For human readability, comments SHOULD appear in the same order as their anchors in the document body.

### Comment IDs

The minimum recommended form is a single-letter prefix followed by a sequential number: `c1`, `c2`, `c3`. Tools that generate IDs automatically SHOULD use this pattern.

Teams MAY adopt single-letter prefixes to indicate comment type:

| Prefix | Type | Example |
|--------|------|---------|
| `c` | Comment (general) | `{^c1}` |
| `q` | Question | `{^q1}` |
| `t` | Task | `{^t1}` |
| `r` | Review item | `{^r1}` |

This convention is OPTIONAL. Teams MAY define their own prefixes.

Descriptive IDs are equally valid: `{^source-needed}`, `{^todo-review}`.

**Examples:**

```markdown
The migration timeline seems aggressive{^q1}. All teams must update
their client libraries{^t1} before the cutoff. The new auth flow
has been tested internally{^r1}, but not yet with external partners.

## Comments

{^q1 [ ]} @carol 2026-04-07: Is Q3 realistic given current staffing?
  {^q1.1} @bob 2026-04-07: Only if we get two new hires by May.

{^t1 [ ]} @alice 2026-04-07T10:00+02:00: Add client library update to the sprint board.

{^r1 [x]} @dave 2026-04-07: External partner testing completed 2026-04-05. All clear.
```

Descriptive IDs work the same way:

```markdown
We should avoid using the legacy endpoint{^check-deprecation} after the
migration. The rollback procedure{^needs-diagram} is described in section 4.

## Comments

{^check-deprecation [ ]} @carol 2026-04-07: Has this endpoint been formally deprecated in the API docs?
  {^check-deprecation.1} @bob 2026-04-08: Not yet. I'll open a PR to mark it deprecated.

{^needs-diagram [x]} @alice 2026-04-07: Added a sequence diagram in commit `a3f06f8`.
```

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

The migration to the new API should be completed by Q3{^q1}. All clients
will need to update their authentication flow{^t1}, as the legacy token
format is being deprecated.

Teams should coordinate their migration schedules{^c1} to avoid
overlapping downtime windows. Several factors{^c2} contributed to
choosing this approach over a big-bang migration.

## Comments

{^doc [ ]} @_claude 2026-03-14T08:00:12+00:00: Automated check: no test coverage found for the rollback procedure.

{^q1 [x]} @alice 2026-03-15T10:15+01:00: Are we sure Q3 is realistic given current staffing?
  {^q1.1} @bob 2026-03-15T11:00-05:00: We discussed this in the planning meeting. Q3 assumes two new hires by May.
  {^q1.2} @alice 2026-03-15T11:30+01:00: OK, but what if hiring slips?
    {^q1.2.1} @bob 2026-03-15T12:00-05:00: Then we push to Q4. I'll flag it in the next standup.

{^t1 [ ]} @carol 2026-03-16: Update the client library migration guide before teams start.
  {^t1.1} @dave 2026-03-16: Done. See `/docs/auth-migration.md`.

{^c1 [ ]} @bob 2026-03-17T09:00-05:00: Should we add a shared calendar for this?

{^c2 [ ]} @bob 2026-03-17T09:15-05:00: I wrote up the full rationale in [factors-incremental-migration](./notes/factors-incremental-migration.md).
```

## Graceful Degradation

In a Markdown parser that does not support CommentsMarkup:

- **Anchors** (`{^c1}`) render as literal text in the document body. They occupy few characters and do not break the reading flow.
- **Comment definitions** render as readable plain text in the Comments section.
- **No content is lost or corrupted.** The document remains fully readable.

## Relationship with CriticMarkup

CommentsMarkup and CriticMarkup are complementary extensions using `{}` delimiters:

| Extension | Purpose | Syntax |
|-----------|---------|--------|
| CriticMarkup | Track changes (editing) | `{++ ++}` `{-- --}` `{~~ ~>  ~~}` `{== ==}` `{>> <<}` |
| CommentsMarkup | Threaded commenting | `{^ }` |

CriticMarkup's `{>> <<}` (comment) is an inline annotation, often paired with highlights or edits. CommentsMarkup's `{^ }` is a standalone system with authorship, threading, and state. They do not conflict: `{>>` and `{^` are distinct openers.

A document may use both extensions simultaneously:

```markdown
The deployment {--requires--}{++needs++} additional testing{^c1}.

## Comments

{^c1 [ ]} @alice 2026-04-07: Is "needs" strong enough here? Maybe "requires" was better after all.
  {^c1.1} @bob 2026-04-07: I changed it because "requires" sounds like a hard blocker. This is a recommendation.
```

## Formal Grammar

The grammar describes structural elements. All text fields (`text`, `author`) accept Unicode (UTF-8); the ABNF below uses ASCII core rules from [RFC 5234](https://www.rfc-editor.org/rfc/rfc5234) for structure only.

```
anchor       = "{^" id "}"
comment      = *WSP "{^" id SP state "}" SP "@" author SP date ":" SP text
reply        = *WSP "{^" id 1*("." number) "}" SP "@" author SP date ":" SP text
state        = "[" SP "]" / "[x]" / "[X]"
id           = ALPHA *(ALPHA / DIGIT / "-" / "_")
number       = 1*DIGIT
author       = 1*(ALPHA / DIGIT / "-" / "_")
date         = date-only / date-time
date-only    = 4DIGIT "-" 2DIGIT "-" 2DIGIT
date-time    = date-only "T" 2DIGIT ":" 2DIGIT [":" 2DIGIT] tz
tz           = "Z" / ("+" / "-") 2DIGIT ":" 2DIGIT
text         = 1*(VCHAR / SP / UTF8-non-ascii)
UTF8-non-ascii = %xC2-DF 1(%x80-BF) / %xE0-EF 2(%x80-BF) / %xF0-F4 3(%x80-BF)
```

## Acknowledgments

Thanks to Peter Kaminski ([@peterkaminski](https://github.com/peterkaminski)) for feedback that improved this specification.
