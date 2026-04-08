"""CommentsMarkup parser — spec-conformant (v0.2.0)."""

from __future__ import annotations

import re

from .types import Anchor, Comment, ParsedDocument, Reply

# Building blocks (spec ABNF)
_ID = r"[a-zA-Z][a-zA-Z0-9_-]*"
_AUTHOR = r"[a-zA-Z0-9_-]+"  # author allows leading underscore (e.g. @_claude)
_DATE = r"\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:\d{2}))?"

COMMENT_RE = re.compile(
    rf"^\s*\{{\^({_ID})\s+\[([ xX])\]\}}\s+@({_AUTHOR})\s+({_DATE}):\s+(.+)"
)
REPLY_RE = re.compile(
    rf"^\s*\{{\^({_ID})((?:\.\d+)+)\}}\s+@({_AUTHOR})\s+({_DATE}):\s+(.+)"
)
# Negative lookbehind: skip escaped \{^
ANCHOR_RE = re.compile(rf"(?<!\\)\{{\^({_ID})\}}")


def parse_document(source: str) -> ParsedDocument:
    """Parse a CommentsMarkup document and return structured data."""
    lines = source.split("\n")
    anchors: list[Anchor] = []
    comments: list[Comment] = []
    replies: list[Reply] = []
    warnings: list[str] = []

    for i, line in enumerate(lines):
        # Try comment first (most specific)
        m = COMMENT_RE.match(line)
        if m:
            comments.append(
                Comment(
                    id=m.group(1),
                    state="resolved" if m.group(2) in ("x", "X") else "open",
                    author=m.group(3),
                    date=m.group(4),
                    text=m.group(5),
                    line=i,
                )
            )
            continue

        # Try reply
        m = REPLY_RE.match(line)
        if m:
            nums = [int(n) for n in m.group(2).split(".") if n]
            replies.append(
                Reply(
                    id=m.group(1),
                    numbers=nums,
                    author=m.group(3),
                    date=m.group(4),
                    text=m.group(5),
                    line=i,
                )
            )
            continue

        # Collect anchors from non-comment/reply lines
        for m in ANCHOR_RE.finditer(line):
            anchors.append(
                Anchor(
                    id=m.group(1),
                    line=i,
                    col=m.start(),
                    length=len(m.group(0)),
                )
            )

    # Group replies under parent comments
    comment_map = {c.id: c for c in comments}
    for reply in replies:
        parent = comment_map.get(reply.id)
        if parent:
            parent.replies.append(reply)
        else:
            warnings.append(f"Orphan reply {{^{reply.id}.{'.'.join(map(str, reply.numbers))}}} on line {reply.line}")

    # Sort replies by number chain
    for comment in comments:
        comment.replies.sort(key=lambda r: r.numbers)

    # Separate document-level comments (no matching anchor)
    anchor_ids = {a.id for a in anchors}
    document_comments = [c for c in comments if c.id not in anchor_ids]
    anchored_comments = [c for c in comments if c.id in anchor_ids]

    # Warn about orphan anchors
    comment_ids = {c.id for c in comments}
    for anchor in anchors:
        if anchor.id not in comment_ids:
            warnings.append(f"Orphan anchor {{^{anchor.id}}} on line {anchor.line}")

    return ParsedDocument(
        anchors=anchors,
        comments=anchored_comments,
        document_comments=document_comments,
        warnings=warnings,
    )
