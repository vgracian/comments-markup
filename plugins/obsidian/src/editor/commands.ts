import { Editor, MarkdownView, Modal, App } from "obsidian";
import type CommentsMarkupPlugin from "../main";
import { parseDocument } from "../parser/parser";
import { formatDate, nextCommentId } from "../utils";

export function registerCommands(plugin: CommentsMarkupPlugin) {
	plugin.addCommand({
		id: "insert-comment",
		name: "Insert comment",
		editorCallback: (editor: Editor, view: MarkdownView) => {
			ensureAuthor(plugin, () => insertComment(editor, plugin));
		},
	});

	plugin.addCommand({
		id: "reply-to-comment",
		name: "Reply to comment",
		editorCallback: (editor: Editor, view: MarkdownView) => {
			ensureAuthor(plugin, () => replyToComment(editor, plugin));
		},
	});

	plugin.addCommand({
		id: "toggle-resolve",
		name: "Toggle comment resolved",
		editorCallback: (editor: Editor, view: MarkdownView) => {
			toggleResolve(editor);
		},
	});

	plugin.addCommand({
		id: "show-comments-panel",
		name: "Show comments panel",
		callback: () => {
			openSidebar(plugin);
		},
	});
}

function ensureAuthor(plugin: CommentsMarkupPlugin, callback: () => void) {
	if (plugin.settings.author) {
		callback();
		return;
	}

	const modal = new AuthorPromptModal(plugin.app, async (author) => {
		plugin.settings.author = author;
		await plugin.saveSettings();
		callback();
	});
	modal.open();
}

class AuthorPromptModal extends Modal {
	private onSubmit: (author: string) => void;

	constructor(app: App, onSubmit: (author: string) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl("h3", { text: "Set your author name" });
		contentEl.createEl("p", {
			text: "This will be used as your @author identifier in comments.",
		});

		const input = contentEl.createEl("input", {
			type: "text",
			placeholder: "e.g. alice",
		});
		input.addClass("cm-author-input");
		input.focus();

		const submitBtn = contentEl.createEl("button", { text: "Save" });
		submitBtn.addClass("mod-cta");
		submitBtn.addEventListener("click", () => {
			const value = input.value.trim().replace(/\s+/g, "-");
			if (value) {
				this.onSubmit(value);
				this.close();
			}
		});

		input.addEventListener("keydown", (e) => {
			if (e.key === "Enter") {
				submitBtn.click();
			}
		});
	}

	onClose() {
		this.contentEl.empty();
	}
}

function insertComment(editor: Editor, plugin: CommentsMarkupPlugin) {
	const source = editor.getValue();
	const parsed = parseDocument(source);
	const id = nextCommentId(parsed);
	const date = formatDate(
		plugin.settings.dateFormat,
		plugin.settings.timezone
	);
	const author = plugin.settings.author;
	const cursor = editor.getCursor();

	// Insert anchor at cursor
	const anchorText = `{^${id}}`;
	editor.replaceRange(anchorText, cursor);

	// Find or create Comments section
	const lines = editor.getValue().split("\n");
	let commentsSectionLine = -1;
	for (let i = 0; i < lines.length; i++) {
		if (/^##\s+Comments\s*$/.test(lines[i])) {
			commentsSectionLine = i;
			break;
		}
	}

	const commentDef = `{^${id} [ ]} @${author} ${date}: `;

	if (commentsSectionLine === -1) {
		// Append Comments section at the end
		const lastLine = editor.lastLine();
		const appendText = `\n\n## Comments\n\n${commentDef}`;
		editor.replaceRange(appendText, {
			line: lastLine,
			ch: lines[lastLine].length,
		});
		// Place cursor at end of comment definition
		const newLines = editor.getValue().split("\n");
		const defLine = newLines.length - 1;
		editor.setCursor({ line: defLine, ch: newLines[defLine].length });
	} else {
		// Find the last comment/reply line after the section heading
		let insertLine = commentsSectionLine + 1;
		for (let i = commentsSectionLine + 1; i < lines.length; i++) {
			if (lines[i].trim() !== "") {
				insertLine = i + 1;
			}
		}
		// Insert after the last comment, with a blank line separator
		const insertText = `\n${commentDef}`;
		editor.replaceRange(insertText, { line: insertLine, ch: 0 });
		// Place cursor at end of comment definition
		const newLines = editor.getValue().split("\n");
		editor.setCursor({
			line: insertLine + 1,
			ch: newLines[insertLine + 1]?.length || 0,
		});
	}
}

