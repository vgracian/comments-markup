import {
	EditorView,
	Decoration,
	DecorationSet,
	ViewPlugin,
	ViewUpdate,
	WidgetType,
} from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";
import type { CommentsMarkupSettings } from "../settings/settings";

const ANCHOR_RE = /\{\^([a-zA-Z0-9_-]+)\}/g;
const COMMENT_RE =
	/^\s*\{\^[a-zA-Z0-9_-]+\s+\[[ x]\]\}\s+@[a-zA-Z0-9_-]+\s+\d{4}-\d{2}-\d{2}/;
const REPLY_RE =
	/^\s*\{\^[a-zA-Z0-9_-]+\.\d+\}\s+@[a-zA-Z0-9_-]+\s+\d{4}-\d{2}-\d{2}/;

class AnchorWidget extends WidgetType {
	constructor(readonly id: string, readonly style: string) {
		super();
	}

	toDOM(): HTMLElement {
		const span = document.createElement("span");
		span.className = "cm-anchor-marker cm-anchor-inline";

		if (this.style === "superscript") {
			const sup = document.createElement("sup");
			sup.className = "cm-anchor-superscript";
			sup.textContent = this.id.replace(/^c/, "");
			span.appendChild(sup);
		} else if (this.style === "icon") {
			span.className += " cm-anchor-icon";
			span.textContent = "💬";
		} else {
			span.className += " cm-anchor-highlight";
			span.textContent = `[${this.id}]`;
		}

		return span;
	}

	eq(other: AnchorWidget): boolean {
		return this.id === other.id && this.style === other.style;
	}
}

function buildDecorations(view: EditorView, settings: CommentsMarkupSettings): DecorationSet {
	const builder = new RangeSetBuilder<Decoration>();
	const doc = view.state.doc;

	const decorations: { from: number; to: number; decoration: Decoration }[] = [];

	for (let i = 1; i <= doc.lines; i++) {
		const line = doc.line(i);
		const text = line.text;

		// Skip comment/reply definition lines for anchor replacement
		if (COMMENT_RE.test(text) || REPLY_RE.test(text)) {
			// Style the whole line as a comment definition
			decorations.push({
				from: line.from,
				to: line.from,
				decoration: Decoration.line({ class: "cm-comment-def-line" }),
			});
			continue;
		}

		// Find and replace anchors inline
		ANCHOR_RE.lastIndex = 0;
		let match: RegExpExecArray | null;
		while ((match = ANCHOR_RE.exec(text)) !== null) {
			const from = line.from + match.index;
			const to = from + match[0].length;
			decorations.push({
				from,
				to,
				decoration: Decoration.replace({
					widget: new AnchorWidget(match[1], settings.anchorStyle),
				}),
			});
		}
	}

	// Sort by position (required by RangeSetBuilder)
	decorations.sort((a, b) => a.from - b.from || a.to - b.to);
	for (const d of decorations) {
		builder.add(d.from, d.to, d.decoration);
	}

	return builder.finish();
}

export function createEditorExtensions(settingsGetter: () => CommentsMarkupSettings) {
	return ViewPlugin.fromClass(
		class {
			decorations: DecorationSet;

			constructor(view: EditorView) {
				this.decorations = buildDecorations(view, settingsGetter());
			}

			update(update: ViewUpdate) {
				if (update.docChanged || update.viewportChanged) {
					this.decorations = buildDecorations(update.view, settingsGetter());
				}
			}
		},
		{
			decorations: (v) => v.decorations,
		}
	);
}
