# museomics/methods — Build Spec & Implementation Plan (revised)

> Revision note: this supersedes the original draft. Changes from the review:
> two-level taxonomy (Kingdom + Phylum/Division) replacing a single taxon
> facet; GitHub Actions build instead of stock GitHub Pages; a single
> canonical controlled vocabulary enforced by CI; free-text search; sort
> control; empty state; accessible chips (not colour-alone); optional DOI;
> optional outcome signal; separate content licence (CC BY 4.0).

## Purpose

A community resource for museomics (DNA-based methods applied to museum
specimens) showcasing working methods across taxonomic groups and
preservation types, with a subordinate bibliography of supporting papers and
SOPs. The Methods page is the primary deliverable; the Bibliography is a
secondary, curated reference list.

## Assumptions

- Repo `museomics/methods` under the `museomics` GitHub org.
- Served via GitHub Pages at `museomics.github.io/methods/`, built and deployed
  by a **GitHub Actions workflow** (not the stock Pages Jekyll build). This
  frees plugin choice and lets CI run a validation step.
- No separate landing page — root loads directly into the Methods page.
- Static site, client-side filtering, no backend/database.
- Community contributions arrive via GitHub Issue Forms; a maintainer reviews
  and merges them into content (PRs also accepted from technical contributors).
- The controlled vocabulary is curated by the maintainer.

## Site structure

```
/                     → Methods page (index) — primary deliverable
/bibliography/        → Bibliography page — papers + SOPs, secondary
/contribute/          → Links to both issue forms + PR instructions
_methods/*.md         → method entries
_bibliography/*.md    → bibliography entries
_data/tags.yml        → controlled vocabulary (single source of truth)
_data/facets.yml      → facet display metadata (order, label, colour, abbr)
methods.json          → Liquid-generated at build time from _methods
bibliography.json     → Liquid-generated at build time from _bibliography
assets/js/app.js      → shared client-side filter/search/sort/render logic
scripts/validate_entries.rb → CI vocabulary + schema validation
.github/workflows/deploy.yml → build + deploy to Pages
.github/workflows/ci.yml     → PR validation + build check
.github/ISSUE_TEMPLATE/suggest-method.yml
.github/ISSUE_TEMPLATE/suggest-bibliography.yml
```

Nav bar on every page: **Methods | Bibliography | Contribute**

---

## 1. Methods page (`/`)

Let visitors find and filter working methods by **kingdom**, **phylum/division**,
preservation, extraction, library prep, and sequencing/downstream method.
Multi-tagging per entry is supported on every facet.

### Layout (top to bottom)
1. Header — title + one-line purpose.
2. Tag legend — collapsible explainer of the six facets and their chip
   colours/badges.
3. Controls — free-text search box + sort control (newest / oldest / A–Z), then
   a filter bar of six collapsible multi-select facets, populated from
   `_data/tags.yml`. OR within a facet, AND across facets.
4. Results count (live) + "Clear all filters".
5. Card grid.
6. Empty state (shown when no entry matches).
7. Footer contribute prompt.

### Card behaviour
- **Collapsed:** title, optional outcome badge, one-line summary, tag chips.
  Chips are colour-coded **and** carry a short facet badge + `aria-label` so
  they're distinguishable without relying on colour (accessibility).
- **Expanded (on click):** full Markdown body, DOI link (if present, new tab),
  contributor + date, collapse control.

### Entry data model — `_methods/<slug>.md`
```yaml
---
title: "Genome skimming from a 40-year-old pinned beetle"
kingdom: [Animalia]
phylum: [Arthropoda]
preservation: [dry-pinned]
extraction: [silica-column]
library: [tagmentation]
sequencing: [genome-skimming]
outcome: worked-well          # optional controlled value
contributor: "Contributor Name"
date: 2026-07-19
summary: "One-line outcome, shown on the collapsed card."
doi: "10.xxxx/xxxxx"          # OPTIONAL — omit for unpublished methods
---
Full detail body as Markdown (renders on expand).
```
Required: title, kingdom, phylum, preservation, extraction, library,
sequencing, summary, contributor, date. DOI is optional so unpublished /
in-house methods are not excluded.

### Filtering mechanics
- Build compiles all entries (front-matter **and** rendered body) into
  `methods.json`. Body is inlined because the corpus is small; this also lets
  search cover the detail text. Split to lazy-loaded per-entry files only if
  load time becomes noticeable.
- Client JS fetches once on load. All filtering/search/sort is client-side.
- The base path and vocabulary are injected into the page by the Jekyll layout
  (`window.SITE`) so JS never guesses the baseurl and filter options come from
  the config, not just from values present in the data.
- Active filters, search text and non-default sort are reflected in the URL
  query string (`?kingdom=Animalia&preservation=dry-pinned&q=beetle`) and
  restored on load.

---

## 2. Bibliography page (`/bibliography/`)

A curated list of papers and SOPs, typed and tag-filterable. Simpler than
Methods — no expansion; each row links out to its source.

### Entry data model — `_bibliography/<slug>.md`
```yaml
---
type: paper                   # paper | sop
title: "..."
authors_or_institution: "..."
year_or_date: 2025
link: "https://doi.org/10.xxxx/xxxxx"
tags: [extraction, silica-column]   # reuse shared vocabulary
notes: "Optional one-line relevance note"
---
```

### Layout
- Search box + sort + filter bar (a `type` filter — Paper/SOP — plus the method
  facets that apply to references: extraction, library, sequencing).
- List of rows with a type badge, linking out directly. No inline expansion.
- Contribute prompt.

---

## 3. Contribute page (`/contribute/`)
Short explainer + links to both issue forms + PR instructions + a note on the
controlled vocabulary and content licence.

---

## 4. GitHub Issue Forms
`suggest-method.yml` and `suggest-bibliography.yml` with fields matching the
schemas, `labels` set for triage. Dropdowns mirror `_data/tags.yml` (Issue
Forms can't read data files — the mirror is documented in CONTRIBUTING.md).
Method form: DOI optional; a "Other (describe in detail box)" escape hatch on
each dropdown so contributors aren't blocked by a missing vocab term.

Maintainer workflow: review issue → create/edit the Markdown file → close on
merge. Auto-conversion of issues to Markdown is a possible v2 enhancement.

---

## 5. Implementation stack
- **Jekyll** built by GitHub Actions; deployed with `actions/deploy-pages`.
- Collections `_methods`, `_bibliography`.
- `_data/tags.yml` (vocabulary) + `_data/facets.yml` (display metadata).
- Liquid-generated `methods.json` / `bibliography.json` (no custom Ruby plugin
  needed, so it would even run on stock Pages as a fallback).
- Plain JS for all interactivity.
- CI: `scripts/validate_entries.rb` checks required fields + vocabulary on every
  PR and before every deploy; `jekyll build` runs as a second check.

## Deferred / v2
- Clicking a card chip to apply it as a filter.
- GitHub Action to auto-convert merged issues into Markdown files.
- Lazy-loading per-entry bodies if the corpus grows large.
- Scheduled dead-link checking of DOIs/links.
- Structured cross-links from methods to bibliography SOPs.
