# Code cleanup — instructions

Use this checklist when restructuring, refactoring, or cleaning the codebase (human or agent).

1. **Scope of change** — You are allowed to restructure, refactor, reformat, rearrange, and regenerate code where it serves clarity, consistency, or maintainability.

2. **Simplicity** — You are required to simplify and shorten the code: prefer the smallest clear solution, remove indirection that does not buy a real benefit, and avoid speculative abstractions.

3. **Reuse** — You are required to extract reusable functions or modules when you notice duplicated or near-identical logic, so behavior stays consistent in one place.

4. **Dead code** — You are required to remove unused, unnecessary, and redundant code (imports, variables, files, empty folders, unreachable branches) after verifying nothing depends on it.

5. **Design and style** — You are required to keep changes aligned with **SOLID** principles and a **standardized** style consistent with the surrounding project (naming, file layout, patterns already used in the repo).

6. **Documentation** — You are required to validate documentation for **accuracy** against the actual code and specs (e.g. paths, env vars, HTTP contracts). Do **not** invent assumptions, self-conclusions, or hallucinated behavior: if something is unknown or unverified, say so or omit it until confirmed.

7. **Same-file, single-call helpers** — If a function lives in the **same file** as its caller and is used from **only one** call site, prefer **merging or inlining** it with that caller unless the split clearly improves readability (for example, a long or intricate block that benefits from a named step). Do **not** introduce extra named functions purely for a single hop: that adds maze-like jumping between definitions without a proportional benefit.
