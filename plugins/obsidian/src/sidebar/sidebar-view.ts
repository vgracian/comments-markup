import { ItemView, MarkdownView, WorkspaceLeaf, debounce, TFile } from "obsidian";
import type CommentsMarkupPlugin from "../main";
import { parseDocument } from "../parser/parser";
import type { CommentEntry, ParsedDocument } from "../parser/types";
import { formatDate } from "../utils";

export const SIDEBAR_VIEW_TYPE = "comments-markup-sidebar";

export class CommentsSidebarView extends ItemView {
	private plugin: CommentsMarkupPlugin;
	private parsed: ParsedDocument | null = null;
	private showOpenOnly = false;

	constructor(leaf: WorkspaceLeaf, plugin: CommentsMarkupPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return SIDEBAR_VIEW_TYPE;
	}

	getDisplayText(): string {
		return "Comments";
	}

	getIcon(): string {
		return "message-square";
	}

	async onOpen(): Promise<void> {
		this.registerEvent(
			this.app.workspace.on("file-open", () => this.refresh())
		);
		this.registerEvent(
			this.app.vault.on(
				"modify",
				debounce(
					(file: TFile) => {
						const activeFile = this.app.workspace.getActiveFile();
						if (activeFile && file.path === activeFile.path) {
							this.refresh();
						}
					},
					300,
					true
				)
			)
		);
		this.refresh();
	}

	async onClose(): Promise<void> {
		this.contentEl.empty();
	}

	private async refresh(): Promise<void> {
		const file = this.app.workspace.getActiveFile();
		if (!file || file.extension !== "md") {
			this.renderEmpty();
			return;
		}

		const source = await this.app.vault.read(file);
		this.parsed = parseDocument(source);
		this.render();
	}

	private renderEmpty(): void {
		this.contentEl.empty();
		this.contentEl.createEl("div", {
			cls: "cm-sidebar-empty",
			text: "No active Markdown file.",
		});
	}

	private render(): void {
		if (!this.parsed) return;
		const { contentEl } = this;
		contentEl.empty();

		// Toolbar
		const toolbar = contentEl.createEl("div", { cls: "cm-sidebar-toolbar" });

		const filterBtn = toolbar.createEl("button", {
			cls: "cm-sidebar-filter-btn",
			text: this.showOpenOnly ? "Show all" : "Open only",
		});
		filterBtn.addEventListener("click", () => {
			this.showOpenOnly = !this.showOpenOnly;
			this.render();
		});

		const count = this.parsed.comments.length;
		const openCount = this.parsed.comments.filter(
			(c) => c.state === "open"
		).length;
		toolbar.createEl("span", {
			cls: "cm-sidebar-count",
			text: `${openCount} open / ${count} total`,
		});

		// Comment threads
		const list = contentEl.createEl("div", { cls: "cm-sidebar-list" });

		const comments = this.showOpenOnly
			? this.parsed.comments.filter((c) => c.state === "open")
			: this.parsed.comments;

		if (comments.length === 0) {
			list.createEl("div", {
				cls: "cm-sidebar-empty",
				text: this.showOpenOnly ? "No open comments." : "No comments in this file.",
			});
			return;
		}

		for (const comment of comments) {
			this.renderThread(list, comment);
		}
	}

