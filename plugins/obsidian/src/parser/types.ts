export interface Anchor {
	id: string;
	line: number;
	col: number;
	length: number;
}

export interface ReplyEntry {
	id: string;
	number: number;
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
}
