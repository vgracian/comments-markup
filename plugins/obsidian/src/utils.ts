import type { ParsedDocument } from "./parser/types";

export function formatDate(dateFormat: "datetime" | "dateonly", timezone?: string): string {
	const now = new Date();

	if (dateFormat === "dateonly") {
		const year = now.getFullYear();
		const month = String(now.getMonth() + 1).padStart(2, "0");
		const day = String(now.getDate()).padStart(2, "0");
		return `${year}-${month}-${day}`;
	}

	// datetime with timezone offset
	let offsetMinutes: number;

	if (timezone && timezone !== "system") {
		// Parse ±hh:mm offset string
		const match = timezone.match(/^([+-])(\d{2}):(\d{2})$/);
		if (match) {
			const sign = match[1] === "+" ? 1 : -1;
			offsetMinutes = sign * (parseInt(match[2], 10) * 60 + parseInt(match[3], 10));
		} else {
			offsetMinutes = -now.getTimezoneOffset();
		}
	} else {
		offsetMinutes = -now.getTimezoneOffset();
	}

	// Build date in the target offset
	const targetTime = new Date(now.getTime() + (offsetMinutes + now.getTimezoneOffset()) * 60000);
	const year = targetTime.getFullYear();
	const month = String(targetTime.getMonth() + 1).padStart(2, "0");
	const day = String(targetTime.getDate()).padStart(2, "0");
	const hours = String(targetTime.getHours()).padStart(2, "0");
	const minutes = String(targetTime.getMinutes()).padStart(2, "0");

	const absOffset = Math.abs(offsetMinutes);
	const offSign = offsetMinutes >= 0 ? "+" : "-";
	const offH = String(Math.floor(absOffset / 60)).padStart(2, "0");
	const offM = String(absOffset % 60).padStart(2, "0");

	return `${year}-${month}-${day}T${hours}:${minutes}${offSign}${offH}:${offM}`;
}

export function nextCommentId(parsed: ParsedDocument): string {
	let max = 0;
	for (const comment of parsed.comments) {
		const match = comment.id.match(/^c(\d+)$/);
		if (match) {
			const n = parseInt(match[1], 10);
			if (n > max) max = n;
		}
	}
	return `c${max + 1}`;
}
