## Learned User Preferences

- Communicate with the user in Russian in chat messages; for code comments, UI copy, and docs follow the existing project language and conventions unless the user explicitly requests otherwise for that artifact.
- Never run `git commit` or `git push` unless the user explicitly asks.

## Learned Workspace Facts

- Repository is a resume generator with `resume.toml` as the main data source.
- There are HR/user-friendly and ATS-friendly resume views/layouts, and the site supports a dark theme (including Dark Reader opt-out via `darkreader-lock` meta).
- The project is assumed to run on macOS (ok to rely on `pbcopy` and avoid `process.platform` branching).
- The project must be developed with GitHub Pages static hosting constraints in mind (no required server-side runtime in production; assets/links must work under a repo subpath/base URL).
- Local development may use Node `server.js` with `/api/*` (e.g. live resume JSON); the published site should rely on prebuilt files under `data/` and avoid depending on root-absolute `/api/...` URLs, which do not map correctly on GitHub Pages project sites.

