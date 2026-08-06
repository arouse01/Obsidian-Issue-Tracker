import {
	App,
	// MarkdownView,
	// MarkdownFileInfo,
	// CachedMetadata,
	Modal,
	Notice,
	Plugin,
	Setting,
	TFile
} from 'obsidian';
import {
	DEFAULT_SETTINGS,
	IssueTrackerSettings,
	IssueTrackerSettingTab,
} from './settings';
import { MyProjectManager } from './projectManager';
import { TimeTracker } from "./timeTracker";
import {
	IssueContext,
	ProjectInfo,
	CreateIssueRequest,
	IssueModalOptions,
	PRIORITIES
} from "./types";
import {
	formatIssueID,
	formatTimestamp
} from './utils';
import {
	TimeDashboardView
} from './timeDashboard';
import {
	ProjectDashboardView
} from './projectDashboard'



class IssueModal extends Modal {
	private title = "";
	private description: string;
	private selectedProject: ProjectInfo | null = null;
	private priority: number;
	private source: TFile;

	
	// onSubmit: (data: IssueData) => void;

	constructor(
		app: App,
		private options: IssueModalOptions

	) {
		super(app);

		// set the initial values for the items returned at the end
		this.title = options.context.tempTitle;
		this.description = options.context.selectedText;
		this.priority = 0;
		this.source = options.context.sourceFile;

		// this.selectedProject = this.options.projects.find(
		// 		p => p.file.path === options.context.projectPaths
		// 	) ?? null;
		// if (this.selectedProject === null) {
		// 	this.selectedProject = options.projects[0] ?? null;
		// }
		

	}	

	onOpen() {
		const { contentEl } = this;

		// this.setTitle('Create Issue');
		contentEl.empty();

		contentEl.createEl("h2", {
			text: "Create new issue"
		});

		const form = contentEl.createDiv({ cls: "issue-form" });
		this.buildTitleField(form);
		this.buildProjectDropdown(form);
		this.buildDescriptionField(form);
		this.buildPriorityDropdown(form);
		this.buildButtons(form);
		
		
	}

	onClose() {
		// const { contentEl } = this;
		this.contentEl.empty();
	}

	buildTitleField(parent: HTMLElement): void {
		parent.createEl("label", {
			text: "Title"
		});
		const input = parent.createEl("input", {
			type: "text"
		});
		// input.style.width = "100%";
		input.value = this.title;
		input.addEventListener("input", () => {
			this.title = input.value;
		});

		/*
		new Setting(parent)
			.setName("Title")
			.addText(text => {
				text.setValue(this.title);
				text.onChange(value => {
					this.title = value;
				});
			});
		*/
	}

	buildProjectDropdown(parent: HTMLElement) {
		parent.createEl("label", {
			text: "Project"
		});
		const select = parent.createEl("select");
		const relatedGroup = select.createEl("optgroup", {
			attr: { label: "Related Projects" }
		});
		const otherGroup = select.createEl("optgroup", {
			attr: { label: "Other Active Projects" }
		});
		const relatedPaths = new Set(this.options.context.projectPaths);
		const relatedProjects = this.options.projects.filter(project =>
			relatedPaths.has(project.file.path)
		);
		const otherProjects = this.options.projects.filter(project =>
			!relatedPaths.has(project.file.path)
		);
		for (const project of relatedProjects) {
			const option = relatedGroup.createEl("option");
			option.value = project.file.path;
			option.text = project.name;
		}

		for (const project of otherProjects) {
			const option = otherGroup.createEl("option");
			option.value = project.file.path;
			option.text = project.name;
		}
		// 

		// for (const project of this.options.projects) {
		// 	const group = relatedPaths.has(project.file.path)
		// 		? relatedGroup
		// 		: otherGroup;

		// 	const option = group.createEl("option");

		// 	option.value = project.file.path;
		// 	option.text = project.name;
		// }
		

		if (relatedProjects.length > 0) {
			this.selectedProject = relatedProjects[0]!;
		} else {
			this.selectedProject = otherProjects[0] ?? null;
		}
		if (this.selectedProject) {
			select.value = this.selectedProject.file.path;
		}
		select.addEventListener("change", () => {

			this.selectedProject =
				this.options.projects.find(
					p => p.file.path === select.value
				) ?? null;

		});
		/*
		new Setting(parent)
			.setName("Project")
			.addDropdown(dropdown => {
				// assign the values to the dropdown
				this.options.projects.forEach((project, index) => {
					dropdown.addOption(index.toString(),
						project.name
					);
				});
				// select the default value
				if (this.options.projects.length > 0) {
					dropdown.setValue("0");
					this.selectedProject = this.options.projects[0] ?? null;
				}

				// Update the selectedProject var if dropdown is changed
				dropdown.onChange(value => {
					const index = Number(value);
					this.selectedProject = this.options.projects[index] ?? null;
				});
			});
			*/
	}

