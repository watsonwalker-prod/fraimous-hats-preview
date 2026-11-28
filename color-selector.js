/* HAITMOUS Custom Order — reads /color-selector.json. Add scenes in the manifest, not here. */
(function () {
  const MANIFEST = "/color-selector.json";
  const HASH = "custom-order";
  const HASHES = ["custom-order", "try-a-color"];
  const FADE_MS = 280;

  let data = null;
  let root = null;
  let dialog = null;
  let imgA = null;
  let imgB = null;
  let frontIsA = true;
  let sceneId = null;
  let slug = null;
  let previewId = null;
  let lastFocus = null;
  let open = false;
  const preloaded = new Set();

  const reduceMotion = () =>
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function hatsBySlug() {
    const map = {};
    (data.hats || []).forEach((h) => {
      map[h.slug] = h;
    });
    return map;
  }

  function previewColors() {
    return data.previewColors || [];
  }

  function previewById(id) {
    return previewColors().find((c) => c.id === id) || null;
  }

  // Official sayings listed as Printful sync drafts in api/_lib/catalog.js.
  // Preview colors and any other combo are not listed products.
  const PRINTFUL_LISTED = {
    "many-are-saying": true,
    "dot-dot-dot": true,
    "raige-bait": true,
    sparkle: true,
    haiter: true,
    "youre-absolutely-right": true,
    "em-dash": true,
    "i-got-that-doj-in-me": true,
  };

  function isPrintfulListed() {
    if (previewId) return false;
    return !!(slug && PRINTFUL_LISTED[slug]);
  }

  function outOfStockMarkup() {
    return '<span class="cs-oos">Out Of&nbsp;Stock</span>';
  }

  function sceneById(id) {
    return (data.scenes || []).find((s) => s.id === id) || null;
  }

  function available(scene) {
    if (!scene || !scene.hats) return [];
    return (data.hats || []).filter((h) => scene.hats[h.slug]);
  }

  function sceneForHat(wantSlug, preferredId) {
    const scenes = data.scenes || [];
    if (preferredId) {
      const preferred = sceneById(preferredId);
      if (preferred && preferred.hats && preferred.hats[wantSlug]) return preferred;
    }
    if (wantSlug) {
      const hit = scenes.find((s) => s.hats && s.hats[wantSlug]);
      if (hit) return hit;
    }
    return scenes[0] || null;
  }

  function preload(url) {
    if (!url || preloaded.has(url)) return;
    const im = new Image();
    im.decoding = "async";
    im.src = url;
    preloaded.add(url);
  }

  function preloadAll() {
    (data.scenes || []).forEach((scene) => {
      Object.values(scene.hats || {}).forEach(preload);
    });
  }

  function hashPrefix(raw) {
    raw = raw || "";
    for (let i = 0; i < HASHES.length; i++) {
      const h = HASHES[i];
      if (raw === h || raw.indexOf(h + "/") === 0) return h;
    }
    return null;
  }

  function parseHash() {
    const raw = (location.hash || "").replace(/^#/, "");
    if (!hashPrefix(raw)) return null;
    const parts = raw.split("/").filter(Boolean);
    const key = parts[1] || null;
    if (key && key.indexOf("preview-") === 0) {
      return { preview: key.slice("preview-".length), scene: parts[2] || null };
    }
    if (key && previewById(key)) {
      return { preview: key, scene: parts[2] || null };
    }
    return { slug: key, scene: parts[2] || null };
  }

  function writeHash(nextSlug, nextScene, replace) {
    const next = "#" + [HASH, nextSlug, nextScene].filter(Boolean).join("/");
    if ((location.hash || "") === next) return;
    if (replace) history.replaceState(null, "", next);
    else history.pushState(null, "", next);
  }

  function clearHash() {
    const raw = (location.hash || "").replace(/^#/, "");
    if (!hashPrefix(raw)) return;
    history.replaceState(null, "", location.pathname + location.search);
  }

  function pageHatSlug() {
    const m = (location.pathname || "").match(/\/hats\/([^/]+)\/?/);
    if (m && m[1] && hatsBySlug()[m[1]]) return m[1];
    return null;
  }

  function previewSubject() {
    return pageHatSlug() || slug || null;
  }

  function previewUrl(scene, colorId, hatSlug) {
    if (!scene || !scene.previews) return "";
    const entry = scene.previews[colorId];
    if (!entry) return "";
    if (typeof entry === "string") return entry;
    const key = hatSlug || previewSubject();
    return (key && entry[key]) || "";
  }

  function currentUrl() {
    const scene = sceneById(sceneId);
    if (!scene) return "";
    if (previewId) return previewUrl(scene, previewId);
    return scene.hats ? scene.hats[slug] : "";
  }

  function currentAlt() {
    const scene = sceneById(sceneId);
    const sceneLabel = scene && scene.label ? ", " + scene.label : "";
    const preview = previewById(previewId);
    if (preview) {
      const hat = hatsBySlug()[previewSubject()];
      const who = hat ? hat.name + " in " : "";
      return who + preview.color + sceneLabel;
    }
    const hat = hatsBySlug()[slug];
    if (!hat) return "";
    return hat.name + " in " + hat.color + sceneLabel;
  }

  function showImage(url, alt) {
    if (!url) return;
    const incoming = frontIsA ? imgB : imgA;
    const outgoing = frontIsA ? imgA : imgB;

    const reveal = () => {
      incoming.alt = alt || "";
      incoming.classList.add("is-on");
      outgoing.classList.remove("is-on");
      outgoing.removeAttribute("alt");
      outgoing.setAttribute("aria-hidden", "true");
      incoming.removeAttribute("aria-hidden");
      frontIsA = !frontIsA;
      incoming.onload = null;
    };

    // First paint: fill the already-visible layer, no fade from empty.
    if (!outgoing.getAttribute("src")) {
      outgoing.alt = alt || "";
      outgoing.src = url;
      outgoing.removeAttribute("aria-hidden");
      incoming.setAttribute("aria-hidden", "true");
      return;
    }
    if (outgoing.getAttribute("src") === url) {
      outgoing.alt = alt || "";
      return;
    }
    if (incoming.getAttribute("src") === url && incoming.complete && incoming.naturalWidth) {
      reveal();
      return;
    }
    incoming.onload = reveal;
    incoming.src = url;
    if (incoming.complete && incoming.naturalWidth) reveal();
  }

  function render() {
    if (!open || !data) return;
    const scene = sceneById(sceneId);
    const hat = hatsBySlug()[slug];
    const list = available(scene);
    const stage = root.querySelector(".cs-stage");
    stage.style.aspectRatio = (scene && scene.aspect) || "16 / 9";
    stage.classList.toggle("is-studio", !!previewId);

    const tabs = root.querySelector("[data-cs-scenes]");
    tabs.innerHTML = (data.scenes || [])
      .map((s) => {
        const on = s.id === sceneId;
        return (
          '<button type="button" class="cs-scene' +
          (on ? " is-on" : "") +
          '" role="tab" aria-selected="' +
          (on ? "true" : "false") +
          '" data-scene="' +
          escapeAttr(s.id) +
          '">' +
          escapeHtml(s.label) +
          "</button>"
        );
      })
      .join("");

    const group = root.querySelector("[data-cs-swatches]");
    const hatBtns = list
      .map((h) => {
        const on = !previewId && h.slug === slug;
        const light = isLight(h.swatch);
        return (
          '<button type="button" class="cs-swatch' +
          (on ? " is-on" : "") +
          (light ? " is-light" : "") +
          '" role="radio" aria-checked="' +
          (on ? "true" : "false") +
          '" aria-label="' +
          escapeAttr(h.color + ", " + h.name) +
          '" data-slug="' +
          escapeAttr(h.slug) +
          '" style="--cs-swatch:' +
          escapeAttr(h.swatch || "#888") +
          '"' +
          (on ? ' tabindex="0"' : ' tabindex="-1"') +
          "></button>"
        );
      })
      .join("");
    const previewBtns = previewColors()
      .filter((c) => previewUrl(scene, c.id))
      .map((c) => {
        const on = previewId === c.id;
        const light = isLight(c.swatch);
        return (
          '<button type="button" class="cs-swatch' +
          (on ? " is-on" : "") +
          (light ? " is-light" : "") +
          '" role="radio" aria-checked="' +
          (on ? "true" : "false") +
          '" aria-label="' +
          escapeAttr(c.color + ", Out Of Stock") +
          '" data-preview="' +
          escapeAttr(c.id) +
          '" style="--cs-swatch:' +
          escapeAttr(c.swatch || "#888") +
          '"' +
          (on ? ' tabindex="0"' : ' tabindex="-1"') +
          "></button>"
        );
      })
      .join("");
    group.innerHTML = hatBtns + previewBtns;

    const nameEl = root.querySelector("[data-cs-name]");
    const colorEl = root.querySelector("[data-cs-color]");
    const priceEl = root.querySelector("[data-cs-price]");
    const viewEl = root.querySelector("[data-cs-view]");
    const preview = previewById(previewId);
    if (preview) {
      nameEl.textContent = preview.color;
      nameEl.classList.remove("is-emoji", "is-dash");
      colorEl.textContent = "Cap Color";
      // Comfort Colors previews are not Printful-listed products.
      priceEl.innerHTML = isPrintfulListed() ? (
        '<del class="price-was"><span class="sr-only">Was </span>' +
        escapeHtml(data.listPrice) +
        '</del><span class="price-now"><span class="sr-only">Now </span>' +
        escapeHtml(data.salePrice) +
        '</span><span class="price-perk">47% Off for&nbsp;Members · BFCM · Limited&nbsp;Supply</span>'
      ) : outOfStockMarkup();
      viewEl.removeAttribute("href");
      viewEl.hidden = true;
    } else if (hat) {
      nameEl.textContent = hat.name;
      nameEl.classList.toggle("is-emoji", hat.name === "✨");
      nameEl.classList.toggle("is-dash", hat.name === "—" || hat.name === "–");
      colorEl.textContent = hat.color;
      if (isPrintfulListed()) {
        priceEl.innerHTML =
          '<del class="price-was"><span class="sr-only">Was </span>' +
          escapeHtml(data.listPrice) +
          '</del><span class="price-now"><span class="sr-only">Now </span>' +
          escapeHtml(data.salePrice) +
          '</span><span class="price-perk">47% Off for&nbsp;Members · BFCM · Limited&nbsp;Supply</span>';
        viewEl.href = hat.href;
        viewEl.hidden = false;
      } else {
        priceEl.innerHTML = outOfStockMarkup();
        viewEl.removeAttribute("href");
        viewEl.hidden = true;
      }
    } else {
      nameEl.textContent = "";
      colorEl.textContent = "";
      priceEl.innerHTML = "";
      viewEl.hidden = true;
    }

    showImage(currentUrl(), currentAlt());
  }

  function isLight(hex) {
    if (!hex || hex.charAt(0) !== "#" || (hex.length !== 7 && hex.length !== 4)) return false;
    let r, g, b;
    if (hex.length === 4) {
      r = parseInt(hex.charAt(1) + hex.charAt(1), 16);
      g = parseInt(hex.charAt(2) + hex.charAt(2), 16);
      b = parseInt(hex.charAt(3) + hex.charAt(3), 16);
    } else {
      r = parseInt(hex.slice(1, 3), 16);
      g = parseInt(hex.slice(3, 5), 16);
      b = parseInt(hex.slice(5, 7), 16);
    }
    return (r * 299 + g * 587 + b * 114) / 1000 > 200;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function escapeAttr(s) {
    return escapeHtml(s);
  }

  function selectHat(nextSlug, nextScene, fromHash) {
    const scene = sceneForHat(nextSlug, nextScene || sceneId);
    if (!scene) return;
    const list = available(scene);
    if (!list.length) return;
    const hat =
      list.find((h) => h.slug === nextSlug) ||
      list.find((h) => h.slug === slug) ||
      list[0];
    sceneId = scene.id;
    slug = hat.slug;
    previewId = null;
    if (!fromHash) writeHash(slug, sceneId, true);
    render();
    const on = root.querySelector('.cs-swatch.is-on');
    if (on && dialog.contains(document.activeElement) && document.activeElement.classList.contains("cs-swatch")) {
      on.focus();
    }
  }

  function selectPreview(id, nextScene, fromHash) {
    const preview = previewById(id);
    if (!preview) return;
    const scenes = data.scenes || [];
    let scene = nextScene ? sceneById(nextScene) : sceneById(sceneId);
    if (!previewUrl(scene, id)) {
      scene = scenes.find((s) => previewUrl(s, id)) || scene;
    }
    if (!previewUrl(scene, id)) return;
    sceneId = scene.id;
    previewId = id;
    if (!fromHash) writeHash("preview-" + id, sceneId, true);
    render();
    const on = root.querySelector(".cs-swatch.is-on");
    if (on && dialog.contains(document.activeElement) && document.activeElement.classList.contains("cs-swatch")) {
      on.focus();
    }
  }

  function openModal(opts) {
    opts = opts || {};
    if (!data || !(data.scenes || []).length) return;
    if (!open) {
      lastFocus = document.activeElement;
      open = true;
      root.hidden = false;
      document.body.classList.add("cs-lock");
      requestAnimationFrame(() => root.classList.add("is-open"));
    }
    if (opts.preview) selectPreview(opts.preview, opts.scene, opts.fromHash);
    else selectHat(opts.slug, opts.scene, opts.fromHash);
    if (!opts.fromHash) writeHash(previewId ? "preview-" + previewId : slug, sceneId, false);
    const closeBtn = root.querySelector("[data-cs-close-btn]");
    if (closeBtn) closeBtn.focus();
  }

  function closeModal() {
    if (!open) return;
    open = false;
    root.classList.remove("is-open");
    document.body.classList.remove("cs-lock");
    clearHash();
    const hide = () => {
      if (!open) root.hidden = true;
    };
    if (reduceMotion()) hide();
    else setTimeout(hide, FADE_MS);
    if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
    lastFocus = null;
  }

  function onKey(e) {
    if (!open) return;
    if (e.key === "Escape") {
      e.preventDefault();
      closeModal();
      return;
    }
    if (e.key === "Tab") {
      const nodes = focusables();
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
      return;
    }
    if (
      (e.key === "ArrowRight" || e.key === "ArrowLeft" || e.key === "ArrowUp" || e.key === "ArrowDown") &&
      dialog.contains(document.activeElement) &&
      (document.activeElement.classList.contains("cs-swatch") ||
        document.activeElement.closest("[data-cs-swatches]"))
    ) {
      e.preventDefault();
      const scene = sceneById(sceneId);
      const list = available(scene).map((h) => ({ kind: "hat", id: h.slug }));
      previewColors().forEach((c) => {
        if (previewUrl(scene, c.id)) list.push({ kind: "preview", id: c.id });
      });
      const cur = previewId ? list.findIndex((it) => it.kind === "preview" && it.id === previewId) : list.findIndex((it) => it.kind === "hat" && it.id === slug);
      if (cur < 0 || !list.length) return;
      const dir = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1;
      const next = list[(cur + dir + list.length) % list.length];
      if (next.kind === "preview") selectPreview(next.id, sceneId);
      else selectHat(next.id, sceneId);
      const btn = root.querySelector('.cs-swatch.is-on');
      if (btn) btn.focus();
    }
  }

  function focusables() {
    if (!dialog) return [];
    return Array.prototype.slice
      .call(dialog.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'))
      .filter((el) => !el.hidden && el.offsetParent !== null);
  }

  function onClick(e) {
    const openBtn = e.target.closest("[data-open-color-selector], a[href^='#try-a-color'], a[href^='#custom-order']");
    if (openBtn) {
      const href = openBtn.getAttribute("href") || "";
      let wantSlug = openBtn.getAttribute("data-hat") || null;
      let wantScene = openBtn.getAttribute("data-scene") || null;
      let wantPreview = openBtn.getAttribute("data-preview") || null;
      const hrefHash = href.replace(/^[^#]*#/, "");
      if (hashPrefix(hrefHash)) {
        const parsed = (function () {
          const raw = href.replace(/^[^#]*#/, "");
          const parts = raw.split("/").filter(Boolean);
          const key = parts[1] || null;
          const scene = parts[2] || null;
          if (key && key.indexOf("preview-") === 0) return { preview: key.slice("preview-".length), scene: scene };
          if (key && previewById(key)) return { preview: key, scene: scene };
          return { slug: key, scene: scene };
        })();
        wantSlug = wantSlug || parsed.slug;
        wantScene = wantScene || parsed.scene;
        wantPreview = parsed.preview || wantPreview;
      }
      e.preventDefault();
      openModal({ slug: wantSlug, scene: wantScene, preview: wantPreview });
      return;
    }
    if (!open) return;
    if (e.target.closest("[data-cs-close]")) {
      e.preventDefault();
      closeModal();
      return;
    }
    const previewBtn = e.target.closest("[data-preview]");
    if (previewBtn && dialog.contains(previewBtn)) {
      selectPreview(previewBtn.getAttribute("data-preview"), sceneId);
      return;
    }
    const swatch = e.target.closest("[data-slug]");
    if (swatch && dialog.contains(swatch)) {
      selectHat(swatch.getAttribute("data-slug"), sceneId);
      return;
    }
    const tab = e.target.closest("[data-scene]");
    if (tab && dialog.contains(tab)) {
      const nextScene = tab.getAttribute("data-scene");
      const scene = sceneById(nextScene);
      if (previewId && previewUrl(scene, previewId)) {
        selectPreview(previewId, nextScene);
      } else {
        const keep = scene && scene.hats && scene.hats[slug] ? slug : null;
        selectHat(keep, nextScene);
      }
    }
  }

  function onHash() {
    const parsed = parseHash();
    if (parsed) openModal({ slug: parsed.slug, scene: parsed.scene, preview: parsed.preview, fromHash: true });
    else if (open) closeModal();
  }

  function build() {
    root = document.createElement("div");
    root.className = "cs-root";
    root.hidden = true;
    root.innerHTML =
      '<div class="cs-backdrop" data-cs-close tabindex="-1"></div>' +
      '<div class="cs-dialog" role="dialog" aria-modal="true" aria-labelledby="cs-title" tabindex="-1">' +
      '<button type="button" class="cs-close" data-cs-close data-cs-close-btn aria-label="Close">Close</button>' +
      '<div class="cs-stage" data-cs-stage>' +
      '<img class="cs-img is-on" alt="" width="1280" height="720"/>' +
      '<img class="cs-img" alt="" aria-hidden="true" width="1280" height="720"/>' +
      "</div>" +
      '<div class="cs-panel">' +
      '<h2 id="cs-title" class="cs-title" data-font="display">Custom&nbsp;Order</h2>' +
      '<div class="cs-scenes" data-cs-scenes role="tablist" aria-label="Scenes"></div>' +
      '<div class="cs-swatches" data-cs-swatches role="radiogroup" aria-label="Hat Color"></div>' +
      '<p class="cs-name" data-cs-name data-font="display"></p>' +
      '<p class="cs-color" data-cs-color></p>' +
      '<p class="cs-price" data-cs-price data-font="mono"></p>' +
      '<a class="cs-view" data-cs-view href="/hats">View&nbsp;Hat</a>' +
      "</div></div>";
    document.body.appendChild(root);
    dialog = root.querySelector(".cs-dialog");
    const imgs = root.querySelectorAll(".cs-img");
    imgA = imgs[0];
    imgB = imgs[1];
  }

  function bind() {
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    window.addEventListener("hashchange", onHash);
    window.addEventListener("popstate", onHash);
  }

  function init(json) {
    data = json;
    if (!data || !data.scenes || !data.scenes.length) return;
    build();
    bind();
    preloadAll();
    if (parseHash()) onHash();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  function boot() {
    fetch(MANIFEST, { credentials: "same-origin" })
      .then((r) => {
        if (!r.ok) throw new Error("color-selector manifest " + r.status);
        return r.json();
      })
      .then(init)
      .catch((err) => {
        console.warn(err);
      });
  }
})();
