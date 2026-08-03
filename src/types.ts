import {
	Editor,
	TFile
} from 'obsidian';

export interface IssueContext {
	editor: Editor,
	tempTitle: string;
	selectedText: string;
	projectPaths: string[] | null;
	projectNames: string[] | null;
	sourceFile: TFile;
	line: number;

}

export interface IssueData {
	project: ProjectInfo;
	priority: number;
	title: string;
	description: string;
	sourceFile: TFile;
}

export interface ProjectInfo {
	file: TFile;
	name: string;
	status: string;
}

export interface CreateIssueRequest {
	issue: IssueData;
	context: IssueContext;
}

export interface IssueModalOptions {
	context: IssueContext;
	projects: ProjectInfo[];
	priorities: PriorityOption[];
	onSubmit: (request: CreateIssueRequest) => Promise<void>;
}

export interface PriorityOption {
	value: number;
	label: string;
}

export const PRIORITIES: PriorityOption[] = [
	{ value: 0, label: "0 - Unassigned" },
	{ value: 1, label: "1 - Optional" },
	{ value: 2, label: "2 - Low" },
	{ value: 3, label: "3 - Medium" },
	{ value: 4, label: "4 - High" },
	{ value: 5, label: "5 - Urgent" },
]

export interface TimeSession {
	id: string;
	projectPath: string;
	start: string;
	end: string | null;  // null while session is active
}
