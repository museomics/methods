---
layout: default
page_id: contribute
title: Contribute
---

# Contribute

This resource grows from the museomics community. There are two ways to add to
it — no coding required for the first.

## 1. Suggest via a form (recommended)

Fill in a short GitHub issue form. A maintainer reviews it and adds it to the
site. You'll need a free GitHub account.

- **[Suggest a method →](https://github.com/museomics/methods/issues/new?template=suggest-method.yml)**
  — a working method you've used on museum material.
- **[Suggest a bibliography entry →](https://github.com/museomics/methods/issues/new?template=suggest-bibliography.yml)**
  — a paper or SOP worth listing.

## 2. Contribute directly by pull request

If you're comfortable with GitHub:

1. Fork the [repository](https://github.com/museomics/methods).
2. Add one Markdown file to `_methods/` (or `_bibliography/`) following the
   front-matter schema in
   [`CONTRIBUTING.md`](https://github.com/museomics/methods/blob/main/CONTRIBUTING.md).
3. Use only tag values from the controlled vocabulary in
   [`_data/tags.yml`](https://github.com/museomics/methods/blob/main/_data/tags.yml).
   CI checks this automatically — if you need a new tag, add it to that file in
   the same PR.
4. Open a pull request. A maintainer will review and merge.

## A note on tags

Tags are a curated, controlled vocabulary so filtering stays consistent and
typos don't fragment the taxonomy. Proposing a new value is welcome — just edit
`_data/tags.yml` in your PR, or mention it in your issue.

## Licence & citation

Entry content is published under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/): reuse freely with
attribution. Contributors are credited by name on each entry. If you use this
resource, please cite it as *museomics/methods* (museomics.github.io/methods).
