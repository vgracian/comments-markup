import { MarkdownPostProcessorContext, MarkdownView } from "obsidian";
import type CommentsMarkupPlugin from "../main";
import { parseDocument } from "../parser/parser";
import type { CommentEntry } from "../parser/types";

export function createPostProcessor(plugin: CommentsMarkupPlugin) {
	return (el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
		processAnchors(el, plugin);
		processCommentDefinitions(el, plugin, ctx);
	};
}

function processAnchors(el: HTMLElement, plugin: CommentsMarkupPlugin) {
	const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
	const anchorRe = /\{\^([a-zA-Z0-9_-]+)\}/g;
	const nodesToReplace: { node: Text; matches: { id: string; index: number; length: number }[] }[] = [];

	let node: Text | null;
	while ((node = walker.nextNode() as Text | null)) {
		const text = node.textContent || "";
		const matches: { id: string; index: number; length: number }[] = [];
		let match: RegExpExecArray | null;
		anchorRe.lastIndex = 0;
		while ((match = anchorRe.exec(text)) !== null) {
			matches.push({ id: match[1], index: match.index, length: match[0].length });
		}
		if (matches.length > 0) {
			nodesToReplace.push({ node, matches });
		}
	}

	for (const { node, matches } of nodesToReplace) {
		const text = node.textContent || "";
		const fragment = document.createDocumentFragment();
		let lastIndex = 0;

		for (const m of matches) {
			if (m.index > lastIndex) {
				fragment.appendChild(document.createTextNode(text.slice(lastIndex, m.index)));
			}
			const marker = createAnchorMarker(m.id, plugin);
			fragment.appendChild(marker);
			lastIndex = m.index + m.length;
		}

		if (lastIndex < text.length) {
			fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
		}

		node.parentNode?.replaceChild(fragment, node);
	}
}

function createAnchorMarker(id: string, plugin: CommentsMarkupPlugin): HTMLElement {
	const style = plugin.settings.anchorStyle;
	const marker = document.createElement("span");
	marker.addClass("cm-anchor-marker");
	marker.dataset.commentId = id;
	marker.setAttribute("title", `Comment: ${id}`);
	marker.setAttribute("aria-label", `Comment anchor ${id}`);

	if (style === "superscript") {
		const sup = document.createElement("sup");
		sup.addClass("cm-anchor-superscript");
		sup.textContent = id.replace(/^c/, "");
		marker.appendChild(sup);
	} else if (style === "icon") {
		marker.addClass("cm-anchor-icon");
		marker.textContent = "💬";
	} else {
		marker.addClass("cm-anchor-highlight");
		marker.textContent = `[${id}]`;
	}

	marker.addEventListener("click", () => {
		// Navigate to the comment in the sidebar
		const leaves = plugin.app.workspace.getLeavesOfType("comments-markup-sidebar");
		if (leaves.length > 0) {
			plugin.app.workspace.revealLeaf(leaves[0]);
		}
	});

	return marker;
}

function processCommentDefinitions(
	el: HTMLElement,
	plugin: CommentsMarkupPlugin,
	ctx: MarkdownPostProcessorContext
) {
	const sectionInfo = ctx.getSectionInfo(el);
	if (!sectionInfo) return;

	const source = sectionInfo.text;
	const lineStart = sectionInfo.lineStart;
	const lineEnd = sectionInfo.lineEnd;

	// Extract just this section's lines
	const allLines = source.split("\n");
	const sectionLines = allLines.slice(lineStart, lineEnd + 1);
	const sectionText = sectionLines.join("\n");

	// Parse the section for comment definitions
	const parsed = parseDocument(sectionText);
	if (parsed.comments.length === 0) return;

	// Replace the entire element content with rendered comments
	el.empty();
	el.addClass("cm-comments-section");

	for (const comment of parsed.comments) {
		const threadEl = renderThread(comment, plugin, ctx);
		el.appendChild(threadEl);
	}
}

function renderThread(
	comment: CommentEntry,
	plugin: CommentsMarkupPlugin,
	ctx: MarkdownPostProcessorContext
): HTMLElement {
	const threadEl = document.createElement("div");
	threadEl.addClass("cm-comment-thread");
	if (comment.state === "resolved") {
		threadEl.addClass("cm-comment-resolved");
	}

	// Root comment
	const rootEl = document.createElement("div");
	rootEl.addClass("cm-comment-root");

	const headerEl = document.createElement("div");
	headerEl.addClass("cm-comment-header");

	// State checkbox
	const checkbox = document.createElement("input");
	checkbox.type = "checkbox";
	checkbox.checked = comment.state === "resolved";
	checkbox.addClass("cm-comment-checkbox");
	checkbox.addEventListener("click", (e) => {
		e.preventDefault();
		toggleCommentState(comment.id, plugin);
	});
	headerEl.appendChild(checkbox);

	// Author
	const authorEl = document.createElement("span");
	authorEl.addClass("cm-comment-author");
	authorEl.textContent = `@${comment.author}`;
	headerEl.appendChild(authorEl);

	// Date
	const dateEl = document.createElement("span");
	dateEl.addClass("cm-comment-date");
	dateEl.textContent = comment.date;
	headerEl.appendChild(dateEl);

	// ID badge
	const idEl = document.createElement("span");
	idEl.addClass("cm-comment-id");
	idEl.textContent = comment.id;
	headerEl.appendChild(idEl);

	rootEl.appendChild(headerEl);

	const textEl = document.createElement("div");
	textEl.addClass("cm-comment-text");
	textEl.textContent = comment.text;
	rootEl.appendChild(textEl);

	threadEl.appendChild(rootEl);

	// Replies
	for (const reply of comment.replies) {
		const replyEl = document.createElement("div");
		replyEl.addClass("cm-comment-reply");

		const replyHeader = document.createElement("div");
		replyHeader.addClass("cm-comment-header");

		const replyAuthor = document.createElement("span");
		replyAuthor.addClass("cm-comment-author");
		replyAuthor.textContent = `@${reply.author}`;
		replyHeader.appendChild(replyAuthor);

		const replyDate = document.createElement("span");
		replyDate.addClass("cm-comment-date");
		replyDate.textContent = reply.date;
		replyHeader.appendChild(replyDate);

		replyEl.appendChild(replyHeader);

		const replyText = document.createElement("div");
		replyText.addClass("cm-comment-text");
		replyText.textContent = reply.text;
		replyEl.appendChild(replyText);

		threadEl.appendChild(replyEl);
	}

	return threadEl;
}

function toggleCommentState(commentId: string, plugin: CommentsMarkupPlugin) {
	const view = plugin.app.workspace.getActiveViewOfType(MarkdownView);
	if (!view) return;

	const editor = view.editor;
	const source = editor.getValue();
	const lines = source.split("\n");

	// Find the comment definition line
	const commentRe = new RegExp(
		`^(\\s*\\{\\^${escapeRegex(commentId)}\\s+\\[)([ x])(\\]\\}.*)$`
	);

	for (let i = 0; i < lines.length; i++) {
		const match = lines[i].match(commentRe);
		if (match) {
			const newState = match[2] === "x" ? " " : "x";
			const newLine = match[1] + newState + match[3];
			editor.replaceRange(
				newLine,
				{ line: i, ch: 0 },
				{ line: i, ch: lines[i].length }
			);
			break;
		}
	}
}

function escapeRegex(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
