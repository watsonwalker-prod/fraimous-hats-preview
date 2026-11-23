/* HAITMOUS promo. Reads ?promo=CODE and saves it. A "Code CODE Applied"
   banner is shown only when the code actually changes the $48.00 total. */
(function () {
  var KEY = "haitmousPromo", DAYS = 30;
  // Cents off the visible $48.00 member price. Empty: no current code changes the total.
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
