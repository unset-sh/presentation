# CLAUDE.md: unset-sh/rendering

## Where this repository fits

This is `unset-sh/rendering`: how unset.sh looks outside the app. Templates and the one rendering path for
preview images and embeds of profiles, posts and articles, rendered from supplied data, published as
`@unset-sh/rendering` on GitHub Packages. No running service.

- **Belongs here:** templates (one owner each), rendering supplied data into images and embeds, and the gallery of
  hard cases every template must survive.
- **Does not belong here:** deciding what to show (data, visibility, caching, removal; that is `unset-sh/backend`);
  routes, image URLs and link-card tags in pages (that is `unset-sh/web`); colours, fonts and the mark (that is
  `unset-sh/brand`); a server or queue that renders on request (the consumer calls this package).
- **Uses:** `unset-sh/brand` as `@unset-sh/brand` at an exact version; `unset-sh/tooling` for the branch policy
  check at a full commit; `unset-sh/agent-kit` as the copy under `.claude/`. **Used by:** `unset-sh/backend`
  (planned), with web where a rendering responsibility is needed.
- **Licence:** follows the organisation rule. The fonts and mark keep the licences `@unset-sh/brand` and the
  Fontsource packages give them.

The map of every unset.sh repository is <https://github.com/unset-sh/.github/blob/main/MAP.md>. Read it before
moving work between repositories or starting work that might belong elsewhere.

**Keep the map current.** When a change here adds, removes or moves a responsibility, changes what this
repository uses or ships, or renames or archives it, open a pull request on `unset-sh/.github` that updates
`repos.json` (run `npm run map` there) and update this section to match.

## Rules

- A render never reaches out: no network, environment variable, clock, random value or file outside this package
  and `@unset-sh/brand`. It never throws; it returns a reason. Keep `tests/boundaries.test.ts` green: only
  `src/render.ts` imports the renderer, only `src/brand.ts` reads the brand package, only `src/fonts.ts` reads a
  font package, and no colour is written in the source.
- Every input field has a hard limit in `src/contract/limits.ts` and is read only in `src/contract/parse.ts`.
- A changed drawing in `gallery/expected/` is a reviewed change: look at each one before `bun run gallery:update`.
  One template per pull request.
- Bun is the runtime and package manager (`.bun-version`, `bun.lock`, `bunfig.toml`). Keep the 7-day release age
  and `ignoreScripts`; a dated exception names who approved it and when it ends.

## Commands

```sh
bun install
bun run check   # type check, lint, build, tests, and the agent-kit copy check
```
