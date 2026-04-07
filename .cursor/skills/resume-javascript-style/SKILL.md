---
name: resume-javascript-style
description: >-
  Enforces naming (including descriptive names instead of one-letter or truncated
  pseudonyms like exp/ref in callbacks), control-flow, and regex-comment
  conventions for JavaScript in this resume repo. Use when editing or
  reviewing `.js` files here, when refactoring callbacks or ternaries, or when
  the user asks for JS style consistency with project rules.
---

# Resume JavaScript style (this repo)

## Language for comments and UI

Follow [AGENTS.md](../../../AGENTS.md): chat with the user may be in Russian; **comments in code**, **UI strings**, and **docs** follow the **existing project language** and conventions unless the user asks otherwise for that artifact.

## Naming

- Prefer **full words** and **clear roles**. In arguments, lambdas, and local bindings, avoid:
  - **one-letter** or cryptic names (e.g. `error` not `e`, `chunk` not `c`, `scrollPosition` not `y`, `attemptIndex` not `i`);
  - **truncated multi-letter pseudonyms** for domain values (e.g. prefer `experienceEntry` over `exp`, `referenceEntry` over `ref`, `languageEntry` over `lang`, `educationEntry` over `edu`, `projectEntry` over `proj`; for DOM nodes prefer something like `imageElement` / `faviconImage` over `img` when it is not the API’s own name).
- It is fine to use ordinary English words that are not cuts of a longer concept (`option`, `keyword`, `link` as in “hyperlink”, `index`) when the meaning is already plain.

## Named one-liners

- Do **not** introduce **named** functions whose entire body is a **single short line**. Inline the expression at the call site or inside the argument list instead.
- **Exception:** keep **multiline** helpers or helpers with a **block body** when they improve clarity (e.g. `optionalString` in `normalizeResumeData` in `script.js`).

## Inline expressions

- Prefer **inlining** one-line expressions in arguments and lambdas instead of extra intermediate `const` bindings, **when the line stays readable**.

## Regex `.replace`

- Immediately **before** each `.replace(/.../)` (or before a **chain** that shares one clear purpose), add **one comment line** in plain language: what the pattern **removes** or **replaces** with what.
- For long chains, you may **group** comments by meaning if every replace in that group is covered (e.g. one “strip markdown” pass with several replaces).

## Branches and ternaries

- For **multiple** branches, prefer **`switch`**, an **object/map**, or a **rule table** over **nested ternaries**.
- A **simple** single ternary is fine.

## Optional escape hatch

- If inlining `safeString` / `safeArray`-style logic causes **unreadable duplication**, a **local multiline normalizer** function is acceptable; prefer that over tiny one-line named wrappers repeated everywhere.
