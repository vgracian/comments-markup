# CommentsMarkup for Obsidian

Obsidian plugin for [CommentsMarkup](../../spec/CommentsMarkup.md), a Markdown extension for collaborative commenting.

## What it does

- Hides `{^id}` anchors in the editor and replaces them with subtle markers (superscript, icon, or highlight)
- Shows a sidebar panel with all comment threads, grouped and filterable
- Reply to comments directly from the sidebar
- Toggle resolved/open state from the sidebar (○/✓)
- Edit your own comments inline from the sidebar
- Insert new comments and replies via command palette

## Commands

| Command | Description |
|---------|-------------|
| Insert comment | Places an anchor at cursor, adds comment definition to the Comments section |
| Reply to comment | Adds a reply to the comment under cursor |
| Toggle comment resolved | Toggles `[ ]`/`[x]` on the comment under cursor |
| Show comments panel | Opens the sidebar |

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| Author name | *(prompt on first use)* | Your `@author` identifier |
| Timezone | system | Timezone offset for dates (e.g. `+02:00`) |
| Date format | date+time | `YYYY-MM-DDThh:mm±hh:mm` or `YYYY-MM-DD` |
| Resolved threads | collapsed | Collapsed or expanded in sidebar |
| Anchor style | superscript | How anchors display: superscript, icon, or highlight |

## Development

```bash
npm install
npm run build       # production build
npm run dev         # watch mode
```

Build output: `main.js`. Copy `main.js`, `manifest.json`, and `styles.css` to your vault's `.obsidian/plugins/comments-markup/`.
