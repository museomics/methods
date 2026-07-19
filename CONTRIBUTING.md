# Contributing to museomics/methods

Two ways to contribute: a **GitHub issue form** (no coding), or a **pull
request** (add a Markdown file directly). Either way, a maintainer reviews
before it goes live.

## Option A — Issue form (easiest)

- [Suggest a method](https://github.com/museomics/methods/issues/new?template=suggest-method.yml)
- [Suggest a bibliography entry](https://github.com/museomics/methods/issues/new?template=suggest-bibliography.yml)

A maintainer transcribes accepted issues into entry files.

## Option B — Pull request

Add one Markdown file per entry, then open a PR. CI validates it automatically.

### Method entry — `_methods/<short-slug>.md`

```yaml
---
title: "Genome skimming from a 40-year-old pinned beetle"
taxon: [Arthropoda]           # phylum/division, from _data/tags.yml (kingdom is implied)
preservation: [dry-pinned]
extraction: [silica-column]
library: [tagmentation]
sequencing: [genome-skimming]
outcome: worked-well          # optional: worked-well | worked-with-caveats | exploratory
contributor: "Your Name"
date: 2026-07-19
summary: "One-line outcome, shown on the collapsed card."
doi: "10.xxxx/xxxxx"          # optional — omit for unpublished methods
---

Full detail in Markdown. Renders when the card is expanded: protocol notes,
yields, caveats, links to SOPs in the bibliography, etc.
```

Required: `title`, `taxon`, `preservation`, `extraction`, `library`,
`sequencing`, `summary`, `contributor`, `date`.
Optional: `outcome`, `doi`, body.

`taxon` values are phyla/divisions, grouped under their kingdom in
`_data/tags.yml`; the kingdom is inferred from that grouping (we represent
animals, plants and fungi).

### Bibliography entry — `_bibliography/<short-slug>.md`

```yaml
---
type: paper                   # paper | sop
title: "..."
authors_or_institution: "..."
year_or_date: 2025
link: "https://doi.org/10.xxxx/xxxxx"
tags: [extraction, silica-column]   # optional, from _data/tags.yml
notes: "Optional one-line relevance note"
---
```

Required: `type`, `title`, `authors_or_institution`, `year_or_date`, `link`.

## The controlled vocabulary

All tag values live in [`_data/tags.yml`](_data/tags.yml) — the single source of
truth. CI (`scripts/validate_entries.rb`) fails the build if an entry uses a
value that isn't listed there, which keeps filtering consistent and stops typos
fragmenting the taxonomy.

**Need a new tag value?** Add it to `_data/tags.yml` in the same PR, and add it
to the matching dropdown in `.github/ISSUE_TEMPLATE/*.yml` too — the forms can't
read `tags.yml` automatically. CI enforces this: `scripts/validate_entries.rb`
fails if a form dropdown and the vocabulary drift apart in either direction (a
stale option, or a vocab value the form doesn't offer). The maintainer curates
this vocabulary.

## Local preview

```sh
bundle install
bundle exec jekyll serve
# then open http://localhost:4000/methods/
```

Run `ruby scripts/validate_entries.rb` before pushing to catch schema errors.

## Licence

Entry content is contributed under [CC BY 4.0](LICENSE-CONTENT.md). Site code is
MIT ([LICENSE](LICENSE)).
