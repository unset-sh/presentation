# CLAUDE.md: unset-sh/presentation

## Where this repository fits

This is `unset-sh/presentation`: how unset.sh looks outside the app. Templates and the one rendering path for
preview images and embeds of profiles, posts and articles, rendered from supplied data, published as
`@unset-sh/presentation` on GitHub Packages. No running service.

- **Belongs here:** templates (one owner each), rendering supplied data into images and embeds, and the gallery of
  hard cases every template must survive.
- **Does not belong here:** deciding what to show (data, visibility, URLs, caching, removal; that is
  `Undefined6799/unset`); colours, fonts and the mark (that is `unset-sh/brand`); a server or queue that renders on
  request (the app calls this package).
- **Uses:** `unset-sh/brand` as `@unset-sh/brand` at an exact version. **Used by:** `Undefined6799/unset`, after its
  rewrite.


The map of every unset.sh repository is <https://github.com/unset-sh/.github/blob/main/MAP.md>. Read it before
moving work between repositories or starting work that might belong elsewhere.

**Keep the map current.** When a change here adds, removes or moves a responsibility, changes what this repository
uses or ships, or renames or archives it, open a pull request on `unset-sh/.github` that updates `repos.json` (run
`npm run map` there) and update this section to match. Ask the owner before creating any new repository in the
organisation.