	private renderThread(container: HTMLElement, comment: CommentEntry): void {
		const collapsed =
			comment.state === "resolved" &&
			this.plugin.settings.resolvedCollapsed;

		const details = container.createEl("details", {
			cls: "cm-sidebar-thread",
		});
		if (!collapsed) {
			details.setAttribute("open", "");
		}
		if (comment.state === "resolved") {
			details.addClass("cm-sidebar-resolved");
		}

		// Summary (clickable header)
		const summary = details.createEl("summary", {
			cls: "cm-sidebar-summary",
		});

		const stateIcon = summary.createEl("span", {
			cls: "cm-sidebar-state",
			text: comment.state === "resolved" ? "✓" : "○",
			title: comment.state === "resolved" ? "Reopen" : "Resolve",
		});
		stateIcon.addEventListener("click", (e) => {
			e.stopPropagation();
			e.preventDefault();
			this.toggleCommentState(comment.id);
		});

		summary.createEl("span", {
			cls: "cm-sidebar-thread-id",
			text: comment.id,
		});
		summary.createEl("span", {
			cls: "cm-comment-author",
			text: `@${comment.author}`,
		});

		// Navigate on click (but not on the state toggle)
		summary.addEventListener("click", (e) => {
			if ((e.target as HTMLElement).closest(".cm-sidebar-state")) return;
			this.navigateToAnchor(comment.id);
		});

		// Root comment body
		const rootBody = details.createEl("div", { cls: "cm-sidebar-root-body" });
		rootBody.createEl("div", {
			cls: "cm-comment-date",
			text: comment.date,
		});

		// Root comment text (editable if own comment)
		const rootTextEl = rootBody.createEl("div", {
			cls: "cm-sidebar-text",
			text: comment.text,
		});
		if (comment.author === this.plugin.settings.author) {
			rootTextEl.addClass("cm-sidebar-editable");
			rootTextEl.addEventListener("click", () => {
				this.editInline(rootTextEl, comment.text, (newText) => {
					this.modifyFile((source) => {
						const lines = source.split("\n");
						const parsed = parseDocument(source);
						const c = parsed.comments.find((x) => x.id === comment.id);
						if (!c) return source;
						const line = lines[c.line];
						const colonIdx = line.indexOf(": ");
						if (colonIdx === -1) return source;
						lines[c.line] = line.substring(0, colonIdx + 2) + newText;
						return lines.join("\n");
					});
				});
			});
		}

		// Replies
		for (const reply of comment.replies) {
			const replyEl = details.createEl("div", {
				cls: "cm-sidebar-reply",
			});

			const replyHeader = replyEl.createEl("div", {
				cls: "cm-sidebar-reply-header",
			});
			replyHeader.createEl("span", {
				cls: "cm-comment-author",
				text: `@${reply.author}`,
			});
			replyHeader.createEl("span", {
				cls: "cm-comment-date",
				text: reply.date,
			});

			const replyTextEl = replyEl.createEl("div", {
				cls: "cm-sidebar-text",
				text: reply.text,
			});
			if (reply.author === this.plugin.settings.author) {
				replyTextEl.addClass("cm-sidebar-editable");
				replyTextEl.addEventListener("click", () => {
					this.editInline(replyTextEl, reply.text, (newText) => {
						this.modifyFile((source) => {
							const lines = source.split("\n");
							const parsed = parseDocument(source);
							const c = parsed.comments.find((x) => x.id === comment.id);
							if (!c) return source;
							const r = c.replies.find((x) => x.number === reply.number);
							if (!r) return source;
							const line = lines[r.line];
							const colonIdx = line.indexOf(": ");
							if (colonIdx === -1) return source;
							lines[r.line] = line.substring(0, colonIdx + 2) + newText;
							return lines.join("\n");
						});
					});
				});
			}
		}

		// Reply input
		const replyBtn = details.createEl("button", {
			cls: "cm-sidebar-reply-btn",
			text: "Reply",
		});
		replyBtn.addEventListener("click", () => {
			// Replace button with input
			replyBtn.remove();
			const replyBox = details.createEl("div", { cls: "cm-sidebar-reply-box" });
			const input = replyBox.createEl("input", {
				type: "text",
				cls: "cm-sidebar-edit-input",
				placeholder: "Write a reply...",
			});
			input.focus();

			let submitted = false;
			const submit = () => {
				if (submitted) return;
				submitted = true;
				const text = input.value.trim();
				if (!text) {
					this.refresh();
					return;
				}
				this.modifyFile((source) => {
					const parsed = parseDocument(source);
					const c = parsed.comments.find((x) => x.id === comment.id);
					if (!c) return source;

					const nextNum = c.replies.length > 0
						? Math.max(...c.replies.map((r) => r.number)) + 1
						: 1;
					const date = formatDate(
						this.plugin.settings.dateFormat,
						this.plugin.settings.timezone
					);
					const author = this.plugin.settings.author;
					const replyLine = `  {^${comment.id}.${nextNum}} @${author} ${date}: ${text}`;

					const lines = source.split("\n");
					const insertAfter = c.replies.length > 0
						? c.replies[c.replies.length - 1].line
						: c.line;
					lines.splice(insertAfter + 1, 0, replyLine);
					return lines.join("\n");
				});
			};

			input.addEventListener("keydown", (e) => {
				if (e.key === "Enter") submit();
				if (e.key === "Escape") { submitted = true; this.refresh(); }
			});
			input.addEventListener("blur", () => {
				if (input.value.trim()) {
					submit();
				} else {
					this.refresh();
				}
			});
		});
	}

	private editInline(
		el: HTMLElement,
		currentText: string,
		onSave: (newText: string) => void
	): void {
		if (el.querySelector("input")) return;

		el.empty();
		const input = el.createEl("input", {
			type: "text",
			cls: "cm-sidebar-edit-input",
			value: currentText,
		});
		input.focus();
		input.select();

		let saved = false;
		const save = () => {
			if (saved) return;
			saved = true;
			const newText = input.value.trim();
			if (newText && newText !== currentText) {
				onSave(newText);
			} else {
				this.refresh();
			}
		};

		input.addEventListener("keydown", (e) => {
			if (e.key === "Enter") save();
			if (e.key === "Escape") { saved = true; this.refresh(); }
		});
		input.addEventListener("blur", save);
	}

	private async modifyFile(transform: (source: string) => string): Promise<void> {
		const file = this.app.workspace.getActiveFile();
		if (!file) return;

		await this.app.vault.process(file, transform);
		// refresh is triggered by the vault modify event
	}

	private async toggleCommentState(commentId: string): Promise<void> {
		await this.modifyFile((source) => {
			const lines = source.split("\n");
			const escapedId = commentId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
			const re = new RegExp(
				`^(\\s*\\{\\^${escapedId}\\s+\\[)([ x])(\\]\\}.*)$`
			);

			for (let i = 0; i < lines.length; i++) {
				const match = lines[i].match(re);
				if (match) {
					const newState = match[2] === "x" ? " " : "x";
					lines[i] = match[1] + newState + match[3];
					break;
				}
			}
			return lines.join("\n");
		});
	}

	private navigateToAnchor(id: string): void {
		const file = this.app.workspace.getActiveFile();
		if (!file || !this.parsed) return;

		const anchor = this.parsed.anchors.find((a) => a.id === id);
		if (!anchor) return;

		// Find the MarkdownView showing this file
		const leaves = this.app.workspace.getLeavesOfType("markdown");
		for (const leaf of leaves) {
			const view = leaf.view;
			if (view instanceof MarkdownView && view.file?.path === file.path) {
				const editor = view.editor;
				editor.setCursor({ line: anchor.line, ch: anchor.col });
				editor.scrollIntoView(
					{
						from: { line: anchor.line, ch: anchor.col },
						to: { line: anchor.line, ch: anchor.col + anchor.length },
					},
					true
				);
				this.app.workspace.revealLeaf(leaf);
				editor.focus();
				return;
			}
		}
	}
}
