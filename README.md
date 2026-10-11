# Maria LaMarca Cooking

A responsive React food journal with category filters, search, article views, and a Decap CMS editor at `/admin/`.

## Development

Run `npm install`, then `npm run dev`. Run `npm run build` to generate the site in `docs/`. The custom domain uses the root base path `/`; `public/CNAME` preserves the domain on each build.

## Publishing and accounts

See [ADMIN_SETUP.md](ADMIN_SETUP.md) to configure GitHub sign-in, the initial approved owner, and GitHub Actions deployment. Authentication requires deploying the included Worker and registering an OAuth app. Login is disabled until configured.

Posts are shared files in `content/posts/`, edited through the CMS and deployed automatically after commits to `main`. Photos upload to `public/uploads/`. Local browser storage is no longer the source of posts. The starting posts and introduction remain illustrative content to replace before launch.

Food photographs initially load from Unsplash, fonts from Google Fonts, and the editor from a pinned Decap CDN release. These require network access.

## Verification

`npm run build` checks the production bundle. `node --test auth/worker.test.mjs auth/admin.test.mjs` verifies authentication restrictions with mocked GitHub responses and the editor initialization flow. The editor explicitly loads `public/admin/config.json` and `settings.json`. Live OAuth and publishing require the account setup described above.
