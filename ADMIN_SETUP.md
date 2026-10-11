# Kitchen notebook setup

The code uses Decap CMS with GitHub OAuth sign-in. GitHub manages passwords; the separate Cloudflare Worker exchanges credentials and admits only approved GitHub account IDs. The website stays on GitHub Pages at marialamarcacooking.com.

The editor is intentionally disabled until its authentication URL is configured. No live authentication service has been deployed by these code changes.

## 1. Choose the initial owner

Use Maria’s own GitHub account, or the account you intend to manage publishing. Give it write access to `PROLIX93/MariaLaMarcaCooking.GitHub.io` if it does not own the repository. Find its numeric `id` at `https://api.github.com/users/USERNAME`. This ID, rather than a changeable username, goes in the approval list.

The repository is configured as public for OAuth (`public_repo` scope). If the repository is private, the Worker scope must change to `repo`, which grants broader access; review that before enabling it. GitHub OAuth scopes are not limited to this one repository. The Worker verifies write access to the configured repository, but the resulting user credential carries the granted scope.

## 2. Deploy the authentication Worker

Create a Cloudflare account and deploy `auth/worker.mjs` as a Worker named `maria-kitchen-auth` (the dashboard can accept the module source directly). Alternatively, from `auth/`, use Wrangler: `npx wrangler deploy`.

Keep the website DNS pointing to GitHub Pages. This Worker can use its separate HTTPS `workers.dev` address; it does not require moving the website.

Set these Worker environment variables in Cloudflare:

| Name | Value |
| --- | --- |
| `SITE_ORIGIN` | `https://marialamarcacooking.com` (no trailing slash) |
| `AUTH_ORIGIN` | Your Worker’s exact HTTPS origin, without trailing slash |
| `GITHUB_REPO` | `PROLIX93/MariaLaMarcaCooking.GitHub.io` |
| `ADMIN_GITHUB_IDS` | The initial owner’s numeric GitHub ID |
| `GITHUB_CLIENT_ID` | The OAuth app client ID from the next step |

Store `GITHUB_CLIENT_SECRET` as an encrypted **Worker secret**, not in GitHub, HTML, settings.json, or this file. If using Wrangler: `npx wrangler secret put GITHUB_CLIENT_SECRET` from `auth/`. Enter the secret at its hidden prompt.

The Worker refuses login until all configuration is present. It checks OAuth state, uses PKCE, checks the GitHub identity against the approval list, checks repository write permission, and sends the credential only to the configured website origin.

## 3. Register a GitHub OAuth app

In the intended owner’s GitHub account, open Settings → Developer settings → OAuth Apps → New OAuth App.

- Application name: Maria’s Kitchen Notebook
- Homepage URL: `https://marialamarcacooking.com`
- Authorization callback URL: `https://YOUR-WORKER-HOST/callback`

Copy its client ID into the Worker variable and generate a client secret for the Worker secret. Do not paste the secret into chat. Deploy the updated Worker configuration.

This integration does not implement token refresh. If you enable expiring OAuth tokens, authors must sign out and back in when their token expires.

## 4. Connect the editor and enable deployment

Set `authBaseUrl` in `public/admin/settings.json` to the Worker’s HTTPS origin. This URL is public configuration, not a secret.

Commit and push the code. In GitHub repository Settings → Pages, change the source to **GitHub Actions**. The included `.github/workflows/pages.yml` builds and deploys the site whenever `main` changes, including CMS commits. Keep the custom domain set to `marialamarcacooking.com`.

The local build still generates `docs/`; Actions uploads that output without committing it back to GitHub. Both `/admin/` and the custom domain file are included in every build.

## 5. Test the full flow

1. Visit `https://marialamarcacooking.com/admin/` and sign in with the approved account.
2. Create a post with a title, date, category, cover photo, introduction, and story.
3. Turn **Hide from website** off and save/publish.
4. Wait for the Publish food blog action to finish, then refresh the public site. Verify the post from another browser.
5. Confirm a GitHub account outside the approval list cannot sign into the editor.

Posts live in `content/posts/*.json`. Uploaded photos live in `public/uploads/`. Hidden posts are not displayed, but their content remains in generated JavaScript and GitHub. The hide switch is an editorial convenience, not access control; do not use it for confidential drafts. Plain text stories support paragraphs; rich text formatting is not yet enabled.

Old prototype posts in browser storage are no longer shown. If you wrote any, export them before clearing browser data: the old storage key is `maria-kitchen-posts`. They are not automatically published or deleted.

## Add or remove authors later

To add an author, invite their GitHub account to the repository with write access and append its numeric ID to `ADMIN_GITHUB_IDS`, separated by commas. Everyone uses their own account; there is no public signup or shared password.

To remove an author, remove repository write access **and** remove the ID from the Worker approval list. Removing only the ID blocks new logins but does not revoke previously issued GitHub tokens. Revoke the OAuth app authorization/token as appropriate if an account is compromised.

This GitHub backend gives authors repository write access, not a restricted posts-only role. For separate administrator, editor, and reader permissions, use a CMS/backend with role enforcement instead.

## References

- https://decapcms.org/docs/github-backend/
- https://decapcms.org/docs/configuration-options/
- https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps
- https://developers.cloudflare.com/workers/configuration/secrets/
- https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
