"""Tests for CommentsMarkup parser — ports TS suite + spec-correct additions."""

import pytest

from commentsmarkup import parse_document


# ---------------------------------------------------------------------------
# Anchors
# ---------------------------------------------------------------------------

class TestAnchors:
    def test_single_anchor(self):
        doc = parse_document("Hello{^c1} world")
        assert len(doc.anchors) == 1
        a = doc.anchors[0]
        assert a.id == "c1"
        assert a.line == 0
        assert a.col == 5
        assert a.length == 5

    def test_multiple_anchors_one_line(self):
        doc = parse_document("A{^a1} and B{^b2} end")
        assert len(doc.anchors) == 2
        assert doc.anchors[0].id == "a1"
        assert doc.anchors[1].id == "b2"

    def test_hyphens_and_underscores(self):
        doc = parse_document("Text{^my-comment_1}")
        assert doc.anchors[0].id == "my-comment_1"

    def test_multiple_lines(self):
        doc = parse_document("Line one{^c1}\nLine two{^c2}")
        assert len(doc.anchors) == 2
        assert doc.anchors[0].line == 0
        assert doc.anchors[1].line == 1

    def test_escaped_anchor_ignored(self):
        doc = parse_document(r"Not an anchor \{^c1} here")
        assert len(doc.anchors) == 0

    def test_id_must_start_with_letter(self):
        doc = parse_document("Bad{^1abc} good{^a1}")
        assert len(doc.anchors) == 1
        assert doc.anchors[0].id == "a1"


# ---------------------------------------------------------------------------
# Comments
# ---------------------------------------------------------------------------

class TestComments:
    def test_open_comment(self):
        doc = parse_document("{^c1 [ ]} @alice 2026-03-15: Is this correct?")
        assert len(doc.document_comments) == 1
        c = doc.document_comments[0]
        assert c.id == "c1"
        assert c.state == "open"
        assert c.author == "alice"
        assert c.date == "2026-03-15"
        assert c.text == "Is this correct?"

    def test_resolved_lowercase(self):
        doc = parse_document("{^c1 [x]} @bob 2026-03-15T10:00+02:00: Done.")
        assert doc.document_comments[0].state == "resolved"

    def test_resolved_uppercase(self):
        doc = parse_document("{^c1 [X]} @bob 2026-03-15: Done.")
        assert doc.document_comments[0].state == "resolved"

    def test_date_only(self):
        doc = parse_document("{^c1 [ ]} @alice 2026-03-15: text")
        assert doc.document_comments[0].date == "2026-03-15"

    def test_datetime_positive_offset(self):
        doc = parse_document("{^c1 [ ]} @alice 2026-03-15T10:15+01:00: text")
        assert doc.document_comments[0].date == "2026-03-15T10:15+01:00"

    def test_datetime_negative_offset(self):
        doc = parse_document("{^c1 [ ]} @bob 2026-03-15T11:00-05:00: text")
        assert doc.document_comments[0].date == "2026-03-15T11:00-05:00"

    def test_datetime_utc(self):
        doc = parse_document("{^c1 [ ]} @alice 2026-04-07T13:30Z: text")
        assert doc.document_comments[0].date == "2026-04-07T13:30Z"

    def test_datetime_with_seconds(self):
        doc = parse_document("{^c1 [ ]} @alice 2026-04-07T15:30:45+02:00: text")
        assert doc.document_comments[0].date == "2026-04-07T15:30:45+02:00"

    def test_no_anchors_from_comment_lines(self):
        doc = parse_document("{^c1 [ ]} @alice 2026-03-15: text")
        assert len(doc.anchors) == 0

    def test_ai_agent_author(self):
        doc = parse_document("{^c1 [ ]} @_claude 2026-04-07T10:00+00:00: AI note.")
        assert doc.document_comments[0].author == "_claude"

    def test_leading_whitespace(self):
        doc = parse_document("  {^c1 [ ]} @alice 2026-03-15: indented")
        assert doc.document_comments[0].id == "c1"


# ---------------------------------------------------------------------------
# Replies
# ---------------------------------------------------------------------------

class TestReplies:
    def test_reply_grouped_under_parent(self):
        source = "\n".join([
            "{^c1 [ ]} @alice 2026-03-15: Question?",
            "  {^c1.1} @bob 2026-03-15: Answer.",
        ])
        doc = parse_document(source)
        assert len(doc.document_comments) == 1
        c = doc.document_comments[0]
        assert len(c.replies) == 1
        assert c.replies[0].id == "c1"
        assert c.replies[0].numbers == [1]
        assert c.replies[0].author == "bob"
        assert c.replies[0].text == "Answer."

    def test_replies_sorted_by_number(self):
        source = "\n".join([
            "{^c1 [ ]} @alice 2026-03-15: Q",
            "  {^c1.3} @carol 2026-03-15: Third",
            "  {^c1.1} @bob 2026-03-15: First",
            "  {^c1.2} @dave 2026-03-15: Second",
        ])
        doc = parse_document(source)
        nums = [r.numbers[0] for r in doc.document_comments[0].replies]
        assert nums == [1, 2, 3]

    def test_no_anchors_from_reply_lines(self):
        doc = parse_document("  {^c1.1} @bob 2026-03-15: Reply")
        assert len(doc.anchors) == 0

    def test_nested_reply_depth_2(self):
        source = "\n".join([
            "{^c1 [ ]} @alice 2026-03-15: Root",
            "  {^c1.1} @bob 2026-03-15: Reply",
            "    {^c1.1.1} @carol 2026-03-15: Nested reply",
        ])
        doc = parse_document(source)
        replies = doc.document_comments[0].replies
        assert len(replies) == 2
        assert replies[0].numbers == [1]
        assert replies[1].numbers == [1, 1]

    def test_nested_reply_depth_3(self):
        source = "\n".join([
            "{^c1 [ ]} @alice 2026-03-15: Root",
            "  {^c1.2.1.1} @dave 2026-03-15: Deep",
        ])
        doc = parse_document(source)
        assert doc.document_comments[0].replies[0].numbers == [2, 1, 1]


