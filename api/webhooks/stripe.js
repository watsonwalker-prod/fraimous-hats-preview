// POST /api/webhooks/stripe
// Paid HAITMOUS Checkout sessions become an unconfirmed Printful draft (confirm: false).
// No emails are sent. Customer/owner mail is left for a later pass; this handler only logs.
//
// Env: STRIPE_WEBHOOK_SECRET, STRIPE_SECRET_KEY, PRINTFUL_TOKEN
// Events: checkout.session.completed, checkout.session.async_payment_succeeded

const crypto = require("crypto");
const { stripeGet } = require("../_lib/stripe-rest");
const catalog = require("../_lib/catalog");
const {
  recipientFromSession,
  itemsFromSession,
  buildDraftOrderPayload,
  createDraftOrderIdempotent,
  printfulToken,
} = require("../_lib/printful");

const TOLERANCE_SEC = 300;
const HANDLED = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
]);

function readRawBody(req) {
  if (Buffer.isBuffer(req.rawBody)) return Promise.resolve(req.rawBody);
  if (typeof req.rawBody === "string") return Promise.resolve(Buffer.from(req.rawBody));
  return new Promise((resolve, reject) => {
    const chunks = [];
    const timer = setTimeout(() => reject(new Error("body timeout")), 10000);
    req.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    req.on("end", () => { clearTimeout(timer); resolve(Buffer.concat(chunks)); });
    req.on("error", (e) => { clearTimeout(timer); reject(e); });
  });
}

function verifySignature(raw, header, secret, nowSec) {
  if (!header || typeof header !== "string") return { ok: false, why: "missing signature" };
  let t = null;
  const v1 = [];
  header.split(",").forEach((part) => {
    const i = part.indexOf("=");
    if (i < 0) return;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    if (k === "t") t = v;
    else if (k === "v1") v1.push(v);
  });
  if (!t || !/^\d+$/.test(t) || !v1.length) return { ok: false, why: "malformed signature" };
  const now = nowSec == null ? Math.floor(Date.now() / 1000) : nowSec;
  if (Math.abs(now - Number(t)) > TOLERANCE_SEC) return { ok: false, why: "timestamp outside tolerance" };
  const expected = crypto.createHmac("sha256", secret).update(t + ".").update(raw).digest();
  const match = v1.some((sig) => {
    if (!/^[0-9a-f]{64}$/i.test(sig)) return false;
    const got = Buffer.from(sig, "hex");
    return got.length === expected.length && crypto.timingSafeEqual(got, expected);
  });
  return match ? { ok: true } : { ok: false, why: "signature mismatch" };
}

function isHaitmousSession(session) {
  const md = (session && session.metadata) || {};
  if (md.source === "haitmous") return true;
  const n = String(md.order_number || (session && session.client_reference_id) || "");
  return /^HAT-\d{6}-[0-9A-Z]{5}$/.test(n);
}

function orderNumberOf(session) {
  const md = (session && session.metadata) || {};
  const n = String(md.order_number || (session && session.client_reference_id) || "").trim();
  return /^HAT-\d{6}-[0-9A-Z]{5}$/.test(n) ? n : "";
}

async function retrieveSession(key, id) {
  return stripeGet("checkout/sessions/" + encodeURIComponent(id), {
    key,
    expand: [
      "line_items",
      "line_items.data.price.product",
      "shipping_cost.shipping_rate",
      "collected_information.shipping_details",
    ],
  });
}

