export interface Anchor {
	id: string;
	line: number;
	col: number;
	length: number;
}

export interface ReplyEntry {
	id: string;
	numbers: number[];  // nesting path, e.g. [1] for .1, [1, 1] for .1.1
	author: string;
	date: string;
	text: string;
	line: number;
}

export interface CommentEntry {
	id: string;
	state: "open" | "resolved";
	author: string;
	date: string;
	text: string;
	line: number;
	replies: ReplyEntry[];
}

export interface ParsedDocument {
	anchors: Anchor[];
	comments: CommentEntry[];
	documentComments: CommentEntry[];
	warnings: string[];
}
