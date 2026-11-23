# AGENTS.md

Every assistant working in this repository (Claude, Cursor, Codex or another) follows, in this order:

1. [`CLAUDE.md`](CLAUDE.md): what this repository is for and its own rules.
2. Every file in [`.claude/rules/org/`](.claude/rules/org/): the unset.sh organisation's rules. Tools that do
   not load that folder by themselves must read it before starting work.

The procedures in `.claude/skills/org-*/SKILL.md` describe jobs that repeat across repositories, such as
preparing a release. Read the one that fits before doing that job.

Use these installed files as signposts rather than duplicating their instructions here:

- [Organisation rules](.claude/rules/org/org.md): ownership and where AI working material belongs.
- [Brand requests](.claude/skills/org-brand-request/SKILL.md): missing shared tokens or assets and provider handoffs.
- [Map maintenance](.claude/skills/org-map-maintenance/SKILL.md): automatic map refresh and source review.
- [Organisation decisions](.claude/skills/org-decisions/SKILL.md): accepted decisions and their history.
- [Kit updates](.claude/skills/org-kit-update/SKILL.md): take the approved release containing a missing procedure.

If a linked procedure is absent from the pinned kit, report the missing version and follow `org-kit-update`;
do not create a replacement copy in this repository.

Files under `.claude/rules/org/`, `.claude/skills/org-*/`, `.claude/agents/org-*` and `.claude/agent-kit/` are
copies of a release of `unset-sh/agent-kit` and are checked by CI. Never edit them here.
