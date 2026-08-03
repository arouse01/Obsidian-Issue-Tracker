import {
	Editor,
	TFile
} from 'obsidian';
export function formatIssueID(id: number): string {
	return id.toString().padStart(4, "0");
}

export function formatTimestamp(date: Date = new Date()): string {
	return [
		date.getFullYear(),
		String(date.getMonth() + 1).padStart(2, "0"),
		String(date.getDate()).padStart(2, "0")
	].join("-") + "T" +
		[
			String(date.getHours()).padStart(2, "0"),
			String(date.getMinutes()).padStart(2, "0"),
			String(date.getSeconds()).padStart(2, "0")
		].join(":");

}
