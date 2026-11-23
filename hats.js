/* HAITMOUS promo. Reads ?promo=CODE and saves it. A "Code CODE Applied"
   banner is shown only when the code actually changes the $414.12 total. */
(function () {
  var KEY = "haitmousPromo", DAYS = 30;
  // Cents off the visible $414.12 member price. Empty: no current code changes the total.
  var DISCOUNTS = Object.freeze({});
  function clean(c) { c = String(c || "").trim().toUpperCase(); return /^[A-Z0-9_-]{3,24}$/.test(c) ? c : ""; }
  function off(c) { return (DISCOUNTS[c] || 0) | 0; }
  function save(c) {
    try { localStorage.setItem(KEY, JSON.stringify({ code: c, exp: Date.now() + DAYS * 864e5 })); } catch (e) {}
    document.cookie = KEY + "=" + encodeURIComponent(c) + ";path=/;max-age=" + DAYS * 86400 + ";SameSite=Lax";
  }
  function load() {
    try { var o = JSON.parse(localStorage.getItem(KEY) || "null"); if (o && o.exp > Date.now()) return clean(o.code); } catch (e) {}
    var m = document.cookie.match(new RegExp("(?:^|; )" + KEY + "=([^;]*)")); return m ? clean(decodeURIComponent(m[1])) : "";
  }
  var params = new URLSearchParams(location.search);
  var fromUrl = clean(params.get("promo"));
  if (fromUrl) save(fromUrl);
  var code = fromUrl || load();
  window.haitmousPromo = function () {
    var c = load();
    return (c && off(c) > 0) ? c : "";
  };
  if (!code || off(code) <= 0) return;

  function fill() {
    document.querySelectorAll('input[name="promo"],input[data-promo]').forEach(function (i) { if (!i.value) i.value = code; });
  }
  function copy(btn) {
    var done = function () { btn.textContent = "Copied"; setTimeout(function () { btn.textContent = "Copy Code"; }, 1800); };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(code).then(done, fallback); else fallback();
    function fallback() { var t = document.createElement("textarea"); t.value = code; document.body.appendChild(t); t.select(); try { document.execCommand("copy"); done(); } catch (e) {} t.remove(); }
  }
  function clear() {
    try { localStorage.removeItem(KEY); } catch (e) {}
    document.cookie = KEY + "=;path=/;max-age=0;SameSite=Lax";
    try {
      var u = new URL(location.href);
      if (u.searchParams.has("promo")) {
        u.searchParams.delete("promo");
        history.replaceState(null, "", u.pathname + (u.search ? u.search : "") + u.hash);
      }
    } catch (e) {}
  }
  function banner() {
    if (document.getElementById("promo-banner")) return;
    var b = document.createElement("div");
    b.id = "promo-banner"; b.setAttribute("role", "status");
    b.style.cssText = "position:sticky;top:0;z-index:60;display:flex;gap:12px;align-items:center;justify-content:center;flex-wrap:wrap;padding:10px 16px;background:#14301F;color:#F5F1E8;font:500 12px/1.4 'IBM Plex Mono',monospace;letter-spacing:.12em;text-transform:none";
    b.innerHTML = '<span>Code <b>' + code + '</b> Applied</span>';
    var btn = document.createElement("button"); btn.type = "button"; btn.textContent = "Copy Code";
    btn.style.cssText = "background:#F5F1E8;color:#1a100c;border:0;border-radius:0;padding:6px 12px;font:inherit;letter-spacing:.12em;cursor:pointer;text-transform:none";
    btn.onclick = function () { copy(btn); };
    var x = document.createElement("button"); x.type = "button"; x.setAttribute("aria-label", "Dismiss"); x.textContent = "\u00d7";
    x.style.cssText = "background:none;border:0;color:#A8A9AD;font-size:16px;cursor:pointer";
    x.onclick = function () { clear(); b.remove(); };
    b.appendChild(btn); b.appendChild(x);
    document.body.insertBefore(b, document.body.firstChild);
  }
  function run() { banner(); fill(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run); else run();
})();


(function () {
  "use strict";

  var fineHover = window.matchMedia("(hover: hover) and (pointer: fine)");

  document.querySelectorAll(".hat-card[data-swap]").forEach(function (card) {
    var revealed = false;
    card.addEventListener("click", function (e) {
      if (fineHover.matches) return;
      if (!revealed) {
        e.preventDefault();
        card.classList.add("is-worn");
        revealed = true;
      }
    });
  });

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function armMute(video) {
    if (!video) return;
    video.muted = true;
    video.defaultMuted = true;
    try { video.volume = 0; } catch (err) {}
    video.setAttribute("muted", "");
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    video.controls = false;
    video.removeAttribute("controls");
    video.loop = true;
    video.autoplay = true;
    video.disablePictureInPicture = true;
  }

  function showSoonFallback(tile) {
    if (!tile) return;
    var video = tile.querySelector("[data-soon-video]");
    var fallback = tile.querySelector("[data-soon-fallback]");
    if (video) {
      try { video.pause(); } catch (err) {}
      video.hidden = true;
    }
    if (fallback) fallback.hidden = false;
  }

  function tryPlay(video, onFail) {
    if (!video) return;
    var tries = 0;
    var max = 8;
    var settled = false;
    function attempt() {
      if (settled) return;
      armMute(video);
      var play = video.play();
      if (play && play.then) {
        play.then(function () {
          settled = true;
          video.hidden = false;
        }).catch(function () {
          tries += 1;
          if (tries < max) {
            window.setTimeout(attempt, 200 * tries);
          } else if (onFail) {
            onFail();
          }
        });
      } else if (video.paused && onFail && tries >= max) {
        onFail();
      }
    }
    ["loadeddata", "canplay", "canplaythrough"].forEach(function (ev) {
      video.addEventListener(ev, attempt);
    });
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) attempt();
    });
    window.addEventListener("pageshow", attempt);
    ["touchstart", "pointerdown", "click"].forEach(function (ev) {
      document.addEventListener(ev, attempt, { passive: true });
    });
    attempt();
  }

  document.querySelectorAll("[data-soon]").forEach(function (tile) {
    var video = tile.querySelector("[data-soon-video]");
    if (!video) return;
    armMute(video);
    tryPlay(video, function () { showSoonFallback(tile); });
  });

  function showSoonState(wrap, state, email) {
    var form = wrap.querySelector("[data-notify-form]");
    var check = wrap.querySelector("[data-notify-check]");
    var verified = wrap.querySelector("[data-notify-verified]");
    var err = wrap.querySelector("[data-notify-error]");
    if (form) form.hidden = state !== "form";
    if (check) check.hidden = state !== "check";
    if (verified) verified.hidden = state !== "verified";
    if (err && state !== "form") err.hidden = true;
    if (state === "check" && email) {
      var slot = wrap.querySelector("[data-notify-email]");
      if (slot) slot.textContent = email;
    }
  }

  document.querySelectorAll("[data-notify-form]").forEach(function (form) {
    var wrap = form.closest("[data-notify]") || form.parentElement;
    var params = new URLSearchParams(window.location.search);
    if (params.get("verified") === "1") {
      showSoonState(wrap, "verified");
    }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var err = wrap.querySelector("[data-notify-error]");
      var honey = form.querySelector('input[name="company"]');
      if (honey && honey.value) {
        showSoonState(wrap, "check", "you");
        return;
      }
      var nameInput = form.querySelector('input[name="name"]');
      var emailInput = form.querySelector('input[name="email"]');
      var name = nameInput && nameInput.value ? nameInput.value.trim() : "";
      var email = emailInput && emailInput.value ? emailInput.value.trim() : "";
      if (!name || name.length < 2 || !email || !EMAIL_RE.test(email)) {
        if (err) {
          err.hidden = false;
          err.textContent = "Please enter your name and a valid email.";
        }
        return;
      }
      if (err) err.hidden = true;
      showSoonState(wrap, "check", email);
    });
  });

  var checkoutEnabled = false;
  var checkoutPreview = false;
  var checkoutStatusKnown = false;

  function showCheckoutOff(root) {
    var note = (root && root.querySelector("[data-atc-note]")) || document.querySelector("[data-atc-note]");
    var form = root && root.querySelector("[data-checkout-form]");
    var btn = root && root.querySelector("[data-atc]");
    if (note) note.hidden = false;
    if (form) form.hidden = true;
    if (btn) btn.setAttribute("aria-expanded", "true");
  }

  function showCheckoutForm(root) {
    var note = root && root.querySelector("[data-atc-note]");
    var form = root && root.querySelector("[data-checkout-form]");
    var btn = root && root.querySelector("[data-atc]");
    if (note) note.hidden = true;
    if (form) form.hidden = false;
    if (btn) btn.setAttribute("aria-expanded", "true");
  }

  function loadCheckoutStatus() {
    if (checkoutStatusKnown) return Promise.resolve(checkoutEnabled || checkoutPreview);
    return fetch("/api/checkout", { method: "GET", cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        checkoutEnabled = !!(data && data.ok && data.enabled);
        checkoutPreview = !!(data && data.ok && data.previewCheckout);
        checkoutStatusKnown = true;
        document.querySelectorAll("[data-checkout-banner]").forEach(function (el) {
          if (checkoutPreview) el.textContent = "Preview Checkout · No Charge";
        });
        return checkoutEnabled || checkoutPreview;
      })
      .catch(function () {
        checkoutEnabled = false;
        checkoutPreview = false;
        checkoutStatusKnown = true;
        return false;
      });
  }

  document.querySelectorAll("[data-atc]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var root = btn.closest("[data-pdp]") || document;
      loadCheckoutStatus().then(function (enabled) {
        if (enabled) showCheckoutForm(root);
        else showCheckoutOff(root);
      });
    });
  });

  document.querySelectorAll("[data-checkout-form]").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var root = form.closest("[data-pdp]") || document;
      var err = form.querySelector("[data-checkout-error]");
      var nameInput = form.querySelector('input[name="name"]');
      var emailInput = form.querySelector('input[name="email"]');
      var slug = (form.getAttribute("data-slug") || (root && root.getAttribute("data-slug")) || "").trim();
      var name = nameInput && nameInput.value ? nameInput.value.trim() : "";
      var email = emailInput && emailInput.value ? emailInput.value.trim() : "";
      if (!name || name.length < 2 || !email || !EMAIL_RE.test(email) || !slug) {
        if (err) {
          err.hidden = false;
          err.textContent = "Please enter your name and a valid email.";
        }
        return;
      }
      if (err) err.hidden = true;
      var submit = form.querySelector('button[type="submit"]');
      if (submit) submit.disabled = true;
      fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name, email: email, items: [{ slug: slug, qty: 1 }], promo: (window.haitmousPromo && window.haitmousPromo()) || "" })
      }).then(function (r) { return r.json().then(function (data) { return { r: r, data: data }; }); })
        .then(function (out) {
          var data = out.data || {};
          if (!data.ok) {
            if (data.error === "disabled") {
              if (err) {
                err.hidden = false;
                err.textContent = data.message || "Checkout Opens Soon";
              }
              return;
            }
            if (err) {
              err.hidden = false;
              err.textContent = data.message || "Checkout isn’t available right now.";
            }
            return;
          }
          if ((data.mode === "preview" || data.mode === "hosted") && data.url) {
            window.location.href = data.url;
            return;
          }
          if (data.mode === "elements" && data.clientSecret && data.publishableKey) {
            try {
              sessionStorage.setItem("hatCheckout", JSON.stringify({
                clientSecret: data.clientSecret,
                publishableKey: data.publishableKey,
                orderNumber: data.orderNumber || ""
              }));
            } catch (storeErr) {}
            window.location.href = "/checkout";
            return;
          }
          if (err) {
            err.hidden = false;
            err.textContent = "Checkout isn’t available right now.";
          }
        })
        .catch(function () {
          if (err) {
            err.hidden = false;
            err.textContent = "Checkout isn’t available right now.";
          }
        })
        .then(function () {
          if (submit) submit.disabled = false;
        });
    });
  });

  (function thanksPage() {
    var status = document.querySelector("[data-thanks-status]");
    if (!status) return;
    var params = new URLSearchParams(window.location.search);
    if (params.get("preview") === "1") {
      status.textContent = "This Is A Preview Order. No Charge Was Made.";
      var order = document.querySelector("[data-thanks-order]");
      if (order && params.get("order")) {
        order.hidden = false;
        order.textContent = params.get("order");
      }
      var itemsEl = document.querySelector("[data-thanks-items]");
      var rawItems = params.get("items") || "";
      if (itemsEl && rawItems) {
        itemsEl.hidden = false;
        itemsEl.textContent = rawItems.split(",").map(function (part) {
          var bits = part.split(":");
          var slug = bits[0] || "";
          var qty = parseInt(bits[1] || "1", 10) || 1;
          return slug.replace(/-/g, " ") + (qty > 1 ? " ×" + qty : "");
        }).join(", ");
      }
      return;
    }
    var id = params.get("session_id") || "";
    if (!id) {
      status.textContent = "Your payment is in. We’ll embroider the hat to order.";
      return;
    }
    fetch("/api/paid?session_id=" + encodeURIComponent(id), { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data || !data.ok || !data.paid) {
          status.textContent = "We’re still confirming your payment.";
          return;
        }
        status.textContent = "Your order is in.";
        var order = document.querySelector("[data-thanks-order]");
        if (order && data.orderNumber) {
          order.hidden = false;
          order.textContent = data.orderNumber;
        }
        var itemsEl = document.querySelector("[data-thanks-items]");
        if (itemsEl && data.items && data.items.length) {
          itemsEl.hidden = false;
          itemsEl.textContent = data.items.map(function (it) {
            return (it.title || it.slug) + (it.qty > 1 ? " ×" + it.qty : "");
          }).join(", ");
        }
      })
      .catch(function () {
        status.textContent = "Your payment is in. We’ll embroider the hat to order.";
      });
  })();

  (function elementsPage() {
    var mount = document.querySelector("[data-pay-element]");
    if (!mount) return;
    var status = document.querySelector("[data-pay-status]");
    var err = document.querySelector("[data-pay-error]");
    var stored = null;
    try { stored = JSON.parse(sessionStorage.getItem("hatCheckout") || "null"); } catch (e) { stored = null; }
    if (!stored || !stored.clientSecret || !stored.publishableKey) {
      if (status) status.textContent = "Checkout Opens Soon";
      return;
    }
    var script = document.createElement("script");
    script.src = "https://js.stripe.com/endive/stripe.js";
    script.onload = function () {
      if (!window.Stripe) return;
      var stripe = window.Stripe(stored.publishableKey);
      var checkoutPromise = stripe.initCheckout({ clientSecret: stored.clientSecret });
      checkoutPromise.then(function (checkout) {
        if (status) status.textContent = "Pay securely below.";
        mount.hidden = false;
        var payment = checkout.createPaymentElement();
        payment.mount(mount);
      }).catch(function () {
        if (err) {
          err.hidden = false;
          err.textContent = "Checkout isn’t available right now.";
        }
      });
    };
    document.head.appendChild(script);
  })();

  document.querySelectorAll("[data-pdp-gallery]").forEach(function (gal) {
    var stageA = gal.querySelector("[data-stage-a]");
    var stageB = gal.querySelector("[data-stage-b]");
    if (!stageA) return;
    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var autoplayOn = gal.getAttribute("data-autoplay") === "1" && !reduced;
    var thumbs = Array.prototype.slice.call(gal.querySelectorAll(".pdp-thumb"));
    var timer = null;
    var idx = 0;
    var paused = false;
    var usingB = false;

    function applyFit(thumb) {
      gal.classList.toggle("is-product", !!(thumb && thumb.getAttribute("data-fit") === "contain"));
    }

    function applyFocus(el, thumb) {
      if (!el) return;
      var focus = (thumb && thumb.getAttribute("data-focus")) || "center";
      el.style.setProperty("--media-focus", focus);
      el.style.objectPosition = focus;
    }

    function show(thumb, fade) {
      if (!thumb) return;
      var src = thumb.getAttribute("data-src");
      var alt = thumb.getAttribute("data-alt") || "";
      if (!src) return;
      var i = thumbs.indexOf(thumb);
      if (i >= 0) idx = i;
      applyFit(thumb);
      var canFade = fade && !reduced && stageB;
      if (canFade) {
        var incoming = usingB ? stageA : stageB;
        var outgoing = usingB ? stageB : stageA;
        incoming.src = src;
        incoming.alt = alt;
        applyFocus(incoming, thumb);
        incoming.classList.add("is-on");
        outgoing.classList.remove("is-on");
        usingB = !usingB;
      } else {
        stageA.src = src;
        stageA.alt = alt;
        applyFocus(stageA, thumb);
        stageA.classList.add("is-on");
        if (stageB) stageB.classList.remove("is-on");
        usingB = false;
      }
      thumbs.forEach(function (t) {
        t.classList.toggle("is-on", t === thumb);
      });
    }

    function stop() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    }

    function start() {
      stop();
      if (autoplayOn && thumbs.length >= 2 && !paused) {
        timer = setInterval(function () {
          if (paused) return;
          idx = (idx + 1) % thumbs.length;
          show(thumbs[idx], true);
        }, 4000);
      }
    }

    thumbs.forEach(function (thumb) {
      thumb.addEventListener("click", function () {
        show(thumb, false);
        paused = true;
        stop();
        window.setTimeout(function () {
          paused = false;
          start();
        }, 8000);
      });
    });

    gal.addEventListener("pointerenter", function () {
      paused = true;
      stop();
    });
    gal.addEventListener("pointerleave", function () {
      paused = false;
      start();
    });

    var initial = gal.querySelector(".pdp-thumb.is-on") || thumbs[0];
    if (initial) {
      idx = Math.max(thumbs.indexOf(initial), 0);
      applyFit(initial);
      applyFocus(stageA, initial);
    }
    start();
  });

  (function () {
    var heroes = document.querySelectorAll("[data-hero-pan]");
    if (!heroes.length) return;
    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    var ticking = false;
    function update() {
      ticking = false;
      var i, el, img, extra, travel, rect, traveled, max, p;
      for (i = 0; i < heroes.length; i++) {
        el = heroes[i];
        img = el.querySelector("img");
        if (!img) continue;
        extra = img.offsetHeight - el.clientHeight;
        // Keep the top-anchored hat in frame: travel is only a few percent of the hero.
        travel = Math.min(Math.max(extra, 0), el.clientHeight * 0.05);
        if (travel <= 0) {
          img.style.transform = "translate3d(0,0,0)";
          continue;
        }
        rect = el.getBoundingClientRect();
        traveled = Math.max(0, -rect.top);
        max = Math.max(el.clientHeight * 0.9, 1);
        p = traveled / max;
        if (p < 0) p = 0;
        if (p > 1) p = 1;
        img.style.transform = "translate3d(0," + (-travel * p).toFixed(2) + "px,0)";
      }
    }
    function onScroll() {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    update();
  })();
})();