	buildDescriptionField(parent: HTMLElement) {
		parent.createEl("label", {
			text: "Description"
		});
		const textarea = parent.createEl("textarea");
		// textarea.style.width = "100%";
		textarea.rows = 8;
		textarea.value = this.description;

		textarea.addEventListener("input", () => {
			this.description = textarea.value;
		});
		// new Setting(parent)
		// 	.setName("Description")
		// 	.addTextArea(text => {
		// 		text.inputEl.style.width = "100%";
		// 		text
		// 			.setValue(this.description)
		// 			.onChange(value => {
		// 				this.description = value;
		// 		});
		// 	});
	}

	buildPriorityDropdown(parent: HTMLElement) {
		parent.createEl("label", {
			text: "Priority"
		});
		const select = parent.createEl("select");
		// select.style.width = "100%";
		for (const priority of this.options.priorities) {
			const option = select.createEl("option");

			option.value = priority.value.toString();
			option.text = priority.label;
		}

		
		select.value = "0";


		select.addEventListener("change", () => {
			this.priority = Number(select.value);

		});
		/*
		new Setting(parent)
			.setName("Priority")
			.addDropdown(dropdown => {
				// assign the values to the dropdown
				this.options.priorities.forEach(priority => {
					dropdown.addOption(priority.value.toString(),
						priority.label
					);
				});
				
				// select the default value
				dropdown.setValue("0");
					

				// Update the selectedProject var if dropdown is changed
				dropdown.onChange(value => {
					
					this.priority = Number(value);
				});
			});
			*/
	}

	buildButtons(parent: HTMLElement) {
		new Setting(parent)
			.addButton(button => {

				button
					.setButtonText("Create")
					.setCta()
					.onClick(async () => {

						// check that project has been selected
						if (!this.selectedProject) {
							new Notice("Select a project.");
							return;
						}

						// build the IssueData var to pass out
						const request: CreateIssueRequest = {
							issue: {
								title: this.title,
								project: this.selectedProject,
								description: this.description,
								priority: this.priority,
								sourceFile: this.source
							},
							context: this.options.context
							
						};

						await this.options.onSubmit(
							request
						);

						this.close();

					});

			})
			.addButton(button => {

				button
					.setButtonText("Cancel")
					.onClick(() => this.close());

			});
	}

}

export default class IssueTracker extends Plugin {
	projectManager!: MyProjectManager;
	settings!: IssueTrackerSettings;
	timeTracker!: TimeTracker;

