---
name: comments-markup
description: "Syntax for threaded commenting in Markdown files. Anchors inline, comments at the end, replies with threading, resolution via checkbox. Complementary to CriticMarkup."
---

# CommentsMarkup

Syntax for threaded commenting in Markdown files. Complementary to CriticMarkup (both use `{}` delimiters, no conflict).

## Anchor (inline, in document body)

```
{^id}
```

Place immediately after the text the comment refers to. ID must start with a letter, followed by letters, digits, hyphens, or underscores. IDs should be lowercase and must be unique in the document.

## Comment (in Comments section)

```
{^id [ ]} @author date: text
{^id [x]} @author date: text
```

- `[x]` or `[X]`: resolved. `[ ]`: open.
- The colon immediately after the date is the delimiter; no space before the colon.
- A comment must contain text and occupies exactly one line. For extended discussion, link to an external document.
- Comment order in the file is not significant.

## Reply

```
  {^id.1} @author date: text
    {^id.1.1} @author date: text
```

Indent two spaces per nesting level (readability convention; parsers accept any whitespace). Replies nest to arbitrary depth. Only root comments carry the state checkbox.

A reply must have a parent. Numbering gaps are valid (do not renumber after deletions).

## Resolve

Change `[ ]` to `[x]` on the root comment.

## ID conventions

- Default: `c1`, `c2`, `c3`
- Typed: `c1` (comment), `q1` (question), `t1` (task), `r1` (review)
- Descriptive: `check-deps`, `needs-source`

## Date

ISO 8601 with one restriction: when time is present, timezone is REQUIRED.

- Date only: `2026-04-07`
- With time: `2026-04-07T15:30+02:00`
- With seconds: `2026-04-07T15:30:45+02:00`
- UTC: `2026-04-07T13:30Z`

## Document-level comment

A comment without a corresponding anchor in the document body:

```
{^doc [ ]} @_claude 2026-04-07T10:00+00:00: No test coverage found for the rollback procedure.
```

## Escape

Write `\{^` to produce literal `{^` without creating an anchor. Use this when generating text that contains `{^` outside of comment syntax.

## AI agent conventions

From the spec:

- Sign as `@_agentname` (underscore prefix): `@_claude`, `@_copilot`

Operational guidance (not in spec):

- Do not modify or delete comments authored by others
- Do not resolve threads unless explicitly asked
- When deleting your own comment, remove the entire thread (root + all replies)
- If you encounter orphan anchors or orphan replies, leave them alone

## Example

```markdown
The migration should be completed by Q3{^q1}. All teams
must update their client libraries{^t1} before the cutoff.

## Comments

{^q1 [x]} @alice 2026-03-15T10:15+01:00: Are we sure Q3 is realistic?
  {^q1.1} @bob 2026-03-15T11:00-05:00: Yes, assumes two new hires by May.
  {^q1.2} @alice 2026-03-15T11:30+01:00: OK, but what if hiring slips?
    {^q1.2.1} @bob 2026-03-15T12:00-05:00: Then we push to Q4.

{^t1 [ ]} @carol 2026-03-16: Update the migration guide before teams start.
  {^t1.1} @_claude 2026-03-16T14:00+00:00: Guide updated in commit a3f06f8.
```

## Reference

Full specification: [CommentsMarkup v0.2.0 (draft)](https://github.com/vgracian/comments-markup/blob/main/spec/CommentsMarkup.md)
