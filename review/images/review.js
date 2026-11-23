(function () {
  var STORAGE = "haitmous-review-selection";
  var names = {
    "many-are-saying": "Many Are Saying",
    "dot-dot-dot": "Dot Dot Dot",
    "raige-bait": "Raige Bait",
    "sparkle": "Sparkle",
    "haiter": "Haiter",
    "youre-absolutely-right": "You’re Absolutely Right",
    "em-dash": "Em Dash",
    "collection": "Collection / Multi-Hat"
  };
  var order = Object.keys(names);
  var packs = {};
  var packIndex = null;

  function boxes() {
    return Array.prototype.slice.call(document.querySelectorAll('input[type="checkbox"][data-path]'));
  }

  function selected() {
    return boxes().filter(function (b) { return b.checked; });
  }

  function paint() {
    var counts = {};
    order.forEach(function (k) { counts[k] = 0; });
    selected().forEach(function (b) {
      var g = b.getAttribute("data-group") || "collection";
      counts[g] = (counts[g] || 0) + 1;
    });
    boxes().forEach(function (b) {
      var card = b.closest(".rev-card");
      if (card) card.classList.toggle("is-on", b.checked);
    });
    var parts = order
      .filter(function (k) { return document.querySelector('[data-group="' + k + '"]'); })
      .map(function (k) { return names[k] + " " + (counts[k] || 0); });
    var el = document.querySelector("[data-rev-counts]");
    if (el) el.textContent = parts.join("  ·  ") + "  ·  Total " + selected().length;
  }

  function listText() {
    var by = {};
    selected().forEach(function (b) {
      var g = b.getAttribute("data-group") || "collection";
      (by[g] = by[g] || []).push(b.getAttribute("data-path"));
    });
    var lines = [];
    order.forEach(function (k) {
      var paths = by[k];
      if (!paths || !paths.length) return;
      lines.push(names[k]);
      paths.forEach(function (p) { lines.push(p); });
      lines.push("");
    });
    return lines.join("\n").trim() + "\n";
  }

  function persist() {
    var paths = selected().map(function (b) { return b.getAttribute("data-path"); });
    try { localStorage.setItem(STORAGE, JSON.stringify(paths)); } catch (e) {}
  }

  function restore() {
    var raw;
    try { raw = localStorage.getItem(STORAGE); } catch (e) { return; }
    if (!raw) return;
    var paths;
    try { paths = JSON.parse(raw); } catch (e) { return; }
    if (!Array.isArray(paths)) return;
    var set = {};
    paths.forEach(function (p) { set[p] = true; });
    boxes().forEach(function (b) {
      b.checked = !!set[b.getAttribute("data-path")];
    });
  }

  function copy() {
    var text = listText();
    persist();
    var status = document.querySelector("[data-copy-status]");
    function ok() {
      if (!status) return;
      status.hidden = false;
      status.textContent = "Copied " + selected().length + " Paths.";
      setTimeout(function () { status.hidden = true; }, 2000);
    }
    function fail() {
      if (!status) return;
      status.hidden = false;
      status.textContent = "Copy Failed. The List Is Also in Local Storage.";
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(ok).catch(fail);
    } else {
      var ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); ok(); } catch (e) { fail(); }
      ta.remove();
    }
  }

  function sliceUrl(buf, start, length) {
    return URL.createObjectURL(new Blob([buf.slice(start, start + length)], { type: "image/webp" }));
  }

  function applyPack(group, pack) {
    document.querySelectorAll('.rev-thumb[data-pack="' + group + '"]').forEach(function (btn) {
      var id = btn.getAttribute("data-id");
      var rec = pack.entries[id];
      if (!rec) return;
      var img = btn.querySelector("img");
      if (img && !img.src) img.src = rec.thumb;
      btn.setAttribute("data-full-url", rec.full);
    });
  }

  function loadPack(group) {
    if (packs[group]) return packs[group];
    if (!packIndex || !packIndex[group]) return Promise.resolve(null);
    var info = packIndex[group];
    packs[group] = fetch(info.file).then(function (res) { return res.arrayBuffer(); }).then(function (buf) {
      var entries = {};
      Object.keys(info.items).forEach(function (id) {
        var rec = info.items[id];
        entries[id] = {
          thumb: sliceUrl(buf, rec.thumb[0], rec.thumb[1]),
          full: sliceUrl(buf, rec.full[0], rec.full[1])
        };
      });
      var pack = { buf: buf, entries: entries };
      applyPack(group, pack);
      return pack;
    });
    return packs[group];
  }

  var lightbox = document.querySelector("[data-lightbox]");
  var lightboxImg = document.querySelector("[data-lightbox-img]");
  function openBox(url, alt) {
    if (!lightbox || !lightboxImg || !url) return;
    lightboxImg.src = url;
    lightboxImg.alt = alt || "";
    lightbox.hidden = false;
  }
  function closeBox() {
    if (!lightbox || !lightboxImg) return;
    lightbox.hidden = true;
    lightboxImg.src = "";
  }

  document.addEventListener("change", function (e) {
    if (e.target && e.target.matches && e.target.matches('input[type="checkbox"][data-path]')) {
      persist();
      paint();
    }
  });
  var copyBtn = document.querySelector("[data-copy]");
  if (copyBtn) copyBtn.addEventListener("click", copy);
  document.addEventListener("click", function (e) {
    var thumb = e.target.closest && e.target.closest("[data-pack]");
    if (thumb) {
      e.preventDefault();
      var group = thumb.getAttribute("data-pack");
      var ready = thumb.getAttribute("data-full-url");
      if (ready) { openBox(ready, thumb.getAttribute("data-alt")); return; }
      loadPack(group).then(function () {
        openBox(thumb.getAttribute("data-full-url"), thumb.getAttribute("data-alt"));
      });
      return;
    }
    if (e.target.closest && e.target.closest("[data-lightbox-close]")) {
      closeBox();
      return;
    }
    if (e.target === lightbox) closeBox();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeBox();
  });

  restore();
  paint();

  fetch("/images/review/index.json").then(function (res) { return res.json(); }).then(function (idx) {
    packIndex = idx;
    order.forEach(function (g) { if (idx[g]) loadPack(g); });
  });
})();
