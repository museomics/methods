# museomics / methods

A community resource for **museomics** — DNA-based methods applied to museum
specimens. It showcases working methods across taxonomic groups and preservation
types, backed by a curated bibliography of supporting papers and SOPs.

🌐 **Site:** https://museomics.github.io/methods/

- **Methods** (`/`) — filter working methods by kingdom, phylum/division,
  preservation, extraction, library prep, and sequencing. Cards expand to full
  protocol notes.
- **Bibliography** (`/bibliography/`) — papers and SOPs, filterable by type and
  method tag.
- **Contribute** (`/contribute/`) — suggest an entry via issue form, or by PR.

## How it works

- **Jekyll** static site, built and deployed to GitHub Pages by GitHub Actions
  (`.github/workflows/deploy.yml`) — not the stock Pages build, so plugins and a
  validation step are available.
- Entries are Markdown files with YAML front-matter in `_methods/` and
  `_bibliography/`. A Liquid template compiles them to `methods.json` /
  `bibliography.json` at build time.
- Filtering, search, sorting, and card expansion are plain client-side
  JavaScript (`assets/js/app.js`) — no framework. Active filters are reflected
  in the URL so views are shareable.
- Tags come from a controlled vocabulary in `_data/tags.yml`, enforced in CI by
  `scripts/validate_entries.rb`.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). The seed `example-*` / `Seed example`
entries are placeholders — replace them with real content.

## Licences

- Site code: [MIT](LICENSE)
- Entry content: [CC BY 4.0](LICENSE-CONTENT.md)

## Citation

Please cite as *museomics/methods* (https://museomics.github.io/methods/).