async function fulfillPaidSession(session, { fetchImpl } = {}) {
  if (!isHaitmousSession(session)) {
    return { ok: true, ignored: "not haitmous" };
  }
  if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
    return { ok: true, skipped: "not paid", payment_status: session.payment_status };
  }

  const orderNumber = orderNumberOf(session);
  if (!orderNumber) {
    console.warn("webhook: paid haitmous session missing HAT- order number", session && session.id);
    return { ok: false, reason: "no_order_number" };
  }

  const recipient = recipientFromSession(session);
  if (!recipient) {
    console.warn(`webhook: printful held ${orderNumber}: no_shipping`);
    return { ok: false, reason: "no_shipping", orderNumber };
  }

  const packed = itemsFromSession(session, catalog);
  if (!packed.ok) {
    console.warn(`webhook: printful held ${orderNumber}: ${packed.reason}`);
    return { ok: false, reason: packed.reason, orderNumber };
  }

  const payload = buildDraftOrderPayload({
    externalId: orderNumber,
    recipient,
    items: packed.items,
  });

  if (!printfulToken()) {
    console.warn(`webhook: PRINTFUL_TOKEN not set; draft not created for ${orderNumber}`);
    return { ok: false, reason: "printful_token_missing", orderNumber, payload };
  }

  const result = await createDraftOrderIdempotent(payload, { fetchImpl });
  if (result.skipped) {
    console.log(`webhook: printful draft already exists for ${orderNumber}`);
    return { ok: true, skipped: true, reason: "already_exists", orderNumber, payload, printful: result.order };
  }
  if (!result.ok) {
    console.error(`webhook: printful create failed for ${orderNumber}`, result.reason, result.response && result.response.status);
    return { ok: false, reason: result.reason, orderNumber, payload, printful: result };
  }
  console.log(`webhook: printful draft created for ${orderNumber} (confirm=false)`);
  return { ok: true, skipped: false, orderNumber, payload, printful: result.order };
}

async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false });

  const key = process.env.STRIPE_SECRET_KEY || "";
  const secret = (process.env.STRIPE_WEBHOOK_SECRET || "").trim();
  if (!secret) {
    console.error("webhook: STRIPE_WEBHOOK_SECRET not set; refusing");
    return res.status(500).json({ ok: false, error: "not configured" });
  }
  if (!key) {
    console.error("webhook: STRIPE_SECRET_KEY not set");
    return res.status(500).json({ ok: false, error: "not configured" });
  }

  let raw;
  try {
    raw = await readRawBody(req);
  } catch {
    return res.status(400).json({ ok: false, error: "body" });
  }

  const sig = req.headers && (req.headers["stripe-signature"] || req.headers["Stripe-Signature"]);
  const v = verifySignature(raw, Array.isArray(sig) ? sig[0] : sig, secret);
  if (!v.ok) {
    console.warn("webhook: rejected,", v.why);
    return res.status(400).json({ ok: false, error: "invalid signature" });
  }

  let event;
  try {
    event = JSON.parse(raw.toString("utf8"));
  } catch {
    return res.status(400).json({ ok: false, error: "bad json" });
  }
  if (!HANDLED.has(event.type)) {
    return res.status(200).json({ received: true, ignored: event.type });
  }

  const id = event.data && event.data.object && event.data.object.id;
  if (!id || !/^cs_/.test(id)) {
    return res.status(200).json({ received: true, ignored: "no session" });
  }

  const got = await retrieveSession(key, id);
  if (!got.ok) {
    console.error("webhook: session retrieve failed", got.status);
    return res.status(got.status === 404 ? 200 : 500).json({ received: true, error: "retrieve" });
  }
  const session = got.data;
  const result = await fulfillPaidSession(session);
  if (!result.ok && (result.reason === "create_failed" || result.reason === "lookup_failed" || result.reason === "printful_token_missing")) {
    // Stripe will retry. Do not email.
    return res.status(500).json({ received: true, ...result, payload: undefined, printful: undefined });
  }
  return res.status(200).json({
    received: true,
    order: result.orderNumber || null,
    printful: result.skipped ? "already_exists" : (result.ok ? "draft" : (result.reason || "held")),
    ignored: result.ignored || undefined,
  });
}

module.exports = handler;
module.exports.config = { api: { bodyParser: false } };
module.exports._test = {
  verifySignature,
  readRawBody,
  isHaitmousSession,
  fulfillPaidSession,
  orderNumberOf,
};
