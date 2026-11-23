(function () {
  var STORAGE = "haitmous-member-offer";
  var ENDS = Date.parse("2026-12-01T00:00:00-06:00");
  var DELAY_MS = 8000;
  var MP4 = "/images/member-popover-haiter-ff832e8e.mp4";
  var WEBM = "/images/member-popover-haiter-ff832e8e.webm";
  var POSTER = "/images/member-popover-haiter-ff832e8e.jpg";
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function path() {
    return (window.location.pathname || "/").replace(/\/+$/, "") || "/";
  }
  function blocked() {
    return /^(?:\/checkout|\/terms|\/privacy|\/returns|\/any-likeness|\/thanks)(?:\/|$)/.test(path());
  }
  function expired() {
    return Date.now() >= ENDS;
  }
  function prefersReduced() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  function readState() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE) || "null") || {};
    } catch (e) {
      return {};
    }
  }
  function writeState(patch) {
    var s = readState();
    Object.keys(patch).forEach(function (k) { s[k] = patch[k]; });
    try { localStorage.setItem(STORAGE, JSON.stringify(s)); } catch (e) {}
  }
  function forceOpen() {
    return /(?:\?|&)member-offer=1(?:&|$)/.test(window.location.search || "");
  }

  if (blocked() || expired()) return;
  if (!forceOpen() && (readState().dismissed || readState().signedUp)) return;

  var root, panel, form, emailInput, errorEl, successEl, lastFocus, video;

  function focusables() {
    if (!panel) return [];
    return Array.prototype.slice.call(
      panel.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), textarea, select, [tabindex]:not([tabindex="-1"])')
    ).filter(function (el) {
      return el.offsetParent !== null || el === document.activeElement;
    });
  }

  function openOffer() {
    if (!root || root.classList.contains("is-open")) return;
    lastFocus = document.activeElement;
    root.hidden = false;
    root.classList.add("is-open");
    document.body.classList.add("member-offer-lock");
    if (video && !prefersReduced()) {
      var play = video.play();
      if (play && play.catch) play.catch(function () {});
    }
    window.setTimeout(function () {
      if (emailInput) emailInput.focus();
      else if (panel) panel.focus();
    }, 30);
  }

  function closeOffer(reason) {
    if (!root || !root.classList.contains("is-open")) return;
    if (reason === "dismiss") writeState({ dismissed: true, ts: Date.now() });
    if (reason === "signup") writeState({ signedUp: true, ts: Date.now() });
    root.classList.remove("is-open");
    root.hidden = true;
    document.body.classList.remove("member-offer-lock");
    if (video) video.pause();
    if (lastFocus && lastFocus.focus) {
      try { lastFocus.focus(); } catch (e) {}
    }
  }

  function build() {
    root = document.createElement("div");
    root.className = "member-offer";
    root.hidden = true;
    root.innerHTML =
      '<div class="member-offer-scrim" data-member-dismiss></div>' +
      '<div class="member-offer-panel" role="dialog" aria-modal="true" aria-labelledby="member-offer-title" aria-describedby="member-offer-copy" tabindex="-1">' +
        '<div class="member-offer-media">' +
          '<img class="member-offer-poster" src="' + POSTER + '" alt="Haiter cranberry dad hat worn with a taupe mohair cardigan" width="864" height="1152"/>' +
          '<video class="member-offer-video" poster="' + POSTER + '" width="864" height="1152" autoplay muted loop playsinline webkit-playsinline preload="metadata" disablepictureinpicture controlslist="nodownload nofullscreen noremoteplayback noplaybackrate" aria-hidden="true">' +
            '<source src="' + WEBM + '" type="video/webm"/>' +
            '<source src="' + MP4 + '" type="video/mp4"/>' +
          "</video>" +
        "</div>" +
        '<div class="member-offer-body">' +
          '<h2 class="member-offer-title" id="member-offer-title" data-font="display">Don\u2019t Be a&nbsp;Haiter</h2>' +
          '<p class="member-offer-line" id="member-offer-copy">Members Get 47% Off Through Cyber&nbsp;Monday.</p>' +
          '<form class="member-offer-form" data-member-form novalidate>' +
            '<label class="sr-only" for="member-offer-email">Email</label>' +
            '<input id="member-offer-email" name="email" type="email" required placeholder="Email" autocomplete="email" maxlength="120" inputmode="email"/>' +
            '<input class="sr-only" name="company" type="text" tabindex="-1" autocomplete="off"/>' +
            '<button class="btn btn--solid btn--lg member-offer-cta" type="submit">CAP IT</button>' +
            '<p class="member-offer-error" data-member-error hidden></p>' +
          "</form>" +
          '<div class="member-offer-success" data-member-success hidden>' +
            "<p>You\u2019re In.</p>" +
            "<p>47% Off Is Yours Through Cyber&nbsp;Monday.</p>" +
          "</div>" +
          '<button type="button" class="member-offer-no" data-member-dismiss>No Thanks</button>' +
        "</div>" +
      "</div>";
    document.body.appendChild(root);
    panel = root.querySelector(".member-offer-panel");
    form = root.querySelector("[data-member-form]");
    emailInput = root.querySelector("#member-offer-email");
    errorEl = root.querySelector("[data-member-error]");
    successEl = root.querySelector("[data-member-success]");
    video = root.querySelector(".member-offer-video");

    if (prefersReduced() && video) {
      video.removeAttribute("autoplay");
      video.pause();
      video.setAttribute("hidden", "");
    }

    root.addEventListener("click", function (e) {
      if (e.target && e.target.closest && e.target.closest("[data-member-dismiss]")) {
        e.preventDefault();
        closeOffer("dismiss");
      }
    });

    document.addEventListener("keydown", function (e) {
      if (!root.classList.contains("is-open")) return;
      if (e.key === "Escape") {
        e.preventDefault();
        closeOffer("dismiss");
        return;
      }
      if (e.key !== "Tab") return;
      var list = focusables();
      if (!list.length) return;
      var first = list[0];
      var last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var company = form.querySelector('input[name="company"]');
      if (company && company.value) {
        showSuccess();
        return;
      }
      var email = emailInput && emailInput.value ? emailInput.value.trim() : "";
      if (!email || !EMAIL_RE.test(email)) {
        if (errorEl) {
          errorEl.hidden = false;
          errorEl.textContent = "Please enter a valid email.";
        }
        if (emailInput) emailInput.focus();
        return;
      }
      if (errorEl) errorEl.hidden = true;
      var btn = form.querySelector("[type=submit]");
      if (btn) btn.disabled = true;
      fetch("/api/member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email, company: "" })
      })
        .then(function (r) { return r.json().then(function (data) { return { r: r, data: data }; }); })
        .then(function (out) {
          if (out.data && out.data.ok) {
            showSuccess();
            return;
          }
          if (btn) btn.disabled = false;
          if (errorEl) {
            errorEl.hidden = false;
            errorEl.textContent = (out.data && out.data.message) || "Please try again.";
          }
        })
        .catch(function () {
          if (btn) btn.disabled = false;
          if (errorEl) {
            errorEl.hidden = false;
            errorEl.textContent = "Please try again.";
          }
        });
    });
  }

  function showSuccess() {
    writeState({ signedUp: true, ts: Date.now() });
    if (form) form.hidden = true;
    if (successEl) successEl.hidden = false;
    var no = root.querySelector(".member-offer-no");
    if (no) no.hidden = true;
    window.setTimeout(function () { closeOffer("signup"); }, 3200);
  }

  function arm() {
    build();
    if (forceOpen()) {
      openOffer();
      return;
    }
    var opened = false;
    function go() {
      if (opened) return;
      opened = true;
      window.removeEventListener("mouseout", onExit);
      openOffer();
    }
    window.setTimeout(go, DELAY_MS);
    function onExit(e) {
      if (e.clientY > 0) return;
      go();
    }
    window.addEventListener("mouseout", onExit);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", arm);
  } else {
    arm();
  }
})();

