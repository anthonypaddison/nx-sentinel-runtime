# AGENTS.md - Home Assistant Config + nx-displaygrid

This repo contains:

- Home Assistant configuration (YAML, includes, packages)
- A Lovelace YAML dashboard: **nx-displaygrid**
- Optional frontend assets served from `/www` (aka `/local/...`)

Your job:

- Make small, safe changes.
- Keep Home Assistant bootable.
- Commit after every meaningful change.
- Run checks/tests where possible.
- Keep documentation up to date as you go.

---

## 1) Non-negotiables

### 1.1 Commit discipline (every change)

- You MUST create a git commit after each meaningful change.
- Do not batch unrelated changes in one commit.
- If you make multiple edits to complete one small task, commit in steps.

**Commit format**

- Use Conventional Commits:
    - `chore(ha): ...`
    - `fix(lovelace): ...`
    - `feat(nx-displaygrid): ...`
    - `refactor(nx-displaygrid): ...`
    - `docs: ...`
    - `test: ...`

**Commit message rules**

- Short, specific, present tense.
- Mention the area: `ha`, `lovelace`, `nx-displaygrid`, `ci`.

### 1.2 Document as you go

Every commit MUST be accompanied by updates to docs:

- Update `CHANGELOG.md` (or create it if missing).
- Add or update a short note in `docs/changes/YYYY-MM-DD.md` (create folder if missing).

Each change note must include:

- What changed (1-3 bullets)
- Why it changed (1 bullet)
- How to verify (steps)

### 1.3 No destructive refactors unless asked

- Do not rename dashboards, paths, or IDs unless explicitly requested.
- Do not touch `.storage/` unless explicitly requested.
- Do not migrate YAML dashboards to storage mode unless explicitly requested.

---

## 2) "Stay up to date" rule (required before changes)

Before starting work on anything Lovelace/frontend/HA OS behaviour:

- Check official Home Assistant Developer Docs relevant to the change.
- Check Home Assistant release notes relevant to the version in use (Core + Frontend).
- Prefer official docs over community posts.

If behaviour differs between versions:

- Write the version-specific assumption into the change note (docs/changes/...).
- Choose the safest default (backwards compatible).

---

## 3) Repo map (expected)

- `configuration.yaml` - bootstrap (includes + dashboards + resources)
- `packages/` - Home Assistant packages (preferred place for most YAML additions)
- `lovelace/` - YAML dashboards (e.g. `lovelace/nx-displaygrid.yaml`)
- `www/` - frontend assets served at `/local/...`
- `.storage/` - HA-managed state (avoid editing)

If the repo differs, adapt while keeping the same intent.

---

## 4) Testing and validation (do this whenever possible)

### 4.1 YAML checks (always)

For any YAML change:

- Ensure YAML is valid (indentation, lists, anchors).
- Run a configuration validation:
    - Preferred: Home Assistant UI "Check configuration"
    - If CLI available in the environment, run the equivalent Core config check.

Also run (if available in repo / CI):

- `yamllint` (or equivalent)
- Any existing repo scripts under `scripts/`

### 4.2 Lovelace YAML checks

- Ensure dashboard YAML loads without errors.
- Ensure resources referenced in YAML exist (e.g. `/local/...` files present).

### 4.3 Frontend / nx-displaygrid JS checks (where possible)

- If the repo already contains Node tooling:
    - Add/maintain unit tests using the repo's existing framework (prefer Vitest/Jest if already present).
    - Add at least:
        - A basic render test (component/module loads)
        - A config parsing test (invalid config handled safely)

- If the repo does NOT have Node tooling:
    - Do not introduce heavy build systems by default.
    - Provide "smoke test" validation steps instead:
        - Module loads in HA without console errors
        - Key UI flows still render

### 4.4 CI (recommended, only if repo already uses it or user asks)

If GitHub Actions exists:

- Keep it green.
- Add lightweight checks only (no huge toolchains unless requested).

---

## 5) Lovelace resources and dashboard mode rules

- YAML dashboards may manage resources in YAML OR via UI storage depending on configuration/version.
- Default for this repo:
    - Keep `resource_mode: yaml` if already in use.
    - Do not switch modes unless explicitly requested.

- Keep `/www/...` assets stable:
    - Avoid breaking filenames that are referenced by `/local/...`

---

## 6) Editing conventions

### 6.1 YAML

- Keep edits minimal and local to the task.
- Prefer adding new package files over bloating existing ones.
- Do not reformat unrelated blocks.

### 6.2 JS / nx-displaygrid

- Keep changes modular and easy to revert.
- No Node-only APIs in code intended to run in the HA frontend.
- Any new variables/config flags must be camelCase.
- Avoid external CDNs for core dependencies unless explicitly asked.

---

## 7) Output expectations for each task

After completing a task, provide:

- Files changed (list)
- Commits made (list of commit messages)
- How to verify (steps)
- Any version assumptions noted

---

## 8) If asked to rename/restructure

Default: don't.
If forced:
/ nx-displaygrid

- Keep changes modular and easy to revert.
- No Node-only APIs in code intended to run in the HA frontend.
- Any new variables/config flags must be camelCase.
- Avoid external CDNs for core dependencies unless explicitly asked.

---

## 7) Output expectations for each task

After completing a task, provide:

- Files changed (list)
- Commits made (list of commit messages)
- How to verify (steps)
- Any version assumptions noted

---

## 8) If asked to rename/restructure

Default: don't.
If forced:

- Do it in a controlled migration
- Update all references
- Provide rollback instructions (git revert)
- Commit per step
- Document each step
