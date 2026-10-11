# Maria LaMarca Cooking

A responsive React food journal with a whimsical paper-inspired design, recipe categories, search, article reading views, and a browser-local post editor.

## Development

Run `npm install`, then `npm run dev`. Run `npm run build` to generate the GitHub Pages site in `docs/`.

The existing repository base path is configured in `vite.config.js`. Update it if the hosting path changes.

## Content and publishing

The starting journal entries and introduction are illustrative content in `src/App.jsx`. Replace them with Maria’s own writing before launching.

“Write a kitchen note” adds entries to localStorage in the current browser. This is a prototype editor, with no authentication or shared publishing. To publish daily posts for all visitors, connect a CMS or backend and protect author access. Browser-local entries should not be treated as a permanent content archive.

Food photographs are loaded from Unsplash and fonts from Google Fonts, requiring network access. For a self-contained deployment, replace these with local assets.
