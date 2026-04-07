import type { Anchor, CommentEntry, ReplyEntry, ParsedDocument } from "./types";

const ANCHOR_RE = /\{\^([a-zA-Z0-9_-]+)\}/g;
const COMMENT_RE =
	/^\s*\{\^([a-zA-Z0-9_-]+)\s+\[([ x])\]\}\s+@([a-zA-Z0-9_-]+)\s+(\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:\d{2}))?):\s+(.*)/;
const REPLY_RE =
	/^\s*\{\^([a-zA-Z0-9_-]+)\.(\d+)\}\s+@([a-zA-Z0-9_-]+)\s+(\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:\d{2}))?):\s+(.*)/;

export function parseDocument(source: string): ParsedDocument {
	const lines = source.split("\n");
	const anchors: Anchor[] = [];
	const comments: CommentEntry[] = [];
	const replies: ReplyEntry[] = [];

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];

		// Try comment first (most specific)
		const commentMatch = line.match(COMMENT_RE);
		if (commentMatch) {
			comments.push({
				id: commentMatch[1],
				state: commentMatch[2] === "x" ? "resolved" : "open",
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
			replies.push({
				id: replyMatch[1],
				number: parseInt(replyMatch[2], 10),
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

	// Group replies under their parent comments
	for (const reply of replies) {
		const parent = comments.find((c) => c.id === reply.id);
		if (parent) {
			parent.replies.push(reply);
		}
	}

	// Sort replies by number within each comment
	for (const comment of comments) {
		comment.replies.sort((a, b) => a.number - b.number);
	}

	return { anchors, comments };
}
