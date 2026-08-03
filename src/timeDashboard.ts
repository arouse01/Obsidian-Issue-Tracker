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
	TimeSession,
	TimeSummary
} from "./types";
import {
	formatIssueID,
	formatTimestamp
} from './utils';
import { TimeTracker } from './timeTracker';

export class TimeDashboardView extends ItemView {
	private summaryPeriod: "week" | "month" = "week";  // to drive the summary period selection
	private periodOffset = 0;  // to drive the summary period selection, how far in the past to go

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

		const projects = this.projectManager.getActiveProjects();
		const activePaths = await this.timeTracker.getActiveProjectPaths();

		const controlSection = this.contentEl.createEl("section");
		controlSection.createEl("h3", {
			text: "Active Projects"
		});
		controlSection.addClass('time-dashboard')
		const tableMainEl = controlSection.createEl('table');
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

			statusCell.addClass("time-dashboard-centered");
			const isActive = activePaths.has(project.file.path);
			if (isActive) {
				statusCell.setText("⏲");
			} else {
				statusCell.setText("💤");
			}

			projectCell.setText(project.name);

			actionCell.addClass("time-dashboard-centered");
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

		const { start, end } = this.getSummaryPeriod();

		const summarySection = this.contentEl.createEl("section");
		summarySection.createEl("h3", {
			text: "Summary"
		});


		summarySection.addClass('time-dashboard')

		const summaryControlsTop = summarySection.createDiv();
		summaryControlsTop.addClass('summary-controls')

		summaryControlsTop.createEl('label', {
			text: 'Summarize by:',
			attr: { for: 'period-selector' } 
		});
		const periodSelect = summaryControlsTop.createEl('select', {
			cls: 'summary-period-select',
			attr: { id: 'period-selector' } 
		});
		periodSelect.createEl('option', {
			value: 'week',
			text: "Week"
		});
		periodSelect.createEl('option', {
			value: 'month',
			text: "Month"
		});
		periodSelect.value = this.summaryPeriod;

		periodSelect.addEventListener("change", () => {
			const value = periodSelect.value;

			if (value === "week" || value === "month") {
				this.summaryPeriod = value;
				void this.render();
			}
		});

		const summaryControlsBottom = summarySection.createDiv();
		summaryControlsBottom.addClass('summary-controls')
		new ButtonComponent(summaryControlsBottom)
			.setButtonText("⏴")
			.setClass("arrow-button")
			.onClick(async () => {
				this.periodOffset--;
				await this.render();
			});


		let dateRangeText: string;
		if (this.summaryPeriod === "week") {
			dateRangeText = `${window.moment(start).format("MMM DD")} - ${window.moment(end).format("MMM DD")}`
		} else {
			dateRangeText = window.moment(start).format("MMMM YYYY")
		}
		summaryControlsBottom.createSpan({
			text: dateRangeText,
			cls: "fixed-width-date-range"
			})

		new ButtonComponent(summaryControlsBottom)
			.setButtonText("⏵")
			.setClass("arrow-button")
			.onClick(async () => {
				this.periodOffset++;
				await this.render();
			})

		new ButtonComponent(summaryControlsBottom)
			.setButtonText("Now")
			.onClick(async () => {
				this.periodOffset = 0;
				await this.render();
			})

		// select.style.width = "100%";

		const tableSummaryEl = summarySection.createEl('table');
		tableSummaryEl.addClass('summary-section')
		const tableSummaryHeaderEl = tableSummaryEl.createEl('thead');
		const headerSummaryRowEl = tableSummaryHeaderEl.createEl('tr');
		headerSummaryRowEl.createEl('th', { text: 'Project' });
		headerSummaryRowEl.createEl('th', { text: 'Time' });

		const summaryBodyEl = tableSummaryEl.createEl('tbody');

		

		const summaryTotals = await this.timeTracker.getTimeSummary(start, end);
		/*
			summaryTotals are returned as array of TimeSummary objects 
			which is projectPath (string) and totalMinutes (number), so 
			we have to loop through and assign to the table
		*/
		for (const timeSum of summaryTotals) {

			// create row skeleton, and assign values to objects after (for cleaner visual code organization)
			const row = summaryBodyEl.createEl('tr');

			const projectCell = row.createEl('td');
			const totalCell = row.createEl('td');

			
			const file = this.app.vault.getAbstractFileByPath(timeSum.projectPath);

			if (file instanceof TFile) {
				const projectName = file.basename;
				projectCell.setText(projectName);
			}
			

			const durationText = this.formatMinutes(timeSum.totalMinutes);
			totalCell.setText(durationText)

		}
	}

	private getSummaryPeriod(): { start: Date; end: Date } {
		const start = window.moment()
			.add(this.periodOffset, this.summaryPeriod)
			.startOf(this.summaryPeriod)
			.toDate();

		const end = window.moment()
			.add(this.periodOffset, this.summaryPeriod)
			.endOf(this.summaryPeriod)
			.toDate();

		return { start, end };
	}

	private formatMinutes(totalMinutes: number): string {
		const hours = Math.floor(totalMinutes / 60).toString().padStart(2,'0');
		const minutes = (totalMinutes % 60).toString().padStart(2, '0');
		return `${hours}:${minutes}`
	}
}

