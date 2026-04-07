import { Plugin } from "obsidian";
import {
	CommentsMarkupSettings,
	DEFAULT_SETTINGS,
	CommentsMarkupSettingTab,
} from "./settings/settings";
import { createPostProcessor } from "./reading/postprocessor";
import { createEditorExtensions } from "./editor/decorations";
import { registerCommands } from "./editor/commands";
import {
	SIDEBAR_VIEW_TYPE,
	CommentsSidebarView,
} from "./sidebar/sidebar-view";

export default class CommentsMarkupPlugin extends Plugin {
	settings: CommentsMarkupSettings = DEFAULT_SETTINGS;

	async onload(): Promise<void> {
		await this.loadSettings();

		// Settings tab
		this.addSettingTab(new CommentsMarkupSettingTab(this.app, this));

		// Reading mode post-processor
		this.registerMarkdownPostProcessor(createPostProcessor(this));

		// Editor mode decorations
		this.registerEditorExtension(
			createEditorExtensions(() => this.settings)
		);

		// Sidebar panel
		this.registerView(
			SIDEBAR_VIEW_TYPE,
			(leaf) => new CommentsSidebarView(leaf, this)
		);

		// Commands
		registerCommands(this);

		// Ribbon icon to open sidebar
		this.addRibbonIcon("message-square", "Open comments panel", () => {
			this.activateSidebar();
		});
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	private async activateSidebar(): Promise<void> {
		const existing =
			this.app.workspace.getLeavesOfType(SIDEBAR_VIEW_TYPE);
		if (existing.length > 0) {
			this.app.workspace.revealLeaf(existing[0]);
			return;
		}

		const leaf = this.app.workspace.getRightLeaf(false);
		if (leaf) {
			await leaf.setViewState({
				type: SIDEBAR_VIEW_TYPE,
				active: true,
			});
			this.app.workspace.revealLeaf(leaf);
		}
	}
}
