#!/usr/bin/env ruby
# frozen_string_literal: true
#
# Validates (1) every method and bibliography entry against the controlled
# vocabulary in _data/tags.yml and a small required-field schema, and (2) that
# the GitHub Issue Form dropdowns stay in sync with that vocabulary (the forms
# can't read _data/tags.yml, so this guards against drift).
# Exits non-zero (failing CI) if anything is invalid. Run:
#   ruby scripts/validate_entries.rb

require "yaml"
require "date"

ROOT = File.expand_path("..", __dir__)
TAGS = YAML.safe_load_file(File.join(ROOT, "_data", "tags.yml"))
FACETS = YAML.safe_load_file(File.join(ROOT, "_data", "facets.yml"))

errors = []

# `taxon` is a kingdom -> [phyla] map; entries are tagged at phylum level, so
# the allowed values are the flattened list of phyla/divisions.
TAXON_VALUES = TAGS["taxon"].values.flatten.freeze

# Flat-list facets on method entries that must be drawn from a vocab list.
METHOD_FLAT_FACETS = %w[preservation extraction library sequencing].freeze
METHOD_REQUIRED = (%w[taxon] + METHOD_FLAT_FACETS + %w[title summary contributor date]).freeze

BIB_REQUIRED = %w[type title authors_or_institution year_or_date link].freeze
# Any tag on a bibliography entry must exist in one of these facet lists.
BIB_TAG_VOCAB = (TAGS["extraction"] + TAGS["library"] + TAGS["sequencing"] +
                 TAGS["preservation"] + TAXON_VALUES).uniq.freeze

def front_matter(path)
  raw = File.read(path, encoding: "UTF-8")
  unless raw.start_with?("---")
    return [nil, "missing YAML front-matter"]
  end
  # Split on the closing --- of the front-matter block.
  _, fm, = raw.split(/^---\s*$\n?/, 3)
  [YAML.safe_load(fm, permitted_classes: [Date, Time]), nil]
rescue => e
  [nil, "unparseable front-matter (#{e.message})"]
end

def as_array(v)
  v.nil? ? [] : Array(v)
end

# --- methods ---------------------------------------------------------------
Dir.glob(File.join(ROOT, "_methods", "*.md")).sort.each do |path|
  rel = path.sub("#{ROOT}/", "")
  fm, err = front_matter(path)
  if err
    errors << "#{rel}: #{err}"
    next
  end

  METHOD_REQUIRED.each do |field|
    val = fm[field]
    errors << "#{rel}: missing required field `#{field}`" if val.nil? || (val.respond_to?(:empty?) && val.empty?)
  end

  as_array(fm["taxon"]).each do |v|
    errors << "#{rel}: `taxon` value \"#{v}\" not in _data/tags.yml" unless TAXON_VALUES.include?(v)
  end

  METHOD_FLAT_FACETS.each do |facet|
    allowed = TAGS[facet] || []
    as_array(fm[facet]).each do |v|
      errors << "#{rel}: `#{facet}` value \"#{v}\" not in _data/tags.yml" unless allowed.include?(v)
    end
  end

  if fm["outcome"] && !(TAGS["outcome"] || []).include?(fm["outcome"])
    errors << "#{rel}: `outcome` value \"#{fm['outcome']}\" not in _data/tags.yml"
  end
end

# --- bibliography ----------------------------------------------------------
Dir.glob(File.join(ROOT, "_bibliography", "*.md")).sort.each do |path|
  rel = path.sub("#{ROOT}/", "")
  fm, err = front_matter(path)
  if err
    errors << "#{rel}: #{err}"
    next
  end

  BIB_REQUIRED.each do |field|
    val = fm[field]
    errors << "#{rel}: missing required field `#{field}`" if val.nil? || (val.respond_to?(:empty?) && val.empty?)
  end

  unless %w[paper sop].include?(fm["type"])
    errors << "#{rel}: `type` must be `paper` or `sop` (got #{fm['type'].inspect})"
  end

  as_array(fm["tags"]).each do |t|
    errors << "#{rel}: tag \"#{t}\" not in _data/tags.yml" unless BIB_TAG_VOCAB.include?(t)
  end
end

# --- issue-form vocabulary sync -------------------------------------------
# Each form dropdown must offer exactly the vocabulary it maps to: no stale
# values (offered but no longer in tags.yml) and no missing values (in the
# vocab but not offered). The "Other (describe…)" escape hatch is exempt.
def facet_vocab(facet)
  facet["grouped"] ? TAGS[facet["key"]].values.flatten : (TAGS[facet["key"]] || [])
end

def check_form(rel, expected, errors)
  path = File.join(ROOT, rel)
  unless File.exist?(path)
    errors << "#{rel}: file not found"
    return
  end
  form = YAML.safe_load_file(path)
  dropdowns = (form["body"] || []).each_with_object({}) do |b, h|
    h[b["id"]] = b if b.is_a?(Hash) && b["type"] == "dropdown"
  end

  expected.each do |id, vocab|
    field = dropdowns[id]
    unless field
      errors << "#{rel}: expected dropdown `#{id}` is missing"
      next
    end
    offered = Array(field.dig("attributes", "options")).reject { |o| o.to_s.start_with?("Other") }

    dupes = offered.select { |o| offered.count(o) > 1 }.uniq
    dupes.each { |v| errors << "#{rel}: `#{id}` lists \"#{v}\" more than once" }

    (offered - vocab).each { |v| errors << "#{rel}: `#{id}` offers \"#{v}\" which is not in _data/tags.yml" }
    (vocab - offered).each { |v| errors << "#{rel}: `#{id}` is missing vocab value \"#{v}\" (add it or the form drifts from tags.yml)" }
  end
end

# Method form: one dropdown per method-applicable facet, plus outcome.
method_expected = {}
FACETS.select { |f| f["methods"] }.each { |f| method_expected[f["key"]] = facet_vocab(f) }
method_expected["outcome"] = TAGS["outcome"] || []
check_form(".github/ISSUE_TEMPLATE/suggest-method.yml", method_expected, errors)

# Bibliography form: a single `tags` dropdown = union of bibliography-applicable
# facet vocabularies (deduped).
bib_tag_vocab = FACETS.select { |f| f["bibliography"] }.flat_map { |f| facet_vocab(f) }.uniq
check_form(".github/ISSUE_TEMPLATE/suggest-bibliography.yml", { "tags" => bib_tag_vocab }, errors)

# --- report ----------------------------------------------------------------
if errors.empty?
  puts "✓ All entries and issue forms valid."
  exit 0
else
  warn "✗ #{errors.length} validation error(s):"
  errors.each { |e| warn "  - #{e}" }
  exit 1
end
