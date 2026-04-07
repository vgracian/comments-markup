import { App, PluginSettingTab, Setting } from "obsidian";
import type CommentsMarkupPlugin from "../main";

export interface CommentsMarkupSettings {
	author: string;
	timezone: string;
	dateFormat: "datetime" | "dateonly";
	resolvedCollapsed: boolean;
	anchorStyle: "superscript" | "icon" | "highlight";
}

export const DEFAULT_SETTINGS: CommentsMarkupSettings = {
	author: "",
	timezone: "system",
	dateFormat: "datetime",
	resolvedCollapsed: true,
	anchorStyle: "superscript",
};

export class CommentsMarkupSettingTab extends PluginSettingTab {
	plugin: CommentsMarkupPlugin;

	constructor(app: App, plugin: CommentsMarkupPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl("h2", { text: "CommentsMarkup" });

		new Setting(containerEl)
			.setName("Author name")
			.setDesc("Your @author identifier for new comments")
			.addText((text) =>
				text
					.setPlaceholder("e.g. alice")
					.setValue(this.plugin.settings.author)
					.onChange(async (value) => {
						this.plugin.settings.author = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Timezone")
			.setDesc(
				'Override timezone offset for dates (e.g. +02:00, -05:00). Leave as "system" to use your system timezone.'
			)
			.addText((text) =>
				text
					.setPlaceholder("system")
					.setValue(this.plugin.settings.timezone)
					.onChange(async (value) => {
						this.plugin.settings.timezone = value || "system";
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Date format")
			.setDesc("Format for dates in new comments")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("datetime", "Date + time with timezone")
					.addOption("dateonly", "Date only")
					.setValue(this.plugin.settings.dateFormat)
					.onChange(async (value) => {
						this.plugin.settings.dateFormat = value as
							| "datetime"
							| "dateonly";
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Resolved threads")
			.setDesc("Collapse resolved threads by default")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.resolvedCollapsed)
					.onChange(async (value) => {
						this.plugin.settings.resolvedCollapsed = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Anchor style")
			.setDesc("How anchors are displayed in the document")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("superscript", "Superscript number")
					.addOption("icon", "Comment icon")
					.addOption("highlight", "Highlight")
					.setValue(this.plugin.settings.anchorStyle)
					.onChange(async (value) => {
						this.plugin.settings.anchorStyle = value as
							| "superscript"
							| "icon"
							| "highlight";
						await this.plugin.saveSettings();
					})
			);
	}
}
