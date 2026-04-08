# CommentsMarkup Python Parser

Spec-conformant parser for [CommentsMarkup v0.2.0](../../spec/CommentsMarkup.md) — threaded commenting syntax for Markdown.

## Install

```bash
pip install -e .
```

## Usage

```python
from commentsmarkup import parse_document

source = open("document.md").read()
doc = parse_document(source)

# Anchors in the document body
for anchor in doc.anchors:
    print(f"  Anchor {anchor.id} at line {anchor.line}, col {anchor.col}")

# Comments with matching anchors
for comment in doc.comments:
    status = "RESOLVED" if comment.state == "resolved" else "OPEN"
    print(f"  [{status}] {comment.id} by @{comment.author}: {comment.text}")
    for reply in comment.replies:
        depth = ".".join(map(str, reply.numbers))
        print(f"    .{depth} @{reply.author}: {reply.text}")

# Document-level comments (no anchor in body)
for comment in doc.document_comments:
    print(f"  [doc] {comment.id} by @{comment.author}: {comment.text}")

# Warnings (orphan anchors, orphan replies)
for warning in doc.warnings:
    print(f"  WARNING: {warning}")
```

### CI/CD: check for unresolved comments

```python
from commentsmarkup import parse_document

doc = parse_document(open("doc.md").read())
open_comments = [c for c in doc.comments + doc.document_comments if c.state == "open"]
if open_comments:
    for c in open_comments:
        print(f"UNRESOLVED: {c.id} by @{c.author} (line {c.line}): {c.text}")
    exit(1)
```

### AI agent tooling

```python
from commentsmarkup import parse_document

doc = parse_document(source)

# Find comments addressed to AI agents
ai_comments = [
    c for c in doc.comments + doc.document_comments
    if any(r.author.startswith("_") for r in c.replies)  # AI replied
    or c.author.startswith("_")                           # AI authored
]
```

## Development

```bash
pip install -e ".[dev]"
python -m pytest -v
```
