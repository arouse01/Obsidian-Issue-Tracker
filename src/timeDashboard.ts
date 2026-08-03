import {
	App,
	// MarkdownView,
	// MarkdownFileInfo,
	// CachedMetadata,
	ItemView,
	WorkspaceLeaf,
	ButtonComponent,
	Setting,
	TFile
} from 'obsidian';
import { MyProjectManager } from './projectManager';
import {
	IssueContext,
	ProjectInfo,
	CreateIssueRequest,
	IssueModalOptions,
	PRIORITIES,
	TimeSession
} from "./types";
import {
	formatIssueID,
	formatTimestamp
} from './utils';
import { TimeTracker } from './timeTracker';

export class TimeDashboardView extends ItemView {

	constructor(
		leaf: WorkspaceLeaf,
		private timeTracker: TimeTracker,
		private projectManager: MyProjectManager
	) {
		super(leaf);
	}

	getViewType(): string {
		return "time-dashboard";
	}

	getDisplayText(): string {
		return "Time Dashboard";
	}

	async onOpen(): Promise<void> {
		

		this.registerEvent(
			this.timeTracker.on(
				"time-tracker-updated",
				() => {
					void this.render()
				}
			)
		);

		await this.render();
	}

	async render(): Promise<void> {
		const container = this.contentEl;

		container.empty();

		const projects =
			this.projectManager.getActiveProjects();
		const activePaths = await this.timeTracker.getActiveProjectPaths();

		const heading = this.contentEl.createEl(
			"h2",
			{ text: "Active Projects" }
		);

		const tableMainEl = this.contentEl.createEl('table');
		const tableMainHeaderEl = tableMainEl.createEl('thead');
		const headerMainRowEl = tableMainHeaderEl.createEl('tr');
		headerMainRowEl.createEl('th', { text: 'Status' });
		headerMainRowEl.createEl('th', { text: 'Project' });
		headerMainRowEl.createEl('th', { text: 'Action' });

		const mainBodyEl = tableMainEl.createEl('tbody');

		for (const project of projects) {
			
			// create row skeleton, and assign values to objects after (for cleaner visual code organization)
			const row = mainBodyEl.createEl('tr');

			const statusCell = row.createEl('td');
			const projectCell = row.createEl('td');
			const actionCell = row.createEl('td');

			
			const isActive = activePaths.has(project.file.path);
			if (isActive) {
				statusCell.setText("⏲");
			}

			projectCell.setText(project.file.name);

			new ButtonComponent(actionCell)
				.setButtonText(isActive ? "Stop" : "Start")
				.onClick(async () => {
					if (isActive) {
						await this.timeTracker.stopProjectSession(project)
					} else {
						await this.timeTracker.startProjectSession(project)
					}
				})
			

			

			
			

		}

	}
	}

