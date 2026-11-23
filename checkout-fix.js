(function () {
  "use strict";
  var FLAT = { "many-are-saying": "/images/hats/many-are-saying-flat-60c8f6bb.webp", "dot-dot-dot": "/images/hats/dot-dot-dot-flat-33cb195d.webp", "raige-bait": "/images/hats/raige-bait-flat-803f8092.webp", sparkle: "/images/hats/sparkle-flat-a9d86aa4.webp", haiter: "/images/hats/haiter-flat-67ba87ff.webp", "youre-absolutely-right": "/images/hats/youre-absolutely-right-flat-5ea573a2.webp", "em-dash": "/images/hats/em-dash-flat-f45e8eb5.webp" };
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  function readCart() { try { var c = JSON.parse(localStorage.getItem("hatCart") || "[]"); return Array.isArray(c) ? c.filter(function (i) { return i && i.slug; }) : []; } catch (e) { return []; } }
  function writeCart(c) { try { localStorage.setItem("hatCart", JSON.stringify(c)); } catch (e) {} }
  function money(n) { return "$" + Number(n || 0).toFixed(2); }
  function cartTotal(cart) { return cart.reduce(function (s, i) { return s + parseFloat(i.price || "48.00") * (i.qty || 1); }, 0); }
  function cartCount(cart) { return cart.reduce(function (s, i) { return s + (i.qty || 1); }, 0); }
  function buyer() { try { return JSON.parse(localStorage.getItem("hatBuyer") || "null"); } catch (e) { return null; } }
  window.HatCart = { get: readCart };
  function addToCart(item) {
    var cart = readCart(), found = null;
    cart.forEach(function (i) { if (i.slug === item.slug) found = i; });
    if (found) found.qty = Math.min(10, (found.qty || 1) + 1);
    else cart.push({ slug: item.slug, title: item.title || "", color: item.color || "", price: item.price || "48.00", image: item.image || FLAT[item.slug] || "", qty: 1 });
    writeCart(cart);
  }
  function setQty(slug, qty) {
    writeCart(readCart().map(function (i) { if (i.slug === slug) i.qty = Math.max(0, Math.min(10, qty)); return i; }).filter(function (i) { return i.qty > 0; }));
  }
  function renderTicket(form) {
    var cart = readCart(), lines = form.querySelector("[data-cart-lines]");
    if (!lines) {
      lines = document.createElement("div");
      lines.setAttribute("data-cart-lines", "");
      lines.className = "pdp-cart-lines";
      var head = form.querySelector(".pdp-checkout-head");
      if (head && head.nextSibling) form.insertBefore(lines, head.nextSibling); else form.appendChild(lines);
      var more = document.createElement("a");
      more.className = "pdp-cart-more"; more.href = "/hats"; more.textContent = "Add another hat";
      var sb = form.querySelector('button[type="submit"]');
      if (sb) form.insertBefore(more, sb); else form.appendChild(more);
    }
    lines.innerHTML = "";
    cart.forEach(function (item) {
      var row = document.createElement("div"); row.className = "pdp-cart-line";
      var img = document.createElement("img"); img.className = "pdp-cart-thumb"; img.src = item.image || FLAT[item.slug] || ""; img.alt = ""; img.width = 56; img.height = 56;
      var mid = document.createElement("div"); mid.className = "pdp-cart-meta";
      var t = document.createElement("p"); t.className = "pdp-cart-title"; t.textContent = [item.title, item.color].filter(Boolean).join(" · ");
      var p = document.createElement("p"); p.className = "pdp-cart-price"; p.textContent = money(parseFloat(item.price || "48.00") * (item.qty || 1));
      mid.appendChild(t); mid.appendChild(p);
      var qty = document.createElement("div"); qty.className = "pdp-cart-qty";
      var dec = document.createElement("button"); dec.type = "button"; dec.textContent = "−"; dec.setAttribute("data-cart-dec", item.slug); dec.setAttribute("aria-label", "One fewer");
      var n = document.createElement("span"); n.textContent = String(item.qty || 1);
      var inc = document.createElement("button"); inc.type = "button"; inc.textContent = "+"; inc.setAttribute("data-cart-inc", item.slug); inc.setAttribute("aria-label", "One more");
      qty.appendChild(dec); qty.appendChild(n); qty.appendChild(inc);
      row.appendChild(img); row.appendChild(mid); row.appendChild(qty);
      lines.appendChild(row);
    });
    var itemEl = form.querySelector(".pdp-checkout-item"), priceEl = form.querySelector(".pdp-checkout-price"), submit = form.querySelector('button[type="submit"]');
    if (cart.length) {
      var count = cartCount(cart);
      if (itemEl) itemEl.textContent = count === 1 ? "1 hat" : count + " hats";
      if (priceEl) priceEl.textContent = money(cartTotal(cart));
      if (submit) submit.textContent = "Pay " + money(cartTotal(cart));
    }
    var b = buyer();
    if (b) {
      var ni = form.querySelector('input[name="name"]'), ei = form.querySelector('input[name="email"]');
      if (ni && !ni.value && b.name) ni.value = b.name;
      if (ei && !ei.value && b.email) ei.value = b.email;
    }
  }
  document.addEventListener("click", function (e) {
    var step = e.target && e.target.closest ? (e.target.closest("[data-cart-dec]") || e.target.closest("[data-cart-inc]")) : null;
    if (step) {
      var slug = step.getAttribute("data-cart-dec") || step.getAttribute("data-cart-inc"), cur = 1;
      readCart().forEach(function (i) { if (i.slug === slug) cur = i.qty || 1; });
      setQty(slug, cur + (step.hasAttribute("data-cart-inc") ? 1 : -1));
      var f = step.closest("[data-checkout-form]");
      if (f) renderTicket(f);
      return;
    }
    var cancel = e.target && e.target.closest ? e.target.closest("[data-checkout-cancel]") : null;
    if (cancel) {
      var root = cancel.closest("[data-pdp]") || document;
      var form = root.querySelector("[data-checkout-form]"), btn = root.querySelector("[data-atc]"), note = root.querySelector("[data-atc-note]");
      if (form) form.hidden = true;
      if (btn) btn.setAttribute("aria-expanded", "false");
      if (note) note.hidden = true;
      var pdp = cancel.closest("[data-pdp]");
      if (pdp) pdp.classList.remove("is-checking-out");
      return;
    }
    var atc = e.target && e.target.closest ? e.target.closest("[data-atc]") : null;
    if (atc) {
      var root2 = atc.closest("[data-pdp]") || document;
      var form2 = root2.querySelector("[data-checkout-form]");
      if (form2) {
        var slug2 = form2.getAttribute("data-slug") || (root2.getAttribute && root2.getAttribute("data-slug")) || "";
        var stage = root2.querySelector("[data-stage-a]"), hero = root2.querySelector(".pdp-hero img");
        if (slug2) addToCart({ slug: slug2, title: form2.getAttribute("data-title") || "", color: form2.getAttribute("data-color") || "", price: form2.getAttribute("data-price") || "48.00", image: (stage && stage.getAttribute("src")) || (hero && hero.getAttribute("src")) || FLAT[slug2] || "" });
      }
      window.setTimeout(function () {
        var form3 = root2.querySelector("[data-checkout-form]");
        if (form3 && !form3.hidden && root2.classList) root2.classList.add("is-checking-out");
        if (form3) renderTicket(form3);
      }, 0);
    }
  }, true);
  document.querySelectorAll("[data-checkout-form]").forEach(function (form) {
    if (window.MutationObserver) new MutationObserver(function () { if (!form.hidden) renderTicket(form); }).observe(form, { attributes: true, attributeFilter: ["hidden"] });
  });
  document.addEventListener("submit", function (e) {
    var form = e.target;
    if (!form || !form.hasAttribute || !form.hasAttribute("data-checkout-form")) return;
    e.preventDefault();
    e.stopPropagation();
    var root = form.closest("[data-pdp]") || document;
    var err = form.querySelector("[data-checkout-error]");
    var nameInput = form.querySelector('input[name="name"]'), emailInput = form.querySelector('input[name="email"]');
    var slug = (form.getAttribute("data-slug") || (root.getAttribute && root.getAttribute("data-slug")) || "").trim();
    var name = nameInput && nameInput.value ? nameInput.value.trim() : "";
    var email = emailInput && emailInput.value ? emailInput.value.trim() : "";
    if (!name || name.length < 2 || !email || !EMAIL_RE.test(email) || !slug) {
      if (err) { err.hidden = false; err.textContent = "Please enter your name and a valid email."; }
      return;
    }
    if (err) err.hidden = true;
    var cart = readCart();
    var payloadItems = cart.length ? cart.map(function (it) { return { slug: it.slug, qty: it.qty || 1 }; }) : [{ slug: slug, qty: 1 }];
    var displayItems = cart.length ? cart : [{ slug: slug, title: form.getAttribute("data-title") || "", color: form.getAttribute("data-color") || "", price: form.getAttribute("data-price") || "48.00", image: FLAT[slug] || "", qty: 1 }];
    try { localStorage.setItem("hatBuyer", JSON.stringify({ name: name, email: email })); } catch (e2) {}
    try { sessionStorage.setItem("hatTicket", JSON.stringify({ title: form.getAttribute("data-title") || "", color: form.getAttribute("data-color") || "", price: form.getAttribute("data-price") || "48.00" })); } catch (e2) {}
    var submit = form.querySelector('button[type="submit"]');
    if (submit) submit.disabled = true;
    fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name, email: email, items: payloadItems, promo: (window.haitmousPromo && window.haitmousPromo()) || "" }) })
      .then(function (r) { return r.json().then(function (data) { return { r: r, data: data }; }); })
      .then(function (out) {
        var data = out.data || {};
        if (!data.ok) {
          if (err) { err.hidden = false; err.textContent = data.error === "disabled" ? (data.message || "Checkout Opens Soon") : (data.message || "Checkout isn’t available right now."); }
          return;
        }
        if ((data.mode === "preview" || data.mode === "hosted") && data.url) { window.location.href = data.url; return; }
        if (data.mode === "elements" && data.clientSecret && data.publishableKey) {
          try { sessionStorage.setItem("hatCheckout", JSON.stringify({ clientSecret: data.clientSecret, publishableKey: data.publishableKey, orderNumber: data.orderNumber || "", items: displayItems, name: name, email: email })); } catch (e2) {}
          window.location.href = "/checkout";
          return;
        }
        if (err) { err.hidden = false; err.textContent = "Checkout isn’t available right now."; }
      })
      .catch(function () { if (err) { err.hidden = false; err.textContent = "Checkout isn’t available right now."; } })
      .then(function () { if (submit) submit.disabled = false; });
  }, true);
  if (document.querySelector("[data-thanks-status]")) { try { localStorage.removeItem("hatCart"); } catch (e) {} }
  var mount = document.querySelector("[data-pay-element]");
  if (!mount) return;
  var status = document.querySelector("[data-pay-status]"), err = document.querySelector("[data-pay-error]"), submit = document.querySelector("[data-pay-submit]");
  var stored = null;
  try { stored = JSON.parse(sessionStorage.getItem("hatCheckout") || "null"); } catch (e) { stored = null; }
  var ticket = null;
  try { ticket = JSON.parse(sessionStorage.getItem("hatTicket") || "null"); } catch (e) { ticket = null; }
  if (stored) {
    var lines = Array.isArray(stored.items) && stored.items.length ? stored.items : (ticket ? [{ slug: "", title: ticket.title || "", color: ticket.color || "", price: ticket.price || "48.00", image: "", qty: 1 }] : null);
    if (lines) {
      var summary = document.querySelector(".pay-summary"), list = document.createElement("div"), total = 0;
      list.className = "pay-items";
      lines.forEach(function (item) {
        total += parseFloat(item.price || "48.00") * (item.qty || 1);
        var row = document.createElement("div"); row.className = "pay-item";
        var src = item.image || FLAT[item.slug] || "";
        if (src) { var img = document.createElement("img"); img.className = "pay-item-img"; img.src = src; img.alt = [item.title, item.color].filter(Boolean).join(" "); img.width = 72; img.height = 72; row.appendChild(img); }
        var mid = document.createElement("div");
        var t = document.createElement("p"); t.className = "pay-summary-item"; t.textContent = [item.title, item.color].filter(Boolean).join(" · ") + ((item.qty || 1) > 1 ? " ×" + item.qty : "");
        var p = document.createElement("p"); p.className = "pay-summary-price"; p.textContent = money(parseFloat(item.price || "48.00") * (item.qty || 1));
        mid.appendChild(t); mid.appendChild(p); row.appendChild(mid); list.appendChild(row);
      });
      if (summary) {
        summary.innerHTML = "";
        summary.appendChild(list);
        var totalEl = document.createElement("p"); totalEl.className = "pay-summary-price pay-total"; totalEl.textContent = money(total);
        summary.appendChild(totalEl);
      }
      if (submit) submit.textContent = "Pay " + money(total);
    }
  }
  if (!stored || !stored.clientSecret || !stored.publishableKey) {
    if (status) status.textContent = "Your checkout session ended. Pick a hat to pay.";
    return;
  }
  if (status) status.textContent = "Preparing payment…";
  var appearance = { theme: "stripe", variables: { colorPrimary: "#1a100c", colorBackground: "#f6efe6", colorText: "#1a100c", colorDanger: "#8a5a2e", fontFamily: "Instrument Sans, Helvetica Neue, system-ui, sans-serif", borderRadius: "0px" } };
  document.querySelectorAll('script[src*="js.stripe.com"]').forEach(function (s) { s.remove(); });
  var script = document.createElement("script");
  script.src = "https://js.stripe.com/endive/stripe.js";
  function fail() {
    if (status) status.textContent = "Checkout isn’t available right now.";
    if (err) { err.hidden = false; err.textContent = "Checkout isn’t available right now."; }
  }
  script.onerror = fail;
  script.onload = function () {
    if (!window.Stripe) return fail();
    var stripe = window.Stripe(stored.publishableKey);
    var init = stripe.initCheckoutElementsSdk || stripe.initCheckout;
    if (typeof init !== "function") return fail();
    var started;
    try { started = init.call(stripe, { clientSecret: stored.clientSecret, elementsOptions: { appearance: appearance } }); } catch (e) { return fail(); }
    Promise.resolve(started).then(function (checkout) {
      if (!checkout) return fail();
      if (status) status.textContent = "Card and shipping stay on this page.";
      var shipMount = document.querySelector("[data-shipping-element]");
      if (shipMount && checkout.createShippingAddressElement) {
        shipMount.hidden = false;
        var buyerName = stored.name || (buyer() && buyer().name) || "", shipped = false;
        if (buyerName) { try { checkout.createShippingAddressElement({ defaultValues: { name: buyerName } }).mount(shipMount); shipped = true; } catch (e) { shipped = false; } }
        if (!shipped) checkout.createShippingAddressElement().mount(shipMount);
      }
      mount.hidden = false;
      if (submit) submit.hidden = false;
      checkout.createPaymentElement().mount(mount);
      if (submit) submit.addEventListener("click", function () {
        submit.disabled = true;
        var label = submit.textContent;
        submit.textContent = "Paying…";
        var run = checkout.loadActions ? checkout.loadActions().then(function (res) { return res.actions.confirm(); }) : checkout.confirm();
        Promise.resolve(run).then(function (result) {
          var error = result && result.error;
          if (error) {
            if (err) { err.hidden = false; err.textContent = error.message || "Payment didn’t go through."; }
            submit.disabled = false; submit.textContent = label;
          }
        }).catch(function () {
          if (err) { err.hidden = false; err.textContent = "Payment didn’t go through."; }
          submit.disabled = false; submit.textContent = label;
        });
      });
    }).catch(fail);
  };
  document.head.appendChild(script);
})();