# ---------------------------------------------------------------------------
# Full document (spec example)
# ---------------------------------------------------------------------------

class TestFullDocument:
    SOURCE = (
        "# Migration Plan\n"
        "\n"
        "The migration to the new API should be completed by Q3{^c1}. All clients\n"
        "will need to update their authentication flow{^c2}, as the legacy token\n"
        "format is being deprecated.\n"
        "\n"
        "Teams should coordinate their migration schedules{^c3} to avoid\n"
        "overlapping downtime windows.\n"
        "\n"
        "## Comments\n"
        "\n"
        "{^c1 [x]} @alice 2026-03-15T10:15+01:00: Are we sure Q3 is realistic given current staffing?\n"
        "  {^c1.1} @bob 2026-03-15T11:00-05:00: We discussed this in the planning meeting. Q3 assumes two new hires by May.\n"
        "  {^c1.2} @alice 2026-03-15T11:30+01:00: OK. Marking resolved, but we should revisit if hiring slips.\n"
        "\n"
        "{^c2 [ ]} @carol 2026-03-16: What happens to clients still using legacy tokens after the cutoff?\n"
        "  {^c2.1} @dave 2026-03-16: They get a 401 with a descriptive error. See the RFC draft in `/docs/auth-migration.md`.\n"
        "\n"
        "{^c3 [ ]} @bob 2026-03-17T09:00-05:00: Should we add a shared calendar for this?"
    )

    def test_finds_all_anchors(self):
        doc = parse_document(self.SOURCE)
        assert len(doc.anchors) == 3
        assert [a.id for a in doc.anchors] == ["c1", "c2", "c3"]

    def test_finds_all_comments_with_states(self):
        doc = parse_document(self.SOURCE)
        assert len(doc.comments) == 3
        assert doc.comments[0].state == "resolved"
        assert doc.comments[1].state == "open"
        assert doc.comments[2].state == "open"

    def test_groups_replies(self):
        doc = parse_document(self.SOURCE)
        assert len(doc.comments[0].replies) == 2
        assert len(doc.comments[1].replies) == 1
        assert len(doc.comments[2].replies) == 0

    def test_preserves_text(self):
        doc = parse_document(self.SOURCE)
        assert doc.comments[0].text == "Are we sure Q3 is realistic given current staffing?"

    def test_no_document_level_comments(self):
        doc = parse_document(self.SOURCE)
        assert len(doc.document_comments) == 0


# ---------------------------------------------------------------------------
# Document-level comments
# ---------------------------------------------------------------------------

class TestDocumentLevel:
    def test_comment_without_anchor_is_document_level(self):
        doc = parse_document("{^doc [ ]} @_claude 2026-04-07T10:00+00:00: No test coverage found.")
        assert len(doc.comments) == 0
        assert len(doc.document_comments) == 1
        assert doc.document_comments[0].id == "doc"

    def test_mixed_anchored_and_document_level(self):
        source = "\n".join([
            "Text{^c1} here.",
            "",
            "{^c1 [ ]} @alice 2026-03-15: Anchored comment",
            "{^meta [ ]} @bob 2026-03-15: Document-level note",
        ])
        doc = parse_document(source)
        assert len(doc.comments) == 1
        assert doc.comments[0].id == "c1"
        assert len(doc.document_comments) == 1
        assert doc.document_comments[0].id == "meta"


# ---------------------------------------------------------------------------
# Edge cases
# ---------------------------------------------------------------------------

class TestEdgeCases:
    def test_empty_document(self):
        doc = parse_document("")
        assert len(doc.anchors) == 0
        assert len(doc.comments) == 0
        assert len(doc.document_comments) == 0

    def test_no_comments_section(self):
        doc = parse_document("Just some text{^c1} here.")
        assert len(doc.anchors) == 1
        assert len(doc.comments) == 0

    def test_orphan_anchor_warning(self):
        doc = parse_document("Text{^orphan}")
        assert len(doc.anchors) == 1
        assert any("orphan" in w.lower() for w in doc.warnings)

    def test_comment_without_anchor(self):
        doc = parse_document("{^c1 [ ]} @alice 2026-03-15: No anchor")
        assert len(doc.document_comments) == 1
        assert len(doc.anchors) == 0

    def test_orphan_reply_warning(self):
        doc = parse_document("  {^c99.1} @bob 2026-03-15: Orphan reply")
        assert len(doc.comments) == 0
        assert any("orphan" in w.lower() for w in doc.warnings)
