import { describe, it, expect } from "vitest";
import { parseDocument } from "./parser";

describe("parseDocument", () => {
	describe("anchors", () => {
		it("parses a single anchor", () => {
			const result = parseDocument("Hello{^c1} world");
			expect(result.anchors).toHaveLength(1);
			expect(result.anchors[0]).toEqual({
				id: "c1",
				line: 0,
				col: 5,
				length: 5,
			});
		});

		it("parses multiple anchors on one line", () => {
			const result = parseDocument("A{^a1} and B{^b2} end");
			expect(result.anchors).toHaveLength(2);
			expect(result.anchors[0].id).toBe("a1");
			expect(result.anchors[1].id).toBe("b2");
		});

		it("parses anchors with hyphens and underscores", () => {
			const result = parseDocument("Text{^my-comment_1}");
			expect(result.anchors[0].id).toBe("my-comment_1");
		});

		it("parses anchors on multiple lines", () => {
			const result = parseDocument("Line one{^c1}\nLine two{^c2}");
			expect(result.anchors).toHaveLength(2);
			expect(result.anchors[0].line).toBe(0);
			expect(result.anchors[1].line).toBe(1);
		});
	});

	describe("comments", () => {
		it("parses an open comment", () => {
			const result = parseDocument(
				"{^c1 [ ]} @alice 2026-03-15: Is this correct?"
			);
			expect(result.comments).toHaveLength(1);
			expect(result.comments[0]).toMatchObject({
				id: "c1",
				state: "open",
				author: "alice",
				date: "2026-03-15",
				text: "Is this correct?",
			});
		});

		it("parses a resolved comment", () => {
			const result = parseDocument(
				"{^c1 [x]} @bob 2026-03-15T10:00+02:00: Done."
			);
			expect(result.comments[0].state).toBe("resolved");
		});

		it("parses date-only format", () => {
			const result = parseDocument("{^c1 [ ]} @alice 2026-03-15: text");
			expect(result.comments[0].date).toBe("2026-03-15");
		});

		it("parses datetime with positive offset", () => {
			const result = parseDocument(
				"{^c1 [ ]} @alice 2026-03-15T10:15+01:00: text"
			);
			expect(result.comments[0].date).toBe("2026-03-15T10:15+01:00");
		});

		it("parses datetime with negative offset", () => {
			const result = parseDocument(
				"{^c1 [ ]} @bob 2026-03-15T11:00-05:00: text"
			);
			expect(result.comments[0].date).toBe("2026-03-15T11:00-05:00");
		});

		it("parses datetime with UTC (Z)", () => {
			const result = parseDocument(
				"{^c1 [ ]} @alice 2026-04-07T13:30Z: text"
			);
			expect(result.comments[0].date).toBe("2026-04-07T13:30Z");
		});

		it("does not create anchors from comment definition lines", () => {
			const result = parseDocument(
				"{^c1 [ ]} @alice 2026-03-15: text"
			);
			expect(result.anchors).toHaveLength(0);
		});
	});

	describe("replies", () => {
		it("parses a reply and groups it under parent", () => {
			const source = [
				"{^c1 [ ]} @alice 2026-03-15: Question?",
				"  {^c1.1} @bob 2026-03-15: Answer.",
			].join("\n");
			const result = parseDocument(source);
			expect(result.comments[0].replies).toHaveLength(1);
			expect(result.comments[0].replies[0]).toMatchObject({
				id: "c1",
				number: 1,
				author: "bob",
				text: "Answer.",
			});
		});

		it("sorts replies by number", () => {
			const source = [
				"{^c1 [ ]} @alice 2026-03-15: Q",
				"  {^c1.3} @carol 2026-03-15: Third",
				"  {^c1.1} @bob 2026-03-15: First",
				"  {^c1.2} @dave 2026-03-15: Second",
			].join("\n");
			const result = parseDocument(source);
			const replies = result.comments[0].replies;
			expect(replies.map((r) => r.number)).toEqual([1, 2, 3]);
		});

		it("does not create anchors from reply lines", () => {
			const result = parseDocument(
				"  {^c1.1} @bob 2026-03-15: Reply"
			);
			expect(result.anchors).toHaveLength(0);
		});
	});

	describe("full document (spec example)", () => {
		const source = `# Migration Plan

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
  {^c2.1} @dave 2026-03-16: They get a 401 with a descriptive error. See the RFC draft in \`/docs/auth-migration.md\`.

{^c3 [ ]} @bob 2026-03-17T09:00-05:00: Should we add a shared calendar for this?`;

		it("finds all anchors", () => {
			const result = parseDocument(source);
			expect(result.anchors).toHaveLength(3);
			expect(result.anchors.map((a) => a.id)).toEqual(["c1", "c2", "c3"]);
		});

		it("finds all comments with correct states", () => {
			const result = parseDocument(source);
			expect(result.comments).toHaveLength(3);
			expect(result.comments[0].state).toBe("resolved");
			expect(result.comments[1].state).toBe("open");
			expect(result.comments[2].state).toBe("open");
		});

		it("groups replies correctly", () => {
			const result = parseDocument(source);
			expect(result.comments[0].replies).toHaveLength(2);
			expect(result.comments[1].replies).toHaveLength(1);
			expect(result.comments[2].replies).toHaveLength(0);
		});

		it("preserves comment text", () => {
			const result = parseDocument(source);
			expect(result.comments[0].text).toBe(
				"Are we sure Q3 is realistic given current staffing?"
			);
		});
	});

	describe("edge cases", () => {
		it("handles empty document", () => {
			const result = parseDocument("");
			expect(result.anchors).toHaveLength(0);
			expect(result.comments).toHaveLength(0);
		});

		it("handles document with no comments section", () => {
			const result = parseDocument("Just some text{^c1} here.");
			expect(result.anchors).toHaveLength(1);
			expect(result.comments).toHaveLength(0);
		});

		it("handles orphan anchor (no matching comment)", () => {
			const result = parseDocument("Text{^orphan}");
			expect(result.anchors).toHaveLength(1);
			expect(result.anchors[0].id).toBe("orphan");
		});

		it("handles comment with no matching anchor", () => {
			const result = parseDocument(
				"{^c1 [ ]} @alice 2026-03-15: No anchor"
			);
			expect(result.comments).toHaveLength(1);
			expect(result.anchors).toHaveLength(0);
		});

		it("handles reply with no matching parent comment", () => {
			const result = parseDocument(
				"  {^c99.1} @bob 2026-03-15: Orphan reply"
			);
			// Reply is parsed but not attached to any comment
			expect(result.comments).toHaveLength(0);
		});
	});
});
