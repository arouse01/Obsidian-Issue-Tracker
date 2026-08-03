import {
	App,
	// MarkdownView,
	// MarkdownFileInfo,
	// CachedMetadata,
	Modal,
	Notice,
	Plugin,
	Events,
	TFile
} from 'obsidian';
import { MyProjectManager } from './projectManager';
import {
	IssueContext,
	ProjectInfo,
	CreateIssueRequest,
	IssueModalOptions,
	PRIORITIES,
	TimeSession,
	TimeSummary
} from "./types";
import {
	formatIssueID,
	formatTimestamp
} from './utils';

export class TimeTracker extends Events {

	constructor(
		private app: App,
		private projectManager: MyProjectManager,
		private getTimeLogPath: () => string
	) {
		super();
	}

	async startProjectSession(
		project: ProjectInfo,
		additive: boolean = false
	): Promise<void> {
		/*
		- Get current timestamp
		- Check if there's an open project
			- if so, close it first with timestamp
		- Add entry to json file with project and timestamp
		*/
		const currTS = new Date().toISOString();
		let sessions = await this.loadSessions();
		const activeSessions = this.findActiveSessions(sessions);
		if (!additive && activeSessions.length > 0) {
			// if additive is false, it means we want to close all active sessions before starting a new one
			sessions = this.stopSessions(sessions, currTS);
		}
		sessions.push({
			id: crypto.randomUUID(),
			projectPath: project.file.path,
			start: currTS,
			end: null
		});

		await this.saveSessions(sessions);

	}

	async stopProjectSession(
		project: ProjectInfo
	): Promise<void> {
		/*
		- Get current timestamp
		- Check if there's an open project
			- if so, close it first with timestamp
		- Add entry to json file with project and timestamp
		*/
		const currTS = new Date().toISOString();
		let sessions = await this.loadSessions();
		const activeSessions = this.findActiveSessions(sessions);
		const projectSessions = activeSessions.filter(
			session => session.projectPath === project.file.path
		);
		if (projectSessions.length === 0) {
			return; // that project has no active sessions, so no need to do anything
		}

		sessions = this.stopSessions(sessions, currTS, project.file.path);


		await this.saveSessions(sessions);

	}

	private stopSessions(
		sessions: TimeSession[],
		stopTime: string,
		projectPath: string | null = null
	): TimeSession[] {
		// if projectPath is null, then stop all running projects, otherwise just stop the ones for the specified project
		return sessions.map(session => {
			const stopBool =
				session.end === null &&
				(projectPath === null || session.projectPath === projectPath);

			if (stopBool) {
				return {
					...session,
					end: stopTime
				};
			}
			return session;
		});
	}

	private async loadSessions(): Promise<TimeSession[]> {
		const path = this.getTimeLogPath();
		const file = this.app.vault.getAbstractFileByPath(path);

		if (!(file instanceof TFile)) {
			return [];
		}

		const json = await this.app.vault.read(file);

		return JSON.parse(json) as TimeSession[];
	}

	private async saveSessions(
		sessions: TimeSession[]
	): Promise<void> {
		const path = this.getTimeLogPath();
		const file = this.app.vault.getAbstractFileByPath(path);
		//console.log(file);
		const timeData = JSON.stringify(sessions)

		if (file && (file instanceof TFile)) {
			// timeLog file exists, write to it
			await this.app.vault.modify(file, timeData);
		} else {
			await this.app.vault.create(path, timeData);
		}

		this.trigger("time-tracker-updated");  // trigger an update of displays related to time tracking

	}

	private findActiveSessions(
		sessions: TimeSession[]
	): TimeSession[] {
		return sessions.filter(s => s.end === null)  // return any sessions with an end of null, meaning they're open
	}

	async getActiveProjectPaths(): Promise<Set<string>> {
		const sessions = await this.loadSessions();

		return new Set(
			this.findActiveSessions(sessions)
				.map(session => session.projectPath)
		);
		

	}

	async getTimeSummary(
		rangeStart: Date,
		rangeEnd: Date
	): Promise<TimeSummary[]> {
		// Get summary of time worked between start and end for all projects
		const sessions = await this.loadSessions();

		const activeProjects = this.projectManager.getActiveProjects();

		// initialize the summary table
		const summaryArray = new Map<string, number>();
		// initialize the active project rows
		for (const project of activeProjects) {
			summaryArray.set(project.file.path, 0);
		}

		for (const session of sessions) {
			const sessionStart = this.roundToNearest15(new Date(session.start), true);

			const sessionEnd = session.end
				? this.roundToNearest15(new Date(session.end), false)
				: this.roundToNearest15(new Date(), false);

			// Check if session overlaps start or end, and just grab part that is within range
			if (
				sessionStart >= rangeEnd ||
				sessionEnd <= rangeStart
			) {
				continue;  // ignore any sessions that start after or end before the target range
			}

			const effectiveStart =
				sessionStart > rangeStart
					? sessionStart
					: rangeStart;
			const effectiveEnd =
				sessionEnd < rangeEnd ? sessionEnd : rangeEnd;

			const durationMs = effectiveEnd.getTime() - effectiveStart.getTime();

			const durationMinutes = Math.round(durationMs / (1000 * 60));

			const currentTotal = summaryArray.get(session.projectPath) ?? 0;

			summaryArray.set(
				session.projectPath,
				currentTotal + durationMinutes
			);

		}

		const results: TimeSummary[] = [];

		for (const [projectPath, totalMinutes] of summaryArray) {
			results.push({
				projectPath,
				totalMinutes
			});
		}

		return results;

	}

	private roundToNearest15(date: Date, start: boolean): Date {
		const msInterval = 15 * 60 * 1000; // 15 minutes in milliseconds
		if (start) {
			return new Date(Math.floor(date.getTime() / msInterval) * msInterval);
		} else {
			return new Date(Math.ceil(date.getTime() / msInterval) * msInterval);
		}
		
	}
	
}