function replyToComment(editor: Editor, plugin: CommentsMarkupPlugin) {
	const source = editor.getValue();
	const parsed = parseDocument(source);
	const cursor = editor.getCursor();
	const currentLine = editor.getLine(cursor.line);

	// Try to detect which comment the cursor is on
	const commentRe = /\{\^([a-zA-Z0-9_-]+)(?:\s+\[[ x]\]|\.\d+)\}/;
	const match = currentLine.match(commentRe);

	if (!match) {
		// Try to find a nearby anchor
		const anchorRe = /\{\^([a-zA-Z0-9_-]+)\}/;
		const anchorMatch = currentLine.match(anchorRe);
		if (anchorMatch) {
			addReply(editor, plugin, parsed, anchorMatch[1]);
			return;
		}
		// No context — show notice
		// eslint-disable-next-line no-new
		new (require("obsidian").Notice)(
			"Place cursor on a comment, reply, or anchor to reply."
		);
		return;
	}

	addReply(editor, plugin, parsed, match[1]);
}

function addReply(
	editor: Editor,
	plugin: CommentsMarkupPlugin,
	parsed: ReturnType<typeof parseDocument>,
	commentId: string
) {
	const comment = parsed.comments.find((c) => c.id === commentId);
	if (!comment) return;

	const nextReplyNum =
		comment.replies.length > 0
			? Math.max(...comment.replies.map((r) => r.number)) + 1
			: 1;

	const date = formatDate(
		plugin.settings.dateFormat,
		plugin.settings.timezone
	);
	const author = plugin.settings.author;
	const replyDef = `  {^${commentId}.${nextReplyNum}} @${author} ${date}: `;

	// Insert after the last reply (or the root comment)
	const lastLine =
		comment.replies.length > 0
			? comment.replies[comment.replies.length - 1].line
			: comment.line;

	// We need to find the actual line in the current document
	// Re-parse to get accurate line numbers
	const currentParsed = parseDocument(editor.getValue());
	const currentComment = currentParsed.comments.find(
		(c) => c.id === commentId
	);
	if (!currentComment) return;

	const insertAfterLine =
		currentComment.replies.length > 0
			? currentComment.replies[currentComment.replies.length - 1].line
			: currentComment.line;

	editor.replaceRange(`\n${replyDef}`, {
		line: insertAfterLine,
		ch: editor.getLine(insertAfterLine).length,
	});

	const newLines = editor.getValue().split("\n");
	editor.setCursor({
		line: insertAfterLine + 1,
		ch: newLines[insertAfterLine + 1]?.length || 0,
	});
}

function toggleResolve(editor: Editor) {
	const cursor = editor.getCursor();
	const line = editor.getLine(cursor.line);

	const commentRe = /^(\s*\{\^[a-zA-Z0-9_-]+\s+\[)([ x])(\]\}.*)$/;
	const match = line.match(commentRe);
	if (!match) return;

	const newState = match[2] === "x" ? " " : "x";
	const newLine = match[1] + newState + match[3];
	editor.replaceRange(
		newLine,
		{ line: cursor.line, ch: 0 },
		{ line: cursor.line, ch: line.length }
	);
}

function openSidebar(plugin: CommentsMarkupPlugin) {
	const existing = plugin.app.workspace.getLeavesOfType(
		"comments-markup-sidebar"
	);
	if (existing.length > 0) {
		plugin.app.workspace.revealLeaf(existing[0]);
		return;
	}

	const leaf = plugin.app.workspace.getRightLeaf(false);
	if (leaf) {
		leaf.setViewState({
			type: "comments-markup-sidebar",
			active: true,
		});
	}
}
