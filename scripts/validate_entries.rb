#!/usr/bin/env ruby
# frozen_string_literal: true
#
# Validates every method and bibliography entry against the controlled
# vocabulary in _data/tags.yml and a small required-field schema.
# Exits non-zero (failing CI) if any entry is invalid. Run:
#   ruby scripts/validate_entries.rb

require "yaml"
require "date"

ROOT = File.expand_path("..", __dir__)
TAGS = YAML.safe_load_file(File.join(ROOT, "_data", "tags.yml"))

errors = []

# Front-matter fields on method entries that must be drawn from a vocab list.
METHOD_FACETS = %w[kingdom phylum preservation extraction library sequencing].freeze
METHOD_REQUIRED = (METHOD_FACETS + %w[title summary contributor date]).freeze

BIB_REQUIRED = %w[type title authors_or_institution year_or_date link].freeze
# Any tag on a bibliography entry must exist in one of these facet lists.
BIB_TAG_VOCAB = (TAGS["extraction"] + TAGS["library"] + TAGS["sequencing"] +
                 TAGS["preservation"] + TAGS["kingdom"] + TAGS["phylum"]).uniq.freeze

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

  METHOD_FACETS.each do |facet|
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

# --- report ----------------------------------------------------------------
if errors.empty?
  puts "✓ All entries valid."
  exit 0
else
  warn "✗ #{errors.length} validation error(s):"
  errors.each { |e| warn "  - #{e}" }
  exit 1
end
