/* museomics/methods — client-side filtering, search, sort and rendering.
 * No framework. Reads config injected by the Jekyll layout in window.SITE:
 *   { baseurl, facets:[{key,label,abbr,color,methods,bibliography}], vocab:{key:[...]} }
 * Runs on both the Methods page (data-page="methods") and the Bibliography
 * page (data-page="bibliography"); a small per-page config object switches
 * behaviour where they differ.
 */
(function () {
  "use strict";

  var SITE = window.SITE || { baseurl: "", facets: [], vocab: {} };
  var PAGE = document.body.getAttribute("data-page");
  if (PAGE !== "methods" && PAGE !== "bibliography") return;

  // --- per-page configuration -------------------------------------------
  var CONFIG = {
    methods: {
      dataUrl: SITE.baseurl + "/methods.json",
      facets: SITE.facets.filter(function (f) { return f.methods; }),
      hasType: false,
      searchFields: ["title", "summary", "body"],
      sortDefault: "date-desc",
      valuesFor: function (entry, key) { return entry[key] || []; }
    },
    bibliography: {
      dataUrl: SITE.baseurl + "/bibliography.json",
      facets: SITE.facets.filter(function (f) { return f.bibliography; }),
      hasType: true,
      searchFields: ["title", "authors_or_institution", "notes"],
      sortDefault: "year-desc",
      // Bibliography stores one flat `tags` array; a facet's values are the
      // subset of that array present in the facet's vocabulary.
      valuesFor: function (entry, key) {
        var vocab = SITE.vocab[key] || [];
        return (entry.tags || []).filter(function (t) { return vocab.indexOf(t) !== -1; });
      }
    }
  }[PAGE];

  // --- state ------------------------------------------------------------
  var ALL = [];                 // all entries
  var filters = {};             // facetKey -> array of selected values
  CONFIG.facets.forEach(function (f) { filters[f.key] = []; });
  var typeFilter = [];          // bibliography type (paper/sop)
  var query = "";
  var sort = CONFIG.sortDefault;

  // --- helpers ----------------------------------------------------------
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === "class") node.className = attrs[k];
      else if (k === "html") node.innerHTML = attrs[k];
      else if (k === "text") node.textContent = attrs[k];
      else node.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) node.appendChild(c); });
    return node;
  }

  function facetByKey(key) {
    for (var i = 0; i < SITE.facets.length; i++) if (SITE.facets[i].key === key) return SITE.facets[i];
    return null;
  }

  // --- URL <-> state ----------------------------------------------------
  function readUrl() {
    var p = new URLSearchParams(window.location.search);
    CONFIG.facets.forEach(function (f) {
      var v = p.get(f.key);
      filters[f.key] = v ? v.split(",").filter(Boolean) : [];
    });
    if (CONFIG.hasType) {
      var t = p.get("type");
      typeFilter = t ? t.split(",").filter(Boolean) : [];
    }
    query = p.get("q") || "";
    sort = p.get("sort") || CONFIG.sortDefault;
  }

  function writeUrl() {
    var p = new URLSearchParams();
    CONFIG.facets.forEach(function (f) {
      if (filters[f.key].length) p.set(f.key, filters[f.key].join(","));
    });
    if (CONFIG.hasType && typeFilter.length) p.set("type", typeFilter.join(","));
    if (query) p.set("q", query);
    if (sort !== CONFIG.sortDefault) p.set("sort", sort);
    var qs = p.toString();
    var url = window.location.pathname + (qs ? "?" + qs : "");
    window.history.replaceState(null, "", url);
  }

  // --- filtering & sorting ---------------------------------------------
  function anyFilterActive() {
    if (query) return true;
    if (CONFIG.hasType && typeFilter.length) return true;
    return CONFIG.facets.some(function (f) { return filters[f.key].length; });
  }

  function matches(entry) {
    // AND across facets, OR within a facet.
    for (var i = 0; i < CONFIG.facets.length; i++) {
      var key = CONFIG.facets[i].key;
      var sel = filters[key];
      if (!sel.length) continue;
      var vals = CONFIG.valuesFor(entry, key);
      var ok = sel.some(function (s) { return vals.indexOf(s) !== -1; });
      if (!ok) return false;
    }
    if (CONFIG.hasType && typeFilter.length && typeFilter.indexOf(entry.type) === -1) return false;
    if (query) {
      var q = query.toLowerCase();
      var hit = CONFIG.searchFields.some(function (field) {
        var val = entry[field];
        return val && String(val).toLowerCase().indexOf(q) !== -1;
      });
      if (!hit) return false;
    }
    return true;
  }

  function sortEntries(list) {
    var arr = list.slice();
    arr.sort(function (a, b) {
      switch (sort) {
        case "title-asc": return (a.title || "").localeCompare(b.title || "");
        case "date-asc": return String(a.date || "").localeCompare(String(b.date || ""));
        case "date-desc": return String(b.date || "").localeCompare(String(a.date || ""));
        case "year-asc": return String(a.year_or_date || "").localeCompare(String(b.year_or_date || ""));
        case "year-desc": return String(b.year_or_date || "").localeCompare(String(a.year_or_date || ""));
        default: return 0;
      }
    });
    return arr;
  }

  // --- rendering: chips -------------------------------------------------
  function chip(facet, value) {
    return el("span", { class: "chip chip--" + facet.color, "aria-label": facet.label + ": " + value }, [
      el("span", { class: "chip-abbr", title: facet.label, "aria-hidden": "true", text: facet.abbr }),
      document.createTextNode(value)
    ]);
  }

  // --- rendering: methods cards ----------------------------------------
  function renderCard(entry) {
    var chips = [];
    CONFIG.facets.forEach(function (f) {
      (entry[f.key] || []).forEach(function (v) { chips.push(chip(f, v)); });
    });

    var summary = el("button", {
      class: "card-head",
      type: "button",
      "aria-expanded": "false"
    }, [
      el("h3", { class: "card-title", text: entry.title || "Untitled" }),
      entry.outcome ? el("span", { class: "outcome outcome--" + entry.outcome, text: outcomeLabel(entry.outcome) }) : null,
      el("p", { class: "card-summary", text: entry.summary || "" }),
      el("div", { class: "chip-row" }, chips)
    ]);

    var metaChildren = [];
    if (entry.doi) metaChildren.push(el("p", { class: "card-doi" }, [
      el("a", { href: "https://doi.org/" + entry.doi, target: "_blank", rel: "noopener", text: "doi.org/" + entry.doi })
    ]));
    var byline = [];
    if (entry.contributor) byline.push(entry.contributor);
    if (entry.date) byline.push(entry.date);
    if (byline.length) metaChildren.push(el("p", { class: "card-byline muted", text: byline.join(" · ") }));

    var body = el("div", { class: "card-body", hidden: "hidden" }, [
      el("div", { class: "card-detail", html: entry.body || "" })
    ].concat(metaChildren));

    var card = el("article", { class: "card" }, [summary, body]);

    summary.addEventListener("click", function () {
      var open = summary.getAttribute("aria-expanded") === "true";
      summary.setAttribute("aria-expanded", open ? "false" : "true");
      if (open) body.setAttribute("hidden", "hidden"); else body.removeAttribute("hidden");
      card.classList.toggle("card--open", !open);
    });
    return card;
  }

  function outcomeLabel(v) {
    return ({
      "worked-well": "Worked well",
      "worked-with-caveats": "Worked with caveats",
      "exploratory": "Exploratory"
    })[v] || v;
  }

  // --- rendering: bibliography rows ------------------------------------
  function renderRow(entry) {
    var chips = [];
    CONFIG.facets.forEach(function (f) {
      CONFIG.valuesFor(entry, f.key).forEach(function (v) { chips.push(chip(f, v)); });
    });
    var titleNode = entry.link
      ? el("a", { href: entry.link, target: "_blank", rel: "noopener", text: entry.title || "Untitled" })
      : el("span", { text: entry.title || "Untitled" });

    var meta = [entry.authors_or_institution, entry.year_or_date].filter(Boolean).join(" · ");

    return el("article", { class: "biblio-row" }, [
      el("span", { class: "type-badge type-badge--" + (entry.type || "paper"), text: (entry.type || "paper").toUpperCase() }),
      el("div", { class: "biblio-main" }, [
        el("h3", { class: "biblio-title" }, [titleNode]),
        meta ? el("p", { class: "biblio-meta muted", text: meta }) : null,
        entry.notes ? el("p", { class: "biblio-notes", text: entry.notes }) : null,
        chips.length ? el("div", { class: "chip-row" }, chips) : null
      ])
    ]);
  }

  // --- rendering: filter UI --------------------------------------------
  function buildFilterBar() {
    var bar = document.getElementById("filterbar");
    bar.innerHTML = "";

    if (CONFIG.hasType) {
      bar.appendChild(facetGroup({ key: "__type", label: "Type", abbr: "T", color: "grey" },
        ["paper", "sop"], typeFilter, function (val, on) {
          toggleIn(typeFilter, val, on); update();
        }, function (v) { return v.toUpperCase(); }));
    }

    CONFIG.facets.forEach(function (f) {
      var vocab = SITE.vocab[f.key] || [];
      bar.appendChild(facetGroup(f, vocab, filters[f.key], function (val, on) {
        toggleIn(filters[f.key], val, on); update();
      }));
    });
  }

  function facetGroup(facet, values, selectedRef, onToggle, labelFn) {
    var options = values.map(function (v) {
      var checked = selectedRef.indexOf(v) !== -1;
      var input = el("input", { type: "checkbox", value: v });
      if (checked) input.checked = true;
      input.addEventListener("change", function () { onToggle(v, input.checked); });
      return el("label", { class: "opt" }, [input, el("span", { text: labelFn ? labelFn(v) : v })]);
    });
    var details = el("details", { class: "facet facet--" + facet.color });
    if (selectedRef.length) details.open = true;
    var count = selectedRef.length ? " (" + selectedRef.length + ")" : "";
    details.appendChild(el("summary", { text: facet.label + count }));
    details.appendChild(el("div", { class: "facet-opts" }, options));
    return details;
  }

  function toggleIn(arr, val, on) {
    var i = arr.indexOf(val);
    if (on && i === -1) arr.push(val);
    if (!on && i !== -1) arr.splice(i, 1);
  }

  // --- legend (methods only) -------------------------------------------
  function buildLegend() {
    var ul = document.getElementById("legend-list");
    if (!ul) return;
    CONFIG.facets.forEach(function (f) {
      ul.appendChild(el("li", {}, [
        el("span", { class: "chip chip--" + f.color }, [
          el("span", { class: "chip-abbr", "aria-hidden": "true", text: f.abbr }),
          document.createTextNode(f.label)
        ])
      ]));
    });
  }

  // --- main update loop -------------------------------------------------
  function update() {
    writeUrl();
    var shown = sortEntries(ALL.filter(matches));

    var container = document.getElementById(PAGE === "methods" ? "cards" : "biblio-list");
    container.innerHTML = "";
    var render = PAGE === "methods" ? renderCard : renderRow;
    shown.forEach(function (e) { container.appendChild(render(e)); });

    var count = document.getElementById("results-count");
    count.textContent = shown.length + " of " + ALL.length +
      (PAGE === "methods" ? " methods" : " entries") + " shown";

    document.getElementById("empty-state").hidden = shown.length !== 0;
    var clearBtn = document.getElementById("clear-filters");
    if (clearBtn) clearBtn.hidden = !anyFilterActive();

    // Keep summary counts in the filter bar fresh.
    buildFilterBar();
  }

  function clearAll() {
    CONFIG.facets.forEach(function (f) { filters[f.key] = []; });
    typeFilter = [];
    query = "";
    var qEl = document.getElementById("q");
    if (qEl) qEl.value = "";
    update();
  }

  // --- init -------------------------------------------------------------
  function init() {
    readUrl();
    buildLegend();

    var qEl = document.getElementById("q");
    if (qEl) {
      qEl.value = query;
      var t;
      qEl.addEventListener("input", function () {
        clearTimeout(t);
        t = setTimeout(function () { query = qEl.value.trim(); update(); }, 150);
      });
    }
    var sortEl = document.getElementById("sort");
    if (sortEl) {
      sortEl.value = sort;
      sortEl.addEventListener("change", function () { sort = sortEl.value; update(); });
    }
    ["clear-filters", "empty-clear"].forEach(function (id) {
      var b = document.getElementById(id);
      if (b) b.addEventListener("click", clearAll);
    });

    fetch(CONFIG.dataUrl)
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (data) { ALL = data; update(); })
      .catch(function (err) {
        var container = document.getElementById(PAGE === "methods" ? "cards" : "biblio-list");
        container.innerHTML = "";
        container.appendChild(el("p", { class: "load-error",
          text: "Could not load data (" + err.message + ")." }));
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
