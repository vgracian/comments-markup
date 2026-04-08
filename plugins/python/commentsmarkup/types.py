"""Data types for CommentsMarkup parser."""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class Anchor:
    """An inline anchor marker ``{^id}`` in the document body."""

    id: str
    line: int  # 0-based
    col: int  # 0-based
    length: int  # length of the ``{^id}`` syntax


@dataclass
class Reply:
    """A reply entry ``{^id.n.n...}``."""

    id: str  # parent comment id (e.g. "c1")
    numbers: list[int]  # nesting path, e.g. [1] for .1, [1, 1] for .1.1
    author: str
    date: str
    text: str
    line: int  # 0-based


@dataclass
class Comment:
    """A root comment ``{^id [state]} @author date: text``."""

    id: str
    state: str  # "open" | "resolved"
    author: str
    date: str
    text: str
    line: int  # 0-based
    replies: list[Reply] = field(default_factory=list)


@dataclass
class ParsedDocument:
    """Result of parsing a CommentsMarkup document."""

    anchors: list[Anchor] = field(default_factory=list)
    comments: list[Comment] = field(default_factory=list)
    document_comments: list[Comment] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