	async onload() {

		this.projectManager = new MyProjectManager(this.app);

		await this.loadSettings();

		this.timeTracker = new TimeTracker(
			this.app,
			this.projectManager,
			() => this.settings.timeLogPath
		);

		this.registerView(
			"time-dashboard",
			leaf => new TimeDashboardView(
				leaf,
				this.timeTracker,
				this.projectManager
			)
		);

		this.registerView(
			"project-dashboard",
			leaf => new ProjectDashboardView(
				leaf,
				this.timeTracker,
				this.projectManager
			)
		);

		this.addRibbonIcon(
			'folder-open-dot',
			'Open project dashboard',
			async (_evt: MouseEvent) => {
				// Called when the user clicks the icon.
				await this.activateProjectDashboard();
			});

		// Add the time tracking dashboard to the left 
		this.addRibbonIcon(
			'clock',
			'Open time dashboard',
			async (_evt: MouseEvent) => {
				// Called when the user clicks the icon.
				await this.activateTimeDashboard();
		});
		

		/*
				// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
				const statusBarItemEl = this.addStatusBarItem();
				statusBarItemEl.setText('Status bar text');
		*/
		

		this.registerEvent(
			this.app.workspace.on("editor-menu", (menu, editor, view) => {
				const selected = editor.getSelection().split(/\r?\n/);

				if (selected.length > 0) {
					menu.addItem(item => {
						item
							.setTitle("Create issue from selection")
							.setIcon("file-plus")
							.onClick(async () => {
								/*
								Create issue steps
									Prompt for issue title, project selection (Default to current note project)
									Get current note link
									Create new note in Issues folder
										Get next issue ID
									Assign Issue template
									Assign properties
										ID, Project, Origin
									Rename issue note
									Back in note, insert/replace link to issue note
								*/
								// const cursor = editor.getCursor();

								const tempTitle = selected[0] ?? ""
									.replace(/^[-*]\s*/, "")
									.trim();
								const lines = selected
									.slice(1)
									.join("\n")
									.trim();
								const sourceFile = view.file!;

								// get the project of the current document and its actual file location, if any
								const projectNames =
									this.projectManager.getFrontmatterStringArray(sourceFile, "project");
								// console.log('projects: ', projectNames);
								const projectPaths =
									this.projectManager.getFrontmatterStringArray(sourceFile, "project")
										.map(link => this.normalizeWikiLink(link))
										.map(link =>
											this.app.metadataCache.getFirstLinkpathDest(
												link,
												sourceFile.path
											)?.path
										)
										.filter((path): path is string => path !== undefined);

								/*
								let projectPath: string | null = null;

								if (projectName !== "") {

									const file =
										this.app.metadataCache.getFirstLinkpathDest(
											projectName,
											sourceFile.path
										);

									projectPath = file?.path ?? null;
								}
								*/

								const context: IssueContext = {
									editor: editor,
									tempTitle: tempTitle,
									selectedText: lines,
									sourceFile: sourceFile,
									line: editor.getCursor("from").line,
									projectPaths: projectPaths,
									projectNames: projectNames

								}

								// const selectedText = editor.getLine(editor.getCursor().line);
								const allProjects = this.projectManager.getActiveProjects();
								const currProjectSet = new Set(projectNames);
								const sortedProjects = [...allProjects].sort((a, b) => {
									const aSource = currProjectSet.has(a.file.path);
									const bSource = currProjectSet.has(b.file.path);
									if (aSource !== bSource) {
										return aSource ? -1 : 1;
									}

									return a.name.localeCompare(b.name);
								})

								const options: IssueModalOptions = {
									context: context,
									projects: sortedProjects,
									priorities: PRIORITIES,
									onSubmit: async (request) => {
										await this.createIssue(request);
									}

								}
								new IssueModal(
									this.app,
									options
								).open();


							});
					});
					menu.addItem(item => {
						item
							.setTitle("Add to issue")
							.setIcon("message-circle-plus")
							.onClick(async () => {
								/*
								Append to issue steps
									Select which issue (from open issues)	
									Go to end of "Activity" section 
									Add new subsection with meeting backlink
									Add selected text
								*/
							});
					});
				}
			})
		);

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new IssueTrackerSettingTab(this.app, this));
	}

	private sanitizeFilename(name: string): string {
		// remove any disallowed characters from intended filename
		return name.replace(/[\\/:*?"<>|]/g, "-");
	}

	async createIssue(request: CreateIssueRequest): Promise<void> {
		/*
		Input: IssueData
			project: ProjectInfo;
			priority: number;
			title: string;
			description: string;
			sourceFile?: TFile;
		Get next issue ID
		Create new note in Issues folder
		Assign properties
			ID, Project, Origin
		Back in note, insert/replace link to issue note
		
		*/

		let newFile: TFile;

		const issueID = await this.getNextIssueID();
		const filename = `${formatIssueID(issueID)} ${this.sanitizeFilename(request.issue.title)}`
		const path = `Issues/${filename}.md`
		const creationTS = formatTimestamp();
		const content =
		`---
ID: ${issueID}
Project: "[[${request.issue.project.name}]]"
Priority: ${request.issue.priority}
Issue Status: Open
Origin: "[[${request.issue.sourceFile.path}|${request.issue.sourceFile.basename}]]"
Creation Date: "${creationTS}"
tags:
- issue
---

# ${filename}

## Description

${request.issue.description}

## Activity

## Notes

## Resolution Notes

`;

		try {
			// Creates the file. Path must include extension (e.g., 'Folder/MyNote.md')
			newFile = await this.app.vault.create(path, content);
		} catch (error) {
			console.error("Failed to create file:", error);
			new Notice("Failed to create issue file.");
			return;
		}

		try {
			this.addIssueLinkToSource(request.context, newFile);
		} catch (error) {
			console.error("Issue created but failed to update source note: ", error)
			new Notice("Issue created, but could not add link to source note.");
		}

		
		

	}

	addIssueLinkToSource(
		context: IssueContext,
		issueFile: TFile
	): void {
		const link = ` [[${issueFile.basename}]]`;
		const line = context.editor.getLine(context.line);
		context.editor.setLine(
			context.line,
			line + link
		);

	}

	private normalizeWikiLink(link: string): string {
		if (!link) {
			return "";
		}
		const [path = ""] = link
			.replace(/^\[\[/, "")   // Remove leading [[
			.replace(/\]\]$/, "")   // Remove trailing ]]
			.split("|")             // Keep only the link path, remove any link alias

		return path.trim();
	}

	async activateProjectDashboard(): Promise<void> {

		const { workspace } = this.app;

		let leaf = workspace.getLeavesOfType(
			"project-dashboard"
		)[0];

		if (!leaf) {
			leaf = workspace.getLeaf("tab");

			if (!leaf) {
				return;
			}

			await leaf.setViewState({
				type: "project-dashboard",
				active: true
			});
		}

		await workspace.revealLeaf(leaf);
	}

	async activateTimeDashboard(): Promise<void> {

		const { workspace } = this.app;

		let leaf = workspace.getLeavesOfType(
			"time-dashboard"
		)[0];

		if (!leaf) {
			leaf = workspace.getRightLeaf(false);

			if (!leaf) {
				return;
			}

			await leaf.setViewState({
				type: "time-dashboard",
				active: true
			});
		}

		await workspace.revealLeaf(leaf);
	}

	/*
		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'create-issue-from-text',
			name: 'Create Issue',
			callback: () => {
				new SampleModal(this.app).open();
			},
		});
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'replace-selected',
			name: 'Replace selected content',
			editorCallback: (
				editor: Editor,
				_ctx: MarkdownView | MarkdownFileInfo,
			) => {
				editor.replaceSelection('Sample editor command');
			},
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'open-modal-complex',
			name: 'Open modal (complex)',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView =
					this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
				return false;
			},
		});
		*/
/*
		
*/


		/*// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(
			window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000),
		);*/


	onunload() {}

	private async getNextIssueID(): Promise<number> {
		const id = this.settings.nextIssueID;
		this.settings.nextIssueID++;
		await this.saveSettings();
		return id;
	}

	async loadSettings() {
		const data = await this.loadData() as Partial<IssueTrackerSettings>;
		this.settings = {
			...DEFAULT_SETTINGS,
			...data
		};
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

