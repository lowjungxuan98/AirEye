# Documentation updates — instructions

Use this when bringing documentation **in line with implementation** and with **current vendor or platform documentation**, without inventing behavior or file paths.

---

## 1. Goals

- Reflect **what the repository actually does** (code, OpenAPI, env vars, routes).
- Cite or summarize **official upstream documentation** where integration details come from vendors (Firebase, S3/MinIO, OpenAI-compatible LLM providers, Express, Node, etc.).
- Reduce **hallucination, imagination, and drift** by separating facts you verified from assumptions.

---

## 2. Sources of truth (use in this order)

| Priority | Source | Use for |
|----------|--------|--------|
| 1 | **`backend/src/`** and **`backend/openapi.yaml`** | Paths, handlers, request/response shapes, env names consumed by code |
| 2 | **`backend/package.json`** (and lockfile if needed) | Dependency names, semver ranges, `engines`, npm scripts |
| 3 | **Official docs** (vendor / product sites) | Correct API URLs, auth flows, quotas, deprecations — always prefer the **latest** published guidance for the stack you are documenting |
| 4 | **This repo’s other Markdown** (`docs/*.md`, including **`docs/dependencies/`**) | Cross-links must stay consistent after edits |

If official docs conflict with **this repo’s code**, either update the code and then the doc, or document the **intentional** deviation with a short explicit note. Do not silently “fix” the doc to match guesswork.

---

## 3. Required metadata on each updated Markdown file

Add or refresh a short **footer block** (or YAML front matter, if the file already uses it) at the **end** of the file so readers know freshness and scope.

**Required**

- **`Updated`**: ISO date **`YYYY-MM-DD`** of the last substantive review (not a future date).
- **`Applies to`**: What the doc describes, e.g. `grim backend` + optional pointer such as `backend/package.json` version when the change is release-related.

**Optional (use when useful)**

- **`Doc version`**: Small integer or semver **for that document only** when the file is long-lived and you need revision history without git blame (e.g. `Doc version: 2`).
- **`Upstream refs`**: Bullet list of official URLs actually used while writing (helps the next editor re-verify).

**Example footer**

```markdown
---

**Updated:** 2026-04-18
**Applies to:** grim backend (`backend/package.json` → version `0.1.0`)
**Doc version:** 1
**Upstream refs:**
- https://firebase.google.com/docs/…
- https://docs.api.nvidia.com/…
```

Adjust paths and URLs to match what you **actually** read. Omit **Upstream refs** if the page is internal-only and has no external doc.

---

## 4. Workflow (hardened)

1. **Identify scope** — Which feature or subsystem changed? List affected `docs/**/*.md` files.
2. **Re-read implementation** — Open the relevant `backend/src` files and `openapi.yaml`; grep for env vars and paths you will mention.
3. **Refresh official references** — Open current vendor docs; copy stable URLs into **Upstream refs**; note any API or SDK changes that affect this project.
4. **Edit Markdown** — Update steps, paths, and examples; remove sections that describe removed files or dead flows.
5. **Add/update footer** — Set **Updated** to today’s date; set **Applies to**; bump **Doc version** only if you use that field and the doc’s contract changed.
6. **Consistency pass** — Grep the repo for old paths or old env names you might have left behind.
7. **Stop short of fiction** — If you did not run a command or verify an endpoint, do not claim you did. Use “expected to” or “see code at …” instead of fake runbooks.

---

## 5. Reducing hallucinations and drift

- **File paths** — Must exist in the repo at commit time; use paths from `backend/src/...` or `docs/...` as in the tree.
- **Environment variables** — Must appear in `backend/src/libs/configs/env.config.ts` (or other code that reads them), not only in prose.
- **HTTP** — Behavior and status codes for public API should align with **`backend/openapi.yaml`** and `app.ts` / route factories.
- **Versions** — When stating a library version, prefer **`package.json` / `package-lock.json`** over memory.
- **“Verified on” dates** for vendor docs — Optional line such as `Vendor docs reviewed: 2026-04-18` next to **Upstream refs** when integration is sensitive to upstream changes.

---

## 6. What not to do

- Do not document features **not implemented** in `backend/src` as if they exist.
- Do not invent **URLs**, **CLI flags**, or **response JSON**; copy from official docs or from this repo’s spec/code.
- Do not leave **Updated** missing or set to a placeholder like `TODO` on files you materially changed.
- Do not duplicate the same long runbook in five files; link to one canonical doc and keep a short summary elsewhere.

---

## 7. Project-specific pointers (Grim backend)

- HTTP contract: **`backend/openapi.yaml`**
- Env schema and loader: **`backend/src/libs/configs/env.config.ts`**
- Architecture overview: **`docs/code-rules/project-architecture.md`**
- Vendor integration notes (S3/MinIO, OpenAI-compatible LLM providers, Scalar, Firebase): **`docs/dependencies/README.md`**
- Cleanup rules: **`docs/instructions/code-cleanup.md`**

When this list goes stale relative to the tree, update **this** file’s **Updated** field and the pointers above.

---

**Updated:** 2026-04-25
**Applies to:** grim repository — documentation process (`docs/`, `backend/`)
**Doc version:** 4
