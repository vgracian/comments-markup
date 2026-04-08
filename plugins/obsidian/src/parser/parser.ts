import type { Anchor, CommentEntry, ReplyEntry, ParsedDocument } from "./types";

const ID = "[a-zA-Z][a-zA-Z0-9_-]*";
const AUTHOR = "[a-zA-Z0-9_-]+";
const DATE = "\\d{4}-\\d{2}-\\d{2}(?:T\\d{2}:\\d{2}(?::\\d{2})?(?:Z|[+-]\\d{2}:\\d{2}))?";

const ANCHOR_RE = new RegExp(`(?<!\\\\)\\{\\^(${ID})\\}`, "g");
const COMMENT_RE = new RegExp(
	`^\\s*\\{\\^(${ID})\\s+\\[([ xX])\\]\\}\\s+@(${AUTHOR})\\s+(${DATE}):\\s+(.*)`
);
const REPLY_RE = new RegExp(
	`^\\s*\\{\\^(${ID})((?:\\.\\d+)+)\\}\\s+@(${AUTHOR})\\s+(${DATE}):\\s+(.*)`
);

export function parseDocument(source: string): ParsedDocument {
	const lines = source.split("\n");
	const anchors: Anchor[] = [];
	const comments: CommentEntry[] = [];
	const replies: ReplyEntry[] = [];
	const warnings: string[] = [];

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];

		// Try comment first (most specific)
		const commentMatch = line.match(COMMENT_RE);
		if (commentMatch) {
			comments.push({
				id: commentMatch[1],
				state: commentMatch[2] === " " ? "open" : "resolved",
				author: commentMatch[3],
				date: commentMatch[4],
				text: commentMatch[5],
				line: i,
				replies: [],
			});
			continue;
		}

		// Try reply
		const replyMatch = line.match(REPLY_RE);
		if (replyMatch) {
			const nums = replyMatch[2]
				.split(".")
				.filter((n) => n !== "")
				.map((n) => parseInt(n, 10));
			replies.push({
				id: replyMatch[1],
				numbers: nums,
				author: replyMatch[3],
				date: replyMatch[4],
				text: replyMatch[5],
				line: i,
			});
			continue;
		}

		// Collect anchors from non-comment/reply lines
		let match: RegExpExecArray | null;
		ANCHOR_RE.lastIndex = 0;
		while ((match = ANCHOR_RE.exec(line)) !== null) {
			anchors.push({
				id: match[1],
				line: i,
				col: match.index,
				length: match[0].length,
			});
		}
	}

	// Group replies under parent comments
	const commentMap = new Map(comments.map((c) => [c.id, c]));
	for (const reply of replies) {
		const parent = commentMap.get(reply.id);
		if (parent) {
			parent.replies.push(reply);
		} else {
			warnings.push(
				`Orphan reply {^${reply.id}.${reply.numbers.join(".")}} on line ${reply.line}`
			);
		}
	}

	// Sort replies by number chain
	for (const comment of comments) {
		comment.replies.sort((a, b) => {
			for (let i = 0; i < Math.min(a.numbers.length, b.numbers.length); i++) {
				if (a.numbers[i] !== b.numbers[i]) return a.numbers[i] - b.numbers[i];
			}
			return a.numbers.length - b.numbers.length;
		});
	}

	// Separate document-level comments (no matching anchor)
	const anchorIds = new Set(anchors.map((a) => a.id));
	const documentComments = comments.filter((c) => !anchorIds.has(c.id));
	const anchoredComments = comments.filter((c) => anchorIds.has(c.id));

	// Warn about orphan anchors
	const commentIds = new Set(comments.map((c) => c.id));
	for (const anchor of anchors) {
		if (!commentIds.has(anchor.id)) {
			warnings.push(`Orphan anchor {^${anchor.id}} on line ${anchor.line}`);
		}
	}

	return { anchors, comments: anchoredComments, documentComments, warnings };
}
