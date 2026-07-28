---
name: commit-message
description: Write a conventional commit message for staged or pending changes. Use whenever you are about to run `git commit`, when the user asks for a commit message, or when they ask you to commit work. Enforces `<type>: <short summary>` with a why-not-what body, 50-char summary, imperative mood, and 72-char body wrap.
---

# Commit message

Produce a commit message that explains **why** the change was made. The diff already shows what changed; the message exists to answer the question a reader has six months from now, staring at a `git blame` line.

## Procedure

1. **Read what is actually being committed.** Run `git status` and `git diff --staged`. If nothing is staged, run `git diff` and `git status --short` to see the working tree — and stage deliberately rather than reaching for `git add -A`.
2. **Check the local dialect.** Run `git log --format='%s' -20`. Match the surrounding style — scope usage, capitalization, phrasing — over any generic convention.
3. **Decide whether this is one commit or several.** See "One logical unit per commit" below.
4. **Write the message**, then verify it against the checklist before committing.

## Format

```
<type>: <short summary>

<optional body explaining why, not what>
```

A scope is optional and goes in parentheses after the type — `feat(frontend):`, `fix(backend):`. This repo uses scopes on code changes and omits them on repo-wide `docs:`/`ci:` commits; follow that.

## Types

| Type | Use for |
|---|---|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `test` | Adding or updating tests |
| `chore` | Build process, dependencies, or tooling changes |

This repo also uses `ci` for CI/CD workflow changes (`.github/workflows/`), kept distinct from `chore`.

Pick by the *primary intent* of the change, not by which files it touched. A bug fix that required a small refactor is `fix`. Tests added alongside a new feature belong to the `feat` commit; `test` is for commits that are only about tests.

## Rules

- Summary line under 50 characters
- Use imperative mood — "add" not "added", "fix" not "fixes"
- No period at the end of the summary
- Body wrapped at 72 characters
- Blank line between summary and body
- Lowercase after the type (`fix: stop flashing...`, not `fix: Stop flashing...`)

## Writing the body

Include a body when the *why* isn't self-evident from the summary. Skip it for genuinely obvious changes — a padded body is worse than none.

A good body covers some of:
- The problem or user-visible symptom that prompted the change
- Why this approach, when an obvious alternative exists
- A non-obvious constraint that shaped the solution (a library quirk, a platform behavior, an ordering dependency)
- Consequences a future reader should know about

Do not restate the diff. If the body could be derived by reading the changed lines, delete it.

```
fix(frontend): connect weight-trend line across unlogged days

Recharts breaks the line at any null y-value, so a day with no
weight entry split the trend into disconnected segments and made
steady progress look erratic. connectNulls interpolates across the
gaps instead.
```

## One logical unit per commit

Split by intent, not by file count. A branch that adds a feature and updates docs is two commits (`feat:` then `docs:`), not one squashed change — this makes review and `git revert` work at the granularity someone actually needs.

Signals you should split:
- The summary needs "and" to be accurate
- The types conflict (a `feat` and a `fix` in one diff)
- One part is safe to revert and another isn't

When several commits are warranted, propose the sequence — each with its own message — before committing, so the user can adjust the split.

## Trailers

End every commit message you author with:

```
Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: <the current session URL>
```

## Checklist before committing

- [ ] Summary is under 50 characters
- [ ] Imperative mood, lowercase, no trailing period
- [ ] Type matches the change's primary intent
- [ ] Body (if present) explains why, wrapped at 72
- [ ] Body doesn't restate the diff
- [ ] The diff is one logical unit
- [ ] Trailers present

## Examples

**Good** — from this repo's history:

```
fix(frontend): stop flashing a wrong calorie goal on dashboard load
feat(backend): add repeatable demo-account seed script
ci: exclude demo seed script from deploy triggers
docs: restructure README into layered portfolio narrative
```

**Bad**, and why:

| Message | Problem |
|---|---|
| `Fixed the bug in the chart component.` | Past tense, capitalized, trailing period, no type, says nothing |
| `update files` | No type, no information |
| `feat: add validation to the onboarding wizard and fix the weight unit bug and update the README` | Three logical units; needs "and" to be accurate |
| `refactor: change handleSubmit to use async/await instead of .then chains` | Body-less restatement of the diff — the *why* is missing |