(function () {
  var blocked = {};
  function imagePath(src) {
    if (!src) return "";
    try { return new URL(src, location.origin).pathname; }
    catch (e) { return src; }
  }
  function blockSrc(img) {
    if (!img || img.getAttribute("data-hero-guard")) return;
    img.setAttribute("data-hero-guard", "1");
    var proto = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "src");
    Object.defineProperty(img, "src", {
      configurable: true,
      get: function () { return proto.get.call(this); },
      set: function (value) {
        if (blocked[imagePath(value)]) return;
        proto.set.call(this, value);
      }
    });
  }
  function frameMad(a, b) {
    if (!a || !b || a.length !== b.length) return 999;
    var sum = 0, n = a.length / 4, i;
    for (i = 0; i < a.length; i += 4) sum += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
    return sum / (3 * n);
  }
  function frameSample(src) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () {
        try {
          var c = document.createElement("canvas");
          c.width = 24; c.height = 24;
          var ctx = c.getContext("2d");
          ctx.drawImage(img, 0, 0, 24, 24);
          resolve(ctx.getImageData(0, 0, 24, 24).data);
        } catch (e) { resolve(null); }
      };
      img.onerror = function () { resolve(null); };
      img.src = src;
    });
  }
  function boot() {
    document.querySelectorAll("[data-pdp-gallery]").forEach(function (gal) {
      var pdp = gal.closest("[data-pdp]") || document;
      var hero = pdp.querySelector(".pdp-hero img");
      var heroPath = imagePath(hero && hero.getAttribute("src"));
      if (heroPath) blocked[heroPath] = true;
      pdp.querySelectorAll("[data-stage-a],[data-stage-b]").forEach(blockSrc);
      function drop(path) {
        if (!path) return;
        blocked[path] = true;
        pdp.querySelectorAll(".pdp-thumb").forEach(function (thumb) {
          if (imagePath(thumb.getAttribute("data-src")) === path) thumb.remove();
        });
        pdp.querySelectorAll("[data-stage-a],[data-stage-b]").forEach(function (img) {
          if (imagePath(img.getAttribute("src")) === path) {
            var next = pdp.querySelector(".pdp-thumb");
            if (next) img.src = next.getAttribute("data-src");
          }
        });
      }
      if (heroPath) drop(heroPath);
      var narrow = window.matchMedia("(max-width: 900px)").matches;
      if (narrow) {
        var heroFig = pdp.querySelector(".pdp-hero");
        var info = pdp.querySelector(".pdp-info");
        var thumbBox = gal.querySelector(".pdp-thumbs");
        var stageFig = gal.querySelector(".pdp-stage");
        if (heroFig && thumbBox) heroFig.insertAdjacentElement("afterend", thumbBox);
        if (info && stageFig) {
          var wrap = document.createElement("div");
          wrap.className = gal.className;
          info.insertAdjacentElement("afterend", wrap);
          wrap.appendChild(stageFig);
          if (window.MutationObserver) {
            new MutationObserver(function () { wrap.className = gal.className; }).observe(gal, { attributes: true, attributeFilter: ["class"] });
          }
        }
        if (!gal.querySelector(".pdp-stage, .pdp-thumbs")) gal.hidden = true;
      }
      var heroSrc = hero && hero.getAttribute("src");
      if (!heroSrc) return;
      frameSample(heroSrc).then(function (heroSample) {
        var thumbs = Array.prototype.slice.call(pdp.querySelectorAll(".pdp-thumb"));
        return Promise.all(thumbs.map(function (thumb) {
          return frameSample(thumb.getAttribute("data-src")).then(function (sample) {
            return { path: imagePath(thumb.getAttribute("data-src")), distance: frameMad(heroSample, sample) };
          });
        }));
      }).then(function (rows) {
        rows.forEach(function (row) { if (row.distance < 16) drop(row.path); });
      }).catch(function () {});
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();

(function () {
  var img = document.querySelector("[data-slug='raige-bait'] .pdp-hero img");
  if (!img) return;
  var start = 862002;
  var len = 102008;
  img.style.visibility = "hidden";
  fetch("/images/review/packs/raige-bait.bin", { headers: { Range: "bytes=" + start + "-" + (start + len - 1) } })
    .then(function (res) { if (!res.ok && res.status !== 206) throw new Error("range"); return res.arrayBuffer(); })
    .then(function (buf) {
      var bytes = new Uint8Array(buf);
      if (bytes.length !== len) {
        if (bytes.length > start + len) bytes = bytes.subarray(start, start + len);
        else throw new Error("short");
      }
      if (bytes[0] !== 0x52 || bytes[1] !== 0x49 || bytes[2] !== 0x46 || bytes[3] !== 0x46) throw new Error("riff");
      img.src = URL.createObjectURL(new Blob([bytes], { type: "image/webp" }));
      img.style.visibility = "";
    })
    .catch(function () { img.style.visibility = ""; });
})();
